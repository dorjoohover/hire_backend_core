/**
 * PDF хүссэн боловч тайлан бэлэн биш / алга болсон үед юу хийхийг шийднэ (DB-гүй, цэвэр).
 * `test/report-ensure.spec-lite.ts`.
 *
 * Зарчим: тайланг ГАРГАХ БОЛОМЖТОЙ бол заавал гаргана (дараалал хамаагүй — бүтэлгүйтсэн,
 * мөр нь үүсээгүй, гацсан, файл нь алга болсон бүх тохиолдолд шинээр оруулна). Гаргах
 * боломжгүй бол (тест дуусаагүй, засагдахгүй алдаа, автомат оролдлого дууссан) тодорхой
 * алдаа буцаана — web мөнхөд "уншиж байна" дээр эргэлдэхгүй.
 */
export const AUTO_REGEN_COOLDOWN_MS = Number(process.env.REPORT_AUTO_COOLDOWN_MS ?? 3 * 60 * 1000);
export const AUTO_REGEN_MAX_PER_DAY = Number(process.env.REPORT_AUTO_MAX ?? 3);
/** report_logs мөр энэ хугацаанаас удаан шинэчлэгдээгүй бол гацсан (ops OPS_STALE_MS-тэй ижил). */
export const REPORT_STALE_MS = 10 * 60 * 1000;
export const PERMANENT_MARK = '[permanent]';

const INFLIGHT = new Set(['PENDING', 'STARTED', 'CALCULATING', 'WRITING', 'UPLOADING']);
const DONE = new Set(['COMPLETED', 'SENT']);

export interface EnsureInput {
  log: { status?: string | null; error?: string | null; updatedAt?: Date | string | null } | null;
  /** Дууссан (эсвэл мөргүй) тайлангийн PDF файл үнэхээр байхгүй. */
  fileMissing: boolean;
  examExists: boolean;
  examFinished: boolean;
  /** Сүүлийн 24 цагийн автомат оролдлогын тоо ба сүүлийнх нь хэзээ. */
  autoAttempts: number;
  lastAutoAt: Date | string | null;
  now?: number;
}

export type EnsureDecision =
  | { action: 'wait'; message: string }
  | { action: 'generate'; reason: string; message: string }
  | { action: 'error'; status: number; message: string };

const WAIT_MSG = 'Тайлан уншиж байна, түр хүлээнэ үү.';

export function decideEnsure(i: EnsureInput): EnsureDecision {
  const now = i.now ?? Date.now();
  const status = String(i.log?.status ?? '');
  const updated = i.log?.updatedAt ? new Date(i.log.updatedAt).getTime() : 0;

  if (!i.examExists) return { action: 'error', status: 404, message: 'Тайлан олдсонгүй.' };

  if (status === 'FAILED' && String(i.log?.error ?? '').includes(PERMANENT_MARK)) {
    return {
      action: 'error',
      status: 500,
      message: 'Тайлан гаргах боломжгүй байна (өгөгдлийн алдаа). Админтай холбогдоно уу.',
    };
  }

  // Боловсруулагдаж байгаа, гацаагүй → хүлээнэ.
  if (INFLIGHT.has(status) && now - updated < REPORT_STALE_MS) {
    return { action: 'wait', message: WAIT_MSG };
  }
  // Дууссан, файл байгаа тохиолдолд энд ирэхгүй (controller шууд өгнө).
  if (DONE.has(status) && !i.fileMissing) return { action: 'wait', message: WAIT_MSG };

  // Саяхан автоматаар оруулсан (hire_report мөрөө үүсгэж амжаагүй байж болно) → хүлээнэ.
  const lastAuto = i.lastAutoAt ? new Date(i.lastAutoAt).getTime() : 0;
  if (lastAuto && now - lastAuto < AUTO_REGEN_COOLDOWN_MS) {
    return { action: 'wait', message: WAIT_MSG };
  }

  if (!i.examFinished) {
    return {
      action: 'error',
      status: 409,
      message: 'Тест дуусаагүй тул тайлан гараагүй байна.',
    };
  }
  if (i.autoAttempts >= AUTO_REGEN_MAX_PER_DAY) {
    return {
      action: 'error',
      status: 500,
      message: 'Тайлан гаргах боломжгүй байна. Админтай холбогдоно уу.',
    };
  }

  const reason = !i.log
    ? 'no-log'
    : status === 'FAILED'
      ? 'failed'
      : DONE.has(status)
        ? 'file-missing'
        : INFLIGHT.has(status)
          ? 'stale'
          : `status:${status || 'unknown'}`;
  return { action: 'generate', reason, message: WAIT_MSG };
}
