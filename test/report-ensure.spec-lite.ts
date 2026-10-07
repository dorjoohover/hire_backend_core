/**
 * PDF хүссэн боловч тайлан бэлэн биш үед: гаргах боломжтой бол гаргах, үгүй бол алдаа (DB-гүй).
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/report-ensure.spec-lite.ts
 */
import {
  AUTO_REGEN_COOLDOWN_MS,
  AUTO_REGEN_MAX_PER_DAY,
  REPORT_STALE_MS,
  decideEnsure,
} from '../src/app/report/report-ensure';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`);
};

const NOW = new Date('2026-10-07T10:00:00Z').getTime();
const ago = (ms: number) => new Date(NOW - ms);
const base = { log: null as any, fileMissing: true, examExists: true, examFinished: true, autoAttempts: 0, lastAutoAt: null as any, now: NOW };
const act = (o: any) => {
  const d: any = decideEnsure({ ...base, ...o });
  return d.action === 'error' ? `error:${d.status}` : d.action === 'generate' ? `generate:${d.reason}` : d.action;
};

check('E1 FAILED (түр алдаа) → шинээр гаргана', act({ log: { status: 'FAILED', error: 'timeout', updatedAt: ago(60_000) } }), 'generate:failed');
check('E2 мөр байхгүй + файл алга + тест дууссан → гаргана', act({}), 'generate:no-log');
check('E3 COMPLETED боловч файл алга → дахин гаргана', act({ log: { status: 'COMPLETED', updatedAt: ago(3600_000) } }), 'generate:file-missing');
check('E4 WRITING, гацаагүй → хүлээнэ', act({ log: { status: 'WRITING', updatedAt: ago(30_000) } }), 'wait');
check('E5 STARTED 10+ мин гацсан → дахин гаргана', act({ log: { status: 'STARTED', updatedAt: ago(REPORT_STALE_MS + 1000) } }), 'generate:stale');
check('E6 [permanent] алдаа → 500', act({ log: { status: 'FAILED', error: 'calc [permanent] no result', updatedAt: ago(1000) } }), 'error:500');
check('E7 тест дуусаагүй → 409', act({ examFinished: false }), 'error:409');
check('E8 тест дуусаагүй ч тайлан боловсруулагдаж байна → хүлээнэ', act({ examFinished: false, log: { status: 'PENDING', updatedAt: ago(1000) } }), 'wait');
check('E9 саяхан (cooldown дотор) автоматаар оруулсан → давтахгүй, хүлээнэ', act({ log: { status: 'FAILED', updatedAt: ago(1000) }, autoAttempts: 1, lastAutoAt: ago(AUTO_REGEN_COOLDOWN_MS - 1000) }), 'wait');
check('E10 cooldown өнгөрсөн → дахин оролдоно', act({ log: { status: 'FAILED', updatedAt: ago(1000) }, autoAttempts: 1, lastAutoAt: ago(AUTO_REGEN_COOLDOWN_MS + 1000) }), 'generate:failed');
check(`E11 24 цагт ${AUTO_REGEN_MAX_PER_DAY} оролдлого дууссан → 500`, act({ log: { status: 'FAILED', updatedAt: ago(1000) }, autoAttempts: AUTO_REGEN_MAX_PER_DAY, lastAutoAt: ago(AUTO_REGEN_COOLDOWN_MS + 1000) }), 'error:500');
check('E12 шалгалт олдсонгүй → 404', act({ examExists: false }), 'error:404');
check('E13 мессеж: хүлээх/гаргах үед "уншиж байна"', (decideEnsure({ ...base }) as any).message, 'Тайлан уншиж байна, түр хүлээнэ үү.');

if (failed) {
  console.log(`\n❌ ${failed} шалгалт унасан`);
  process.exit(1);
}
console.log('\n✅ БҮГД АМЖИЛТТАЙ');
