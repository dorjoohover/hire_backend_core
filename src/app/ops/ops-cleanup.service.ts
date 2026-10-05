import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { DataSource } from 'typeorm';
import { PaymentStatus, REPORT_STATUS } from 'src/base/constants';
import { OPS_CODE_RE, OPS_STALE_MS, OpsActor, OpsService } from './ops.service';
import { MediaService } from '../media/media.service';

/**
 * Ops цэвэрлэгээ — тестийн (эсвэл сонгосон code-ийн) шалгалтыг бүх ул мөртэй нь устгана:
 *   1) тайлангийн PDF — report VPS-ийн локал `uploads/` + Cloudflare R2/S3 (`reports/`)
 *      (hire_report `POST /internal/files/delete`)
 *   2) DB — exam (+examDetail, userAnswer), result (+resultDetail), report_logs,
 *      report_access, email_logs, report_snapshot; email/loadtest горимд хоосорсон userService.
 *
 * Аюулгүй байдал (prod-д ч ашиглана):
 *   - Эхлээд PREVIEW (юу устахыг тоолно) → 10 мин хүчинтэй `token` → APPLY нь яг тэр
 *     олонлогийг дахин тооцоолж token-той тулгана (хооронд өөрчлөгдвөл 409).
 *   - Боловсруулагдаж буй тайлан, одоо өгч буй шалгалт, төлбөртэй (QPay) тайлан/үйлчилгээг
 *     алгасна — `force` өгвөл л төлбөртэй / эхэлсэн шалгалтыг устгана (боловсруулагдаж буйг хэзээ ч).
 *   - Эхлээд файл, дараа нь DB: файл устгаж чадаагүй code-ийн DB мөр үлдэнэ (дахин оролдож болно).
 *   - Тоо хязгаар `OPS_CLEANUP_MAX` (default 1000), code-оор `OPS_CLEANUP_MAX_CODES` (100).
 *   - `OPS_CLEANUP=off` → бүхэлдээ хаалттай. Үйлдэл бүр `ops_action_log`-д (code тус бүрээр).
 */
export type CleanupSelector = {
  /** Тодорхой code-ууд (DB-д байхгүй бол зөвхөн файлыг нь устгана). */
  codes?: string[];
  /** Тестийн акаунт: түүний `since`-ээс хойш авсан үйлчилгээний шалгалтууд + өөрөө өгсөн шалгалтууд (k6). */
  email?: string;
  /** production/loadtest marker (`userService.qpayInvoiceId LIKE 'loadtest\_%'`). */
  loadtest?: boolean;
  /** Studio / admin-ийн "урьдчилан харах" шалгалт (`exam.isPreview = true`). */
  preview?: boolean;
  since?: string;
  until?: string;
  /** Төлбөртэй (QPay) тайлан / үйлчилгээ, одоо өгч буй шалгалтыг ч устгана. */
  force?: boolean;
};

export type CleanupMode = 'codes' | 'email' | 'loadtest' | 'preview';
type Skip = { code: string; reason: 'in-progress-report' | 'exam-in-progress' | 'paid-report' | 'paid-service' };

export type CleanupPlan = {
  mode: CleanupMode;
  selector: Record<string, any>;
  codes: string[]; // DB + файл устгана
  orphanCodes: string[]; // DB-д байхгүй — зөвхөн файл (codes горим)
  services: number[]; // хоосорвол устгах userService
  loadtestUsers: boolean;
  skipped: Skip[];
  counts: Record<string, number>;
  max: number;
  overLimit: boolean;
};

const IN_FLIGHT: string[] = [
  REPORT_STATUS.PENDING,
  REPORT_STATUS.STARTED,
  REPORT_STATUS.WRITING,
  REPORT_STATUS.CALCULATING,
  REPORT_STATUS.UPLOADING,
];
const EXAM_ACTIVE_MS = 3 * 60 * 60 * 1000; // одоо өгч буй гэж үзэх хугацаа
const TOKEN_TTL_MS = 10 * 60 * 1000;
const FILE_BATCH = 500; // hire_report DELETE_MAX_CODES
const LOADTEST_LIKE = 'loadtest\\_%';
const PROCESS_SECRET = randomBytes(32).toString('hex');

const envInt = (name: string, def: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
};

@Injectable()
export class OpsCleanupService {
  constructor(
    private readonly ds: DataSource,
    private readonly ops: OpsService,
    // Шалгуулагчийн / хариултын бичлэг (R2, media_object.examCode) — шалгалттай хамт устгана.
    @Optional() private readonly media?: MediaService,
  ) {}

  private assertEnabled() {
    if (/^(0|off|false|no)$/i.test(process.env.OPS_CLEANUP ?? '')) {
      throw new ForbiddenException('Ops цэвэрлэгээ унтраалттай (OPS_CLEANUP=off)');
    }
  }

  private parseDate(v: string | undefined, name: string): Date | null {
    if (v == null || v === '') return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new BadRequestException(`${name} огноо буруу: ${v}`);
    return d;
  }

  /** Сонголтыг шалгаж, нэг горим руу хөрвүүлнэ. */
  normalize(sel: CleanupSelector) {
    const s = sel ?? {};
    const modes: CleanupMode[] = [];
    if (Array.isArray(s.codes) && s.codes.length) modes.push('codes');
    if (s.email) modes.push('email');
    if (s.loadtest) modes.push('loadtest');
    if (s.preview) modes.push('preview');
    if (modes.length !== 1) {
      throw new BadRequestException('codes / email / loadtest / preview-ээс ЯГ НЭГИЙГ өгнө үү');
    }
    const mode = modes[0];
    const since = this.parseDate(s.since, 'since');
    const until = this.parseDate(s.until, 'until');
    if (since && until && since >= until) throw new BadRequestException('since < until байх ёстой');
    if ((mode === 'email' || mode === 'preview') && !since) {
      // Тестийн акаунтын ӨМНӨХ (жинхэнэ) түүхийг санамсаргүй устгахаас хамгаалах гол параметр.
      throw new BadRequestException('since (тест эхлэхээс өмнөх цаг) заавал');
    }
    let codes: string[] = [];
    if (mode === 'codes') {
      codes = [...new Set(s.codes!.map((c) => String(c ?? '').trim()).filter(Boolean))];
      const bad = codes.filter((c) => !OPS_CODE_RE.test(c));
      if (bad.length) throw new BadRequestException(`Буруу code: ${bad.slice(0, 5).join(', ')}`);
      const maxCodes = envInt('OPS_CLEANUP_MAX_CODES', 100);
      if (codes.length > maxCodes) {
        throw new BadRequestException(`Нэг удаад ${maxCodes}-аас ихгүй code`);
      }
    }
    const email = mode === 'email' ? String(s.email).trim().toLowerCase() : undefined;
    if (mode === 'email' && !/^[^@\s]+@[^@\s]+$/.test(email!)) {
      throw new BadRequestException('email буруу');
    }
    return {
      mode,
      codes,
      email,
      since,
      until,
      force: !!s.force,
      selector: {
        mode,
        ...(mode === 'codes' ? { codes } : {}),
        ...(email ? { email } : {}),
        ...(since ? { since: since.toISOString() } : {}),
        ...(until ? { until: until.toISOString() } : {}),
        ...(s.force ? { force: true } : {}),
      },
    };
  }

  private async tableExists(name: string): Promise<boolean> {
    const r = await this.ds.query('SELECT to_regclass($1) AS t', [`public.${name}`]);
    return !!r[0]?.t;
  }

  private async count(sql: string, params: any[]): Promise<number> {
    const r = await this.ds.query(sql, params);
    return Number(r[0]?.n ?? 0);
  }

  /** Юу устахыг тооцоолно (DB-д юу ч өөрчлөхгүй). */
  async plan(sel: CleanupSelector): Promise<CleanupPlan> {
    this.assertEnabled();
    const n = this.normalize(sel);
    const sinceP = n.since ?? new Date(0);
    const untilP = n.until ?? new Date('9999-01-01');

    // 1) Зорилтот exam-ууд ба (email/loadtest) үйлчилгээнүүд
    let services: { id: number; paid: boolean }[] = [];
    let exams: any[] = [];
    const examCols = `e.id, e.code, e."serviceId" AS "serviceId", e."userStartDate" AS "userStartDate",
                      e."userEndDate" AS "userEndDate"`;
    const svcPaid = `(s."qpayInvoiceId" IS NOT NULL AND s."qpayInvoiceId" NOT LIKE '${LOADTEST_LIKE}'
                      AND s.status = ${PaymentStatus.SUCCESS})`;
    if (n.mode === 'codes') {
      exams = await this.ds.query(`SELECT ${examCols} FROM exam e WHERE e.code = ANY($1::varchar[])`, [n.codes]);
    } else if (n.mode === 'email') {
      services = await this.ds.query(
        `SELECT s.id, ${svcPaid} AS paid FROM "userService" s
         JOIN users u ON u.id = s."userId"
         WHERE lower(u.email) = $1 AND s."createdAt" >= $2 AND s."createdAt" < $3`,
        [n.email, sinceP, untilP],
      );
      exams = await this.ds.query(
        `SELECT ${examCols} FROM exam e
         WHERE e."serviceId" = ANY($1::int[])
            OR (e."userId" IN (SELECT id FROM users WHERE lower(email) = $2)
                AND e."createdAt" >= $3 AND e."createdAt" < $4)`,
        [services.map((s) => s.id), n.email, sinceP, untilP],
      );
    } else if (n.mode === 'loadtest') {
      services = await this.ds.query(
        `SELECT s.id, false AS paid FROM "userService" s
         WHERE s."qpayInvoiceId" LIKE '${LOADTEST_LIKE}' AND s."createdAt" >= $1 AND s."createdAt" < $2`,
        [sinceP, untilP],
      );
      exams = await this.ds.query(`SELECT ${examCols} FROM exam e WHERE e."serviceId" = ANY($1::int[])`, [
        services.map((s) => s.id),
      ]);
    } else {
      exams = await this.ds.query(
        `SELECT ${examCols} FROM exam e WHERE e."isPreview" = true AND e."createdAt" >= $1 AND e."createdAt" < $2`,
        [sinceP, untilP],
      );
    }
    const allCodes: string[] = [...new Set<string>(exams.map((e) => e.code).filter(Boolean))];
    const orphanCodes = n.mode === 'codes' ? n.codes.filter((c) => !allCodes.includes(c)) : [];

    // 2) Алгасах шалтгаанууд
    const skipped = new Map<string, Skip['reason']>();
    if (allCodes.length) {
      const logs = await this.ds.query(
        `SELECT DISTINCT ON (code) code, status, "updatedAt" FROM report_logs
         WHERE code = ANY($1::varchar[]) ORDER BY code, "updatedAt" DESC`,
        [allCodes],
      );
      for (const l of logs) {
        const fresh = Date.now() - new Date(l.updatedAt).getTime() < OPS_STALE_MS;
        if (IN_FLIGHT.includes(l.status) && fresh) skipped.set(l.code, 'in-progress-report');
      }
      if (!n.force) {
        for (const e of exams) {
          const started = e.userStartDate && !e.userEndDate;
          if (started && Date.now() - new Date(e.userStartDate).getTime() < EXAM_ACTIVE_MS && !skipped.has(e.code)) {
            skipped.set(e.code, 'exam-in-progress');
          }
        }
        const paid = await this.ds.query(
          `SELECT DISTINCT code FROM report_access WHERE code = ANY($1::varchar[]) AND status = $2`,
          [allCodes, PaymentStatus.SUCCESS],
        );
        for (const p of paid) if (!skipped.has(p.code)) skipped.set(p.code, 'paid-report');
        // Бүх горимд: exam-ийн үйлчилгээ QPay-аар төлөгдсөн бол (жинхэнэ үйлчлүүлэгч) алгасна.
        const examSvc = [...new Set(exams.map((e) => Number(e.serviceId)).filter((x) => x > 0))];
        const paidRows = examSvc.length
          ? await this.ds.query(`SELECT s.id FROM "userService" s WHERE s.id = ANY($1::int[]) AND ${svcPaid}`, [examSvc])
          : [];
        const paidSvc = new Set<number>(paidRows.map((r: any) => Number(r.id)));
        for (const e of exams) {
          if (paidSvc.has(Number(e.serviceId)) && !skipped.has(e.code)) skipped.set(e.code, 'paid-service');
        }
      }
    }
    const codes = allCodes.filter((c) => !skipped.has(c)).sort();
    const keepSvc = new Set(
      exams.filter((e) => skipped.has(e.code)).map((e) => Number(e.serviceId)),
    );
    const svcIds = services
      .map((s) => Number(s.id))
      .filter((id) => !keepSvc.has(id) && (n.force || !services.find((s) => Number(s.id) === id)?.paid))
      .sort((a, b) => a - b);

    // 3) Тоо
    const hasSnap = await this.tableExists('report_snapshot');
    const counts: Record<string, number> = {
      exams: codes.length,
      orphanFiles: orphanCodes.length,
      skipped: skipped.size,
    };
    if (codes.length) {
      const q = (sql: string) => this.count(sql, [codes]);
      Object.assign(counts, {
        results: await q(`SELECT count(*)::int AS n FROM result WHERE code = ANY($1::varchar[])`),
        userAnswers: await q(
          `SELECT count(*)::int AS n FROM "userAnswer" ua JOIN exam e ON e.id = ua."examId" WHERE e.code = ANY($1::varchar[])`,
        ),
        reportLogs: await q(`SELECT count(*)::int AS n FROM report_logs WHERE code = ANY($1::varchar[])`),
        reportAccess: await q(`SELECT count(*)::int AS n FROM report_access WHERE code = ANY($1::varchar[])`),
        emailLogs: await q(`SELECT count(*)::int AS n FROM email_logs WHERE code = ANY($1::varchar[])`),
        snapshots: hasSnap
          ? await q(`SELECT count(*)::int AS n FROM report_snapshot WHERE code = ANY($1::varchar[])`)
          : 0,
        media: (await this.media?.countByExamCodes(codes)) ?? 0,
      });
    }
    counts.services = svcIds.length;
    if (svcIds.length) {
      counts.transactions = await this.count(
        `SELECT count(*)::int AS n FROM transaction WHERE "serviceId" = ANY($1::int[])`,
        [svcIds],
      );
    }
    const max = envInt('OPS_CLEANUP_MAX', 1000);
    return {
      mode: n.mode,
      selector: n.selector,
      codes,
      orphanCodes,
      services: svcIds,
      loadtestUsers: n.mode === 'loadtest',
      skipped: [...skipped].map(([code, reason]) => ({ code, reason })).sort((a, b) => a.code.localeCompare(b.code)),
      counts,
      max,
      overLimit: codes.length + orphanCodes.length > max,
    };
  }

  // ---- token: preview → apply хооронд олонлог өөрчлөгдөөгүйг баталгаажуулна ----
  private secret() {
    return process.env.OPS_CLEANUP_SECRET || process.env.JWT_SECRET || process.env.INTERNAL_API_KEY || PROCESS_SECRET;
  }
  private sign(plan: CleanupPlan, exp: number) {
    const body = JSON.stringify([plan.selector, plan.codes, plan.orphanCodes, plan.services, exp]);
    return createHmac('sha256', this.secret()).update(`ops-cleanup-v1|${body}`).digest('hex');
  }
  tokenFor(plan: CleanupPlan, now = Date.now()) {
    const exp = now + TOKEN_TTL_MS;
    return `${exp}.${this.sign(plan, exp)}`;
  }
  verifyToken(plan: CleanupPlan, token: string | undefined) {
    const [expS, mac] = String(token ?? '').split('.');
    const exp = Number(expS);
    if (!exp || !mac) throw new BadRequestException('token шаардлагатай — эхлээд preview хийнэ үү');
    if (Date.now() > exp) throw new ConflictException('Preview-ийн хугацаа (10 мин) дууссан — дахин preview хийнэ үү');
    const a = Buffer.from(this.sign(plan, exp), 'hex');
    const b = Buffer.from(mac, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ConflictException('Preview-ээс хойш устгах олонлог өөрчлөгдсөн — дахин preview хийнэ үү');
    }
  }

  async preview(actor: OpsActor, sel: CleanupSelector) {
    const plan = await this.plan(sel);
    return {
      ...plan,
      codes: plan.codes.slice(0, 300),
      orphanCodes: plan.orphanCodes.slice(0, 300),
      services: plan.services.slice(0, 300),
      total: plan.codes.length + plan.orphanCodes.length,
      token: plan.overLimit || plan.codes.length + plan.orphanCodes.length === 0 ? null : this.tokenFor(plan),
      expiresInSec: TOKEN_TTL_MS / 1000,
    };
  }

  /** hire_report: локал + R2-ийн PDF устгана. code → алдаа (байвал). */
  private async deleteFiles(codes: string[]) {
    const out = new Map<string, { local: string; remote: string; error?: string }>();
    if (!codes.length) return { results: out, remote: null as any };
    const key = process.env.INTERNAL_API_KEY;
    if (!key) throw new ServiceUnavailableException('INTERNAL_API_KEY тохируулаагүй — файл устгах боломжгүй');
    const base = process.env.REPORT;
    if (!base) throw new ServiceUnavailableException('REPORT env тохируулаагүй');
    const url = `${base.endsWith('/') ? base : `${base}/`}internal/files/delete`;
    let remote: any = null;
    for (let i = 0; i < codes.length; i += FILE_BATCH) {
      const batch = codes.slice(i, i + FILE_BATCH);
      try {
        const res = await axios.post(url, { codes: batch }, {
          headers: { 'x-internal-key': key },
          timeout: 120_000,
        });
        remote = res.data?.remote ?? remote;
        for (const r of res.data?.results ?? []) out.set(String(r.code), r);
      } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message ?? err?.message;
        throw new BadGatewayException(
          `hire_report файл устгаж чадсангүй (${status ?? 'холбогдсонгүй'}): ${msg}` +
            (i ? ` — эхний ${i} code-ийн файл устсан, DB хөндөгдөөгүй; дахин ажиллуулна уу` : ''),
        );
      }
    }
    return { results: out, remote };
  }

  async apply(actor: OpsActor, sel: CleanupSelector & { token?: string }) {
    const plan = await this.plan(sel);
    if (plan.overLimit) {
      throw new BadRequestException(`Хэт олон (${plan.codes.length + plan.orphanCodes.length} > ${plan.max}) — since/until-ээр нарийсга`);
    }
    if (!plan.codes.length && !plan.orphanCodes.length) {
      return { mode: plan.mode, codes: 0, orphanFiles: 0, deleted: {}, failed: [], skipped: plan.skipped };
    }
    // Тохиргоо дутуу бол token шалгахаас өмнө тодорхой алдаа (файл устгах боломжгүй).
    if (!process.env.INTERNAL_API_KEY) {
      throw new ServiceUnavailableException('INTERNAL_API_KEY тохируулаагүй — файл устгах боломжгүй');
    }
    if (!process.env.REPORT) throw new ServiceUnavailableException('REPORT env тохируулаагүй');
    this.verifyToken(plan, sel?.token);
    await this.ops.throttle(actor);

    // 1) Файл (эхлээд) — амжилтгүй code-ийн DB мөр үлдэнэ.
    let files;
    try {
      files = await this.deleteFiles([...plan.codes, ...plan.orphanCodes]);
    } catch (e: any) {
      await this.ops.audit(actor, 'cleanup.apply', null, 'failed', { ...plan.selector, error: e?.message });
      throw e;
    }
    const failed: { code: string; error: string }[] = [];
    for (const c of [...plan.codes, ...plan.orphanCodes]) {
      const r = files.results.get(c);
      if (!r) failed.push({ code: c, error: 'hire_report хариунд байхгүй' });
      else if (r.local === 'error' || r.remote === 'error') failed.push({ code: c, error: r.error ?? 'error' });
    }
    // Бичлэгүүд (R2) — устгаж чадаагүй code-ийн DB мөр үлдэнэ.
    let mediaDeleted = 0;
    if (this.media) {
      const okSoFar = plan.codes.filter((c) => !failed.some((f) => f.code === c));
      const m = await this.media.deleteByExamCodes(okSoFar);
      mediaDeleted = m.deleted;
      for (const [code, error] of m.failed) failed.push({ code, error });
    }
    const failedSet = new Set(failed.map((f) => f.code));
    const codes = plan.codes.filter((c) => !failedSet.has(c));

    // 2) DB — нэг transaction.
    const deleted: Record<string, number> = mediaDeleted ? { media: mediaDeleted } : {};
    const hasSnap = await this.tableExists('report_snapshot');
    await this.ds.transaction(async (m) => {
      const del = async (key: string, sql: string, params: any[]) => {
        const r = await m.query(sql, params);
        // pg DELETE → [rows, count]
        deleted[key] = (deleted[key] ?? 0) + Number(Array.isArray(r) ? r[1] ?? 0 : 0);
      };
      if (codes.length) {
        const ids: number[] = (
          await m.query(`SELECT id FROM exam WHERE code = ANY($1::varchar[])`, [codes])
        ).map((r: any) => Number(r.id));
        await del('reportAccess', `DELETE FROM report_access WHERE code = ANY($1::varchar[])`, [codes]);
        await del('reportLogs', `DELETE FROM report_logs WHERE code = ANY($1::varchar[])`, [codes]);
        await del('emailLogs', `DELETE FROM email_logs WHERE code = ANY($1::varchar[])`, [codes]);
        if (hasSnap) await del('snapshots', `DELETE FROM report_snapshot WHERE code = ANY($1::varchar[])`, [codes]);
        // CASCADE-д найдахгүйгээр хүүхэд мөрийг эхэлж (prod схем entity-ээс зөрж болно).
        await del(
          'resultDetails',
          `DELETE FROM "resultDetail" WHERE "resultId" IN (SELECT id FROM result WHERE code = ANY($1::varchar[]))`,
          [codes],
        );
        await del('results', `DELETE FROM result WHERE code = ANY($1::varchar[])`, [codes]);
        await del('userAnswers', `DELETE FROM "userAnswer" WHERE "examId" = ANY($1::int[])`, [ids]);
        await del('examDetails', `DELETE FROM "examDetail" WHERE "examId" = ANY($1::int[])`, [ids]);
        await del('exams', `DELETE FROM exam WHERE id = ANY($1::int[])`, [ids]);
      }
      if (plan.services.length) {
        await del(
          'transactions',
          `DELETE FROM transaction t WHERE t."serviceId" = ANY($1::int[])
             AND NOT EXISTS (SELECT 1 FROM exam e WHERE e."serviceId" = t."serviceId")`,
          [plan.services],
        );
        await del(
          'services',
          `DELETE FROM "userService" s WHERE s.id = ANY($1::int[])
             AND NOT EXISTS (SELECT 1 FROM exam e WHERE e."serviceId" = s.id)`,
          [plan.services],
        );
      }
      if (plan.loadtestUsers) {
        // loadtest/cleanup.sql-тэй ижил: k6-ийн loadtest_%@example.invalid client-ууд, өөр мөрд холбоогүй бол.
        const ltUsers = `SELECT id FROM users WHERE email LIKE '${LOADTEST_LIKE}@example.invalid' AND role = 20`;
        await del('emailLogs', `DELETE FROM email_logs WHERE "userId" IN (${ltUsers})`, []);
        await del(
          'users',
          `DELETE FROM users u
            WHERE u.id IN (${ltUsers})
              AND NOT EXISTS (SELECT 1 FROM exam e WHERE e."userId" = u.id)
              AND NOT EXISTS (SELECT 1 FROM "userService" s WHERE s."userId" = u.id)
              AND NOT EXISTS (SELECT 1 FROM assessment a WHERE a."ownerId" = u.id)
              AND NOT EXISTS (SELECT 1 FROM blog b WHERE b."userId" = u.id)
              AND NOT EXISTS (SELECT 1 FROM feedback f WHERE f."userId" = u.id)
              AND NOT EXISTS (SELECT 1 FROM payment p WHERE p."userId" = u.id OR p."chargerId" = u.id)`,
          [],
        );
      }
    });

    // 3) Аудит — нэгдсэн мөр + code тус бүр ("энэ code-ийг хэн устгасан бэ?").
    const summary = {
      ...plan.selector,
      codes: codes.length,
      orphanFiles: plan.orphanCodes.filter((c) => !failedSet.has(c)).length,
      failed: failed.length,
      skipped: plan.skipped.length,
      remote: files.remote ?? null,
      deleted,
    };
    await this.ops.audit(actor, 'cleanup.apply', null, failed.length ? 'failed' : 'ok', summary);
    await this.auditCodes(actor, [...codes, ...plan.orphanCodes.filter((c) => !failedSet.has(c))], plan.mode, files.results);
    return {
      mode: plan.mode,
      codes: codes.length,
      orphanFiles: summary.orphanFiles,
      deleted,
      failed,
      skipped: plan.skipped,
      remote: files.remote ?? null,
    };
  }

  private async auditCodes(actor: OpsActor, codes: string[], mode: string, files: Map<string, any>) {
    for (let i = 0; i < codes.length; i += 200) {
      const chunk = codes.slice(i, i + 200);
      const vals: any[] = [];
      const rows = chunk.map((c, j) => {
        const f = files.get(c);
        vals.push(actor?.id ?? null, actor?.email ?? null, c, JSON.stringify({ mode, local: f?.local, remote: f?.remote }), actor?.ip ?? null);
        const b = j * 5;
        return `($${b + 1}, $${b + 2}, 'cleanup.delete', $${b + 3}, 'ok', $${b + 4}, $${b + 5})`;
      });
      try {
        await this.ds.query(
          `INSERT INTO ops_action_log ("actorId", "actorEmail", action, code, status, detail, ip) VALUES ${rows.join(',')}`,
          vals,
        );
      } catch (e: any) {
        console.error('⚠️ ops_action_log (cleanup.delete) бичихэд алдаа:', e?.message);
      }
    }
  }
}
