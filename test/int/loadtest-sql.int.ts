/**
 * №10 — `loadtest/prepare.sql` + `loadtest/cleanup.sql` жинхэнэ Postgres дээр: service үүсгэх, k6-ийн үүсгэсэн өгөгдлийг
 * ЯГ цэвэрлэх (loadtest-гүй өгөгдөлд хүрэхгүй), FK-ийн дарааллаар унахгүй байх.
 *   L1–L2 prepare · L3–L9 cleanup (бүх хүснэгтэд seed хийж шалгана) · L10 идемпотент
 * `loadtest/` нь core repo-оос ГАДНА (Hire root sibling) — core-only checkout (CI) дээр байхгүй бол алгасна.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PERF_BOOTSTRAP_STATEMENTS } from '../../src/database/sql/perf-bootstrap';
import { check, finish, makeDs, say } from './harness';

const block = (file: string, tag: string) => {
  const m = fs.readFileSync(file, 'utf8').match(new RegExp(`-- @${tag}:begin\\n([\\s\\S]*?)-- @${tag}:end`));
  if (!m) throw new Error(`${file}: @${tag} блок олдсонгүй`);
  return m[1].trim();
};

(async () => {
  const dir = path.join(__dirname, '../../../loadtest');
  if (!fs.existsSync(path.join(dir, 'cleanup.sql'))) {
    say('⚠️  loadtest/ олдсонгүй (core-only checkout) — алгасав');
    check('L0 loadtest/ байхгүй → алгасав', true, true);
    return finish()();
  }
  const ds = await makeDs();
  for (const s of PERF_BOOTSTRAP_STATEMENTS) await ds.query(s);
  await ds.query(`SET session_replication_role = replica`); // seed-д FK-ийн дагалдах мөр шаардахгүй (cascade нь үйлчилсээр)

  const n = async (sql: string) => Number((await ds.query(sql))[0].n);
  await ds.query(`INSERT INTO users (id, email, role, wallet, "emailVerified") VALUES (9, 'org@t.mn', 30, 0, true)`);
  await ds.query(`INSERT INTO assessment (id, name, description, usage, measure, price, duration, "questionCount", type, "createdUser") VALUES (1, 'DISC', 'd', 'u', 'm', 0, 0, 0, 10, 1)`);

  // ---- prepare
  const prep = block(path.join(dir, 'prepare.sql'), 'prepare')
    .replace(/:seats/g, '25').replace(/:'tag'/g, `'run1'`).replace(/:owner_id/g, '9').replace(/:assessment_id/g, '1').replace(/;$/, '');
  const r = await ds.query(prep);
  check('L1 prepare: service үүсэв, count=25, marker=loadtest_run1', [r.length, Number(r[0].seats), r[0].marker], [1, 25, 'loadtest_run1']);
  const svc = Number(r[0].service_id);
  const svcRow = (await ds.query(`SELECT price, "usedUserCount" u, status FROM "userService" WHERE id=$1`, [svc]))[0];
  check('L2 price ≥ 1 (квот идэвхтэй), used=0, status=SUCCESS(20)', [Number(svcRow.price) >= 1, Number(svcRow.u), Number(svcRow.status)], [true, 0, 20]);
  const none = await ds.query(block(path.join(dir, 'prepare.sql'), 'prepare').replace(/:seats/g, '25').replace(/:'tag'/g, `'run2'`).replace(/:owner_id/g, '9').replace(/:assessment_id/g, '999').replace(/;$/, ''));
  check('L2b assessment байхгүй → мөр үүсэхгүй', none.length, 0);

  // ---- k6-ийн үүсгэх өгөгдлийг бүх хүснэгтэд seed хийнэ
  const LT_MAIL = 'loadtest_run1_100001@example.invalid';
  await ds.query(`INSERT INTO users (id, email, role, wallet, "emailVerified") VALUES (100, $1, 20, 0, true), (101, 'loadtest_run1_2@example.invalid', 20, 0, true), (102, 'real@t.mn', 20, 0, true)`, [LT_MAIL]);
  await ds.query(`INSERT INTO exam (id, code, "assessmentName", "serviceId", "userId") VALUES (1,'LT1','DISC',$1,100), (2,'LT2','DISC',$1,NULL)`, [svc]);
  await ds.query(`INSERT INTO "examDetail" ("examId","questionId","questionCategoryId","serviceId") VALUES (1,1,1,$1),(1,2,1,$1),(2,1,1,$1)`, [svc]);
  await ds.query(`INSERT INTO "userAnswer" ("examId", code) VALUES (1,'LT1'),(2,'LT2')`);
  await ds.query(`INSERT INTO result (id, code, "assessmentName", lastname, firstname, type, assessment, "limit", duration) VALUES (1,'LT1','DISC','x','y',10,1,0,0)`);
  await ds.query(`INSERT INTO "resultDetail" (id, "resultId") VALUES (1,1)`);
  await ds.query(`INSERT INTO report_logs (id, code, role, status, progress) VALUES ('r1','LT1', 20, 'COMPLETED', 100), ('r2','LT2', 20, 'FAILED', 0)`);
  await ds.query(`INSERT INTO report_access (code, status, price) VALUES ('LT1', 10, 5000)`);
  await ds.query(`INSERT INTO email_logs ("toEmail", status, type, code, "userId") VALUES ('a@x','10','10','LT1',100), ('b@x','10','10',NULL,101)`);
  // loadtest БИШ өгөгдөл (ХҮРЭХГҮЙ): жинхэнэ service + exam, loadtest и-мэйлтэй боловч жинхэнэ exam-ийн эзэн хэрэглэгч
  await ds.query(`INSERT INTO "userService" (id, price, count, "usedUserCount", status, "userId", "assessmentId", "qpayInvoiceId") VALUES (777, 5000, 10, 1, 20, 9, 1, 'INV-REAL')`);
  await ds.query(`INSERT INTO exam (id, code, "assessmentName", "serviceId", "userId") VALUES (3,'REAL1','DISC',777,102), (4,'REAL2','DISC',777,101)`);
  await ds.query(`INSERT INTO "examDetail" ("examId","questionId","questionCategoryId","serviceId") VALUES (3,1,1,777)`);
  await ds.query(`INSERT INTO report_logs (id, code, role, status, progress) VALUES ('r3','REAL1', 20, 'COMPLETED', 100)`);

  // ---- cleanup — FK-ийг ЖИНХЭНЭЭР үйлчлүүлнэ (`replica` үед ON DELETE CASCADE trigger-үүд унтардаг тул seed-ийн дараа буцаана)
  await ds.query(`SET session_replication_role = DEFAULT`);
  const cleanup = block(path.join(dir, 'cleanup.sql'), 'cleanup');
  const stmts = cleanup.replace(/--[^\n]*/g, '').split(';').map((s) => s.trim()).filter(Boolean);
  const run = async () => { for (const s of stmts) await ds.query(s); };

  await ds.query('BEGIN');
  await run();
  await ds.query('ROLLBACK'); // DRY-RUN-той адил
  check('L3 dry-run (ROLLBACK): юу ч устаагүй', [await n(`SELECT count(*)::int n FROM exam`), await n(`SELECT count(*)::int n FROM "userService"`)], [4, 2]);

  await ds.query('BEGIN');
  await run();
  await ds.query('COMMIT');
  check('L4 loadtest service + exam устсан; жинхэнэ service / exam үлдсэн', [
    await n(`SELECT count(*)::int n FROM "userService" WHERE "qpayInvoiceId" LIKE 'loadtest\\_%'`), await n(`SELECT count(*)::int n FROM "userService" WHERE id=777`),
    await n(`SELECT count(*)::int n FROM exam WHERE code LIKE 'LT%'`), await n(`SELECT count(*)::int n FROM exam WHERE code LIKE 'REAL%'`),
  ], [0, 1, 0, 2]);
  check('L5 examDetail / userAnswer / result / resultDetail цэвэрлэгдсэн (CASCADE + code-оор)', [
    await n(`SELECT count(*)::int n FROM "examDetail" WHERE "examId" IN (1,2)`), await n(`SELECT count(*)::int n FROM "userAnswer"`),
    await n(`SELECT count(*)::int n FROM result`), await n(`SELECT count(*)::int n FROM "resultDetail"`),
  ], [0, 0, 0, 0]);
  check('L6 report_logs / report_access / email_logs: loadtest устсан, REAL1 үлдсэн', [
    await n(`SELECT count(*)::int n FROM report_logs WHERE code LIKE 'LT%'`), await n(`SELECT count(*)::int n FROM report_logs WHERE code='REAL1'`),
    await n(`SELECT count(*)::int n FROM report_access`), await n(`SELECT count(*)::int n FROM email_logs`),
  ], [0, 1, 0, 0]);
  check('L7 жинхэнэ service-ийн examDetail үлдсэн', await n(`SELECT count(*)::int n FROM "examDetail" WHERE "examId"=3`), 1);
  const users = (await ds.query(`SELECT id FROM users ORDER BY id`)).map((x: any) => Number(x.id));
  check('L8 хэрэглэгч: loadtest_ и-мэйлтэй хэрэглэгч (100) устсан; жинхэнэ exam-д холбогдсон loadtest_ и-мэйлтэй (101), жинхэнэ (102), байгууллага (9) үлдсэн', users, [9, 101, 102]);

  await ds.query('BEGIN');
  await run();
  await ds.query('COMMIT');
  check('L9 давтан ажиллуулахад алдаагүй, өөрчлөлтгүй (идемпотент)', [await n(`SELECT count(*)::int n FROM exam`), (await ds.query(`SELECT id FROM users ORDER BY id`)).length], [2, 3]);

  // Өөр exam-д холбоогүй болсны дараа тэр loadtest хэрэглэгч (101) дараагийн цэвэрлэгээнд устдаг
  await ds.query(`DELETE FROM exam WHERE id=4`);
  await ds.query('BEGIN');
  await run();
  await ds.query('COMMIT');
  check('L10 холбоогүй болсон loadtest хэрэглэгч (101) дараагийн цэвэрлэгээнд устна; 102, 9 хэвээр', (await ds.query(`SELECT id FROM users ORDER BY id`)).map((x: any) => Number(x.id)), [9, 102]);

  return finish(ds)();
})().catch((e) => {
  console.error('❌ loadtest-sql алдаа:', e);
  process.exit(1);
});
