/**
 * SAFE_MODE — prod-ийн (anonymize хийсэн) датаг local / rehearsal орчинд
 * ачаалж туршихад бодит хэрэглэгч, төлбөр, татвар руу юу ч гарахгүй болгох
 * унтраалга.
 *
 * SAFE_MODE=1 үед:
 *   - Resend          → и-мэйл илгээхгүй, зөвхөн лог (линкүүдийг харуулна)
 *   - QPay            → mock invoice, `checkPayment` нь автоматаар төлөгдсөн
 *   - e-barimt (ТӨБ)  → дуудлага хийхгүй, mock баримт
 *   - S3 (aws-sdk)    → upload / list / copy / delete хийхгүй (local `uploads/` л)
 *   - эхлэхдээ DATABASE_URL / REDIS_HOST / REPORT (hire_report: CORE)-ийн host нь
 *     local биш бол process ЗОГСДОГ (`enforceSafeModeOrExit`).
 *
 * ⚠️ Prod `.env`-д SAFE_MODE ТАВИХГҮЙ — тавибал Resend / QPay / e-barimt prod-д
 * унтарна. Тийм учраас `isSafeMode()` зөвхөн `1|true|yes|on`-ийг хүлээн авна.
 */

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

/** Оршин буй хэсэг бүрд орчны хувьсагчийг ДАХИН уншина (тестэд хэрэгтэй). */
export function isSafeMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return TRUTHY.has(`${env.SAFE_MODE ?? ''}`.trim().toLowerCase());
}

/** SAFE_MODE-д гадагш дуудлага хийхгүй байх үед хэвлэх ганц хэлбэр. */
export function safeLog(what: string, detail?: string) {
  console.log(`🛡️  [SAFE_MODE] ${what}${detail ? ` — ${detail}` : ''}`);
}

const DEFAULT_LOCAL_HOSTS = [
  'localhost',
  '127.0.0.1',
  '::1',
  'host.docker.internal',
];

function allowedHosts(env: NodeJS.ProcessEnv): Set<string> {
  const extra = `${env.SAFE_MODE_ALLOWED_HOSTS ?? ''}`
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_LOCAL_HOSTS, ...extra]);
}

const stripBrackets = (h: string) => h.replace(/^\[|\]$/g, '').toLowerCase();

/**
 * URL-ийн host-ыг (нууц үггүй) буцаана. `postgres:///db?host=/var/run/postgresql`
 * шиг unix socket хэлбэр → 'localhost' гэж үзнэ. Задлагдахгүй бол null.
 */
export function hostOfUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const viaQuery = u.searchParams.get('host');
    if (viaQuery)
      return viaQuery.startsWith('/') ? 'localhost' : stripBrackets(viaQuery);
    return u.hostname ? stripBrackets(u.hostname) : 'localhost';
  } catch {
    return null;
  }
}

export interface SafeModeTarget {
  name: string;
  host: string | null;
}

/** SAFE_MODE-д шалгах бүх гадагш заагч (нууц утга ХЭЗЭЭ Ч буцаахгүй, зөвхөн host). */
export function safeModeTargets(
  env: NodeJS.ProcessEnv = process.env,
): SafeModeTarget[] {
  const out: SafeModeTarget[] = [];
  if (env.DATABASE_URL) {
    out.push({ name: 'DATABASE_URL', host: hostOfUrl(env.DATABASE_URL) });
  }
  if (env.REDIS_HOST) {
    out.push({
      name: 'REDIS_HOST',
      host: stripBrackets(env.REDIS_HOST.trim()),
    });
  }
  // core → hire_report (REPORT), hire_report → core (CORE)
  for (const key of ['REPORT', 'CORE']) {
    if (env[key]) out.push({ name: key, host: hostOfUrl(env[key]!) });
  }
  return out;
}

/**
 * SAFE_MODE=1 бөгөөд DB / Redis / peer service нь local биш host руу заасан бол
 * Error шиднэ. SAFE_MODE биш бол юу ч хийхгүй.
 */
export function assertSafeModeTargets(env: NodeJS.ProcessEnv = process.env) {
  if (!isSafeMode(env)) return;
  const ok = allowedHosts(env);
  const bad = safeModeTargets(env).filter(
    (t) => t.host === null || !ok.has(t.host),
  );
  if (bad.length) {
    throw new Error(
      'SAFE_MODE=1 боловч дараах хувьсагч local биш (эсвэл задлагдахгүй) host руу заасан тул ЗОГСОВ: ' +
        bad
          .map((t) => `${t.name} → ${t.host ?? '<задлагдсангүй>'}`)
          .join(', ') +
        `. Зөвшөөрөгдсөн: ${[...ok].join(', ')} (нэмэх бол SAFE_MODE_ALLOWED_HOSTS=host1,host2).`,
    );
  }
}

/** Эхлэхдээ (main.ts / worker.ts) дуудна: буруу бол ЛОГ + process.exit(1). */
export function enforceSafeModeOrExit(
  env: NodeJS.ProcessEnv = process.env,
  exit: (code: number) => never = process.exit as any,
) {
  if (!isSafeMode(env)) return;
  try {
    assertSafeModeTargets(env);
  } catch (e: any) {
    console.error(`❌ ${e.message}`);
    exit(1);
    return;
  }
  console.log(
    '🛡️  SAFE_MODE=1 идэвхтэй — Resend / QPay / e-barimt / S3 гадагш хүсэлт ГАРАХГҮЙ. ' +
      `Host-ууд: ${
        safeModeTargets(env)
          .map((t) => `${t.name}=${t.host}`)
          .join(', ') || '(тохируулаагүй)'
      }`,
  );
}
