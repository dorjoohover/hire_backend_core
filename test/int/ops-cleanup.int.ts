/**
 * Ops цэвэрлэгээ (`/ops/cleanup/preview|apply`) жинхэнэ Postgres дээр + хуурамч hire_report
 * (`POST /internal/files/delete`). Тестийн өгөгдлийг (k6 акаунт / loadtest / preview / code)
 * PDF-тэй нь устгаж, ЖИНХЭНЭ өгөгдөл, боловсруулагдаж буй / төлбөртэй тайланд хүрэхгүйг шалгана.
 *   TEST_DATABASE_URL=… npx ts-node -P tsconfig.json -r tsconfig-paths/register test/int/ops-cleanup.int.ts
 */
import * as http from 'http';
import { AddressInfo } from 'net';
import { PERF_BOOTSTRAP_STATEMENTS } from '../../src/database/sql/perf-bootstrap';
import { OpsService } from '../../src/app/ops/ops.service';
import { OpsCleanupService } from '../../src/app/ops/ops-cleanup.service';
import { check, finish, makeDs, say } from './harness';

const C = (n: number) => String(1000000000 + n); // 10 оронтой тоон code
// DB-ийн огноо `timestamp` (TZ-гүй) — app-ийн Node TZ-ээр бичигддэг тул since-ийг мөн local-аар (TZ-ээс үл хамаарна).
const SINCE = new Date(2026, 9, 5, 19, 0).toISOString();
const SINCE_EARLIER = new Date(2026, 9, 5, 18, 0).toISOString();
const actor = { id: 1, email: 'super@hire.mn', ip: '127.0.0.1' };

(async () => {
  const ds = await makeDs();
  for (const s of PERF_BOOTSTRAP_STATEMENTS) await ds.query(s);
  const n = async (sql: string, p: any[] = []) => Number((await ds.query(sql, p))[0].n);
  const exists = async (code: string) => (await n(`SELECT count(*)::int n FROM exam WHERE code=$1`, [code])) === 1;

  // ---- хуурамч hire_report
  const calls: string[][] = [];
  let failRemote = new Set<string>();
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (req.url !== '/api/v1/internal/files/delete' || req.headers['x-internal-key'] !== 'k') {
        res.writeHead(401); return res.end('{}');
      }
      const codes: string[] = JSON.parse(body).codes;
      calls.push(codes);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        remote: { enabled: true, bucket: 'b', prefix: 'reports/' },
        results: codes.map((code) => failRemote.has(code)
          ? { code, local: 'deleted', leftovers: 0, remote: 'error', error: 'remote AccessDenied' }
          : { code, local: 'deleted', leftovers: 0, remote: 'deleted' }),
      }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const port = (server.address() as AddressInfo).port;
  process.env.REPORT = `http://127.0.0.1:${port}/api/v1/`;
  process.env.INTERNAL_API_KEY = 'k';
  process.env.OPS_RATE_PER_MIN = '100000';

  const ops = new OpsService(ds, undefined as any, undefined as any);
  const svc = new OpsCleanupService(ds, ops);
  const expectErr = async (fn: () => Promise<any>) => {
    try { await fn(); return 'ok'; } catch (e: any) { return e?.status ?? e?.message; }
  };

  // ---- seed (FK-ийн дагалдах мөргүйгээр), дараа нь FK-г жинхэнээр нь асаана
  await ds.query(`SET session_replication_role = replica`);
  await ds.query(`INSERT INTO users (id, email, role, wallet, "emailVerified") VALUES
    (9,'org@t.mn',30,0,true), (50,'K6@Test.mn',30,0,true), (100,'loadtest_run1_1@example.invalid',20,0,true), (102,'real@t.mn',20,0,true)`);
  await ds.query(`INSERT INTO assessment (id, name, description, usage, measure, price, duration, "questionCount", type, "createdUser") VALUES (1,'DISC','d','u','m',0,0,0,10,1)`);
  await ds.query(`INSERT INTO "userService" (id, price, count, "usedUserCount", status, "userId", "assessmentId", "qpayInvoiceId", "createdAt") VALUES
    (501, 0, 1, 1, 20, 50, 1, NULL,        '2026-09-01'),
    (502, 0, 2, 2, 20, 50, 1, NULL,        '2026-10-05 20:00'),
    (503, 5000, 1, 1, 20, 50, 1, 'INV-1',  '2026-10-05 20:00'),
    (504, 0, 1, 0, 20, 50, 1, NULL,        '2026-10-05 20:00'),
    (505, 0, 1, 1, 20, 50, 1, NULL,        '2026-10-05 20:00'),
    (777, 5000, 10, 2, 20, 9, 1, 'INV-REAL','2026-10-05 20:00'),
    (778, 0, 10, 1, 20, 9, 1, NULL,       '2026-10-05 20:00'),
    (601, 1, 25, 1, 20, 9, 1, 'loadtest_run1', '2026-10-05 20:00')`);
  const ex = (id: number, code: string, svcId: number | null, user: number | null, created: string, ended = true, preview = false) =>
    `(${id}, '${code}', 'DISC', ${svcId ?? 'NULL'}, ${user ?? 'NULL'}, '${created}', now() - interval '1 hour', ${ended ? `now() - interval '50 minutes'` : 'NULL'}, ${preview})`;
  await ds.query(`INSERT INTO exam (id, code, "assessmentName", "serviceId", "userId", "createdAt", "userStartDate", "userEndDate", "isPreview") VALUES
    ${[
      ex(2000, C(200), 501, null, '2026-09-01'),            // since-ээс өмнө → хүрэхгүй
      ex(2001, C(201), 502, null, '2026-10-05 20:01'),      // устна
      ex(2002, C(202), 502, null, '2026-10-05 20:02'),      // тайлан боловсруулагдаж байна → алгасна
      ex(2003, C(203), 503, null, '2026-10-05 20:03'),      // QPay төлбөртэй үйлчилгээ → алгасна
      ex(2005, C(205), 505, null, '2026-10-05 20:05'),      // төлбөртэй тайлан → алгасна
      ex(3001, C(301), 777, 102, '2026-10-05 20:10'),       // жинхэнэ → хүрэхгүй
      ex(3002, C(302), 778, 50, '2026-10-05 20:11'),        // k6 акаунт өөрөө өгсөн (wallet/үнэгүй үйлчилгээ) → устна
      ex(3004, C(304), 777, 50, '2026-10-05 20:13'),        // k6 акаунт өгсөн ч QPay-аар төлсөн байгууллагын үйлчилгээ → алгасна
      ex(3003, C(303), 777, 102, '2026-10-05 20:12', false),// одоо өгч байна (codes горимд)
      ex(4001, C(401), 601, 100, '2026-10-05 20:20'),       // loadtest
      ex(5001, C(501), null, 9, '2026-10-05 20:30', true, true), // isPreview
    ].join(',')}`);
  await ds.query(`INSERT INTO "examDetail" ("examId","questionId","questionCategoryId","serviceId") VALUES (2001,1,1,502),(3001,1,1,777),(3002,1,1,778)`);
  await ds.query(`INSERT INTO "userAnswer" ("examId", code) VALUES (2001,'${C(201)}'),(3001,'${C(301)}'),(3002,'${C(302)}')`);
  await ds.query(`INSERT INTO result (id, code, "assessmentName", lastname, firstname, type, assessment, "limit", duration) VALUES
    (1,'${C(201)}','DISC','x','y',10,1,0,0), (2,'${C(301)}','DISC','x','y',10,1,0,0)`);
  await ds.query(`INSERT INTO "resultDetail" (id, "resultId") VALUES (1,1),(2,2)`);
  await ds.query(`INSERT INTO report_logs (id, code, role, status, progress, "updatedAt") VALUES
    ('a','${C(201)}',20,'COMPLETED',100, now() - interval '1 hour'),
    ('b','${C(202)}',20,'CALCULATING',60, now()),
    ('c','${C(301)}',20,'SENT',100, now() - interval '1 hour')`);
  await ds.query(`INSERT INTO report_access (code, status, price) VALUES ('${C(201)}',10,5000), ('${C(205)}',20,5000)`);
  await ds.query(`INSERT INTO email_logs ("toEmail", status, type, code, "userId") VALUES ('a@x','10','10','${C(201)}',NULL), ('r@x','10','10','${C(301)}',102), ('l@x','10','10',NULL,100)`);
  await ds.query(`INSERT INTO report_snapshot (code, data) VALUES ('${C(201)}','\\x00'), ('${C(301)}','\\x00')`);
  await ds.query(`INSERT INTO transaction (price, count, "serviceId", "createdUser") VALUES (0,1,502,50), (0,1,504,50), (5000,1,777,9)`);
  await ds.query(`SET session_replication_role = DEFAULT`);

  // ---- C1 email горим — preview
  const p1 = await svc.preview(actor, { email: 'k6@test.MN', since: SINCE });
  check('C1 email: устгах code = 201 (үйлчилгээ) + 302 (өөрөө өгсөн)', p1.codes, [C(201), C(302)]);
  check('C1b алгассан: 202 боловсруулагдаж буй, 203 QPay үйлчилгээ, 205 төлбөртэй тайлан, 304 QPay байгууллагын үйлчилгээ',
    p1.skipped.map((s: any) => `${s.code.slice(-3)}:${s.reason}`), ['202:in-progress-report', '203:paid-service', '205:paid-report', '304:paid-service']);
  check('C1c хоосорсон үйлчилгээ: зөвхөн 504 (502-д алгассан exam бий, 503 төлбөртэй, 501 since-ээс өмнө)', p1.services, [504]);
  check('C1d тоо', [p1.counts.exams, p1.counts.results, p1.counts.userAnswers, p1.counts.reportLogs, p1.counts.reportAccess, p1.counts.emailLogs, p1.counts.snapshots, p1.counts.services, p1.counts.transactions],
    [2, 1, 2, 1, 1, 1, 1, 1, 1]);
  check('C1e token өгсөн, DB өөрчлөгдөөгүй', [!!p1.token, await exists(C(201)), calls.length], [true, true, 0]);

  // ---- C2 token
  check('C2 token байхгүй → 400', await expectErr(() => svc.apply(actor, { email: 'k6@test.mn', since: SINCE })), 400);
  check('C2b хуурамч token → 409', await expectErr(() => svc.apply(actor, { email: 'k6@test.mn', since: SINCE, token: `${Date.now() + 60000}.abcd` })), 409);
  check('C2c өөр сонголттой (since өөр) token → 409', await expectErr(() => svc.apply(actor, { email: 'k6@test.mn', since: SINCE_EARLIER, token: p1.token! })), 409);

  // ---- C3 apply
  const a1: any = await svc.apply(actor, { email: 'k6@test.mn', since: SINCE, token: p1.token! });
  check('C3 hire_report-т 201, 302-ын PDF устгах хүсэлт', calls, [[C(201), C(302)]]);
  check('C3b устсан: 201, 302; үлдсэн: 200, 202, 203, 205, 301', await Promise.all([201, 302, 200, 202, 203, 205, 301].map((x) => exists(C(x)))),
    [false, false, true, true, true, true, true]);
  check('C3c хүүхэд мөрүүд (201) устсан, 301-ийнх үлдсэн', [
    await n(`SELECT count(*)::int n FROM "examDetail" WHERE "examId" IN (2001,3002)`), await n(`SELECT count(*)::int n FROM "examDetail" WHERE "examId"=3001`),
    await n(`SELECT count(*)::int n FROM "userAnswer" WHERE code IN ($1,$2)`, [C(201), C(302)]), await n(`SELECT count(*)::int n FROM "userAnswer" WHERE code=$1`, [C(301)]),
    await n(`SELECT count(*)::int n FROM result`), await n(`SELECT count(*)::int n FROM "resultDetail"`),
    await n(`SELECT count(*)::int n FROM report_logs WHERE code=$1`, [C(201)]), await n(`SELECT count(*)::int n FROM report_access WHERE code=$1`, [C(201)]),
    await n(`SELECT count(*)::int n FROM email_logs WHERE code=$1`, [C(201)]), await n(`SELECT count(*)::int n FROM report_snapshot`),
  ], [0, 1, 0, 1, 1, 1, 0, 0, 0, 1]);
  check('C3d үйлчилгээ: 504 устсан (+transaction), 501/502/503/505/777 үлдсэн', [
    (await ds.query(`SELECT id FROM "userService" ORDER BY id`)).map((r: any) => Number(r.id)),
    await n(`SELECT count(*)::int n FROM transaction`),
  ], [[501, 502, 503, 505, 601, 777, 778], 2]);
  check('C3e хариу: deleted.exams=2, services=1, failed 0, skipped 4', [a1.deleted.exams, a1.deleted.services, a1.failed.length, a1.skipped.length], [2, 1, 0, 4]);
  check('C3f аудит: cleanup.apply 1 + cleanup.delete 2 (code тус бүр)', [
    await n(`SELECT count(*)::int n FROM ops_action_log WHERE action='cleanup.apply' AND status='ok'`),
    (await ds.query(`SELECT code FROM ops_action_log WHERE action='cleanup.delete' ORDER BY code`)).map((r: any) => r.code),
  ], [1, [C(201), C(302)]]);

  // ---- C4 preview-ийн дараа олонлог өөрчлөгдвөл → 409
  await ds.query(`UPDATE report_logs SET status='COMPLETED', "updatedAt"=now() - interval '1 hour' WHERE code=$1`, [C(202)]);
  const p4 = await svc.preview(actor, { email: 'k6@test.mn', since: SINCE });
  check('C4 202 дууссан → одоо устгагдахаар', p4.codes, [C(202)]);
  await ds.query(`INSERT INTO exam (id, code, "assessmentName", "serviceId", "createdAt", "userStartDate", "userEndDate") VALUES (2006,'${C(206)}','DISC',502,'2026-10-05 21:00', now() - interval '2 hours', now() - interval '1 hour')`);
  check('C4b preview-ээс хойш шинэ exam нэмэгдсэн → 409, юу ч устаагүй', [await expectErr(() => svc.apply(actor, { email: 'k6@test.mn', since: SINCE, token: p4.token! })), await exists(C(202)), calls.length], [409, true, 1]);

  // ---- C5 файл устгаж чадаагүй code-ийн DB мөр үлдэнэ; DB-д байхгүй code → зөвхөн файл
  failRemote = new Set([C(206)]);
  const p5 = await svc.preview(actor, { codes: [C(206), C(999)] });
  check('C5 codes: 206 (DB) + 999 (орphan, зөвхөн файл)', [p5.codes, p5.orphanCodes], [[C(206)], [C(999)]]);
  const a5: any = await svc.apply(actor, { codes: [C(206), C(999)], token: p5.token! });
  check('C5b 206: R2 алдаа → failed, exam үлдсэн; 999: файл устсан', [a5.failed.map((f: any) => f.code), await exists(C(206)), a5.orphanFiles, a5.codes], [[C(206)], true, 1, 0]);
  check('C5c failed байгаа тул cleanup.apply = failed аудит', await n(`SELECT count(*)::int n FROM ops_action_log WHERE action='cleanup.apply' AND status='failed'`), 1);
  failRemote = new Set();

  // ---- C6 force: төлбөртэй / одоо өгч буй
  const p6 = await svc.preview(actor, { codes: [C(203), C(205), C(303)] });
  check('C6 force-гүй: бүгд алгасагдана, token = null', [p6.codes, p6.skipped.map((s: any) => s.reason), p6.token], [[], ['paid-service', 'paid-report', 'exam-in-progress'], null]);
  const p6f = await svc.preview(actor, { codes: [C(203), C(205)], force: true });
  check('C6b force: 203, 205 устгагдахаар', p6f.codes, [C(203), C(205)]);
  const a6: any = await svc.apply(actor, { codes: [C(203), C(205)], token: p6f.token! });
  check('C6c force-гүй apply (force-той token-оор ч) → юу ч устахгүй', [a6.codes, await exists(C(203)), await exists(C(205))], [0, true, true]);
  await svc.apply(actor, { codes: [C(203), C(205)], force: true, token: p6f.token! });
  check('C6d устсан; codes горимд үйлчилгээ (503, 505) хөндөгдөхгүй', [await exists(C(203)), await exists(C(205)),
    await n(`SELECT count(*)::int n FROM "userService" WHERE id IN (503,505)`), await n(`SELECT count(*)::int n FROM report_access WHERE code=$1`, [C(205)])], [false, false, 2, 0]);

  // ---- C7 loadtest
  const p7 = await svc.preview(actor, { loadtest: true });
  await svc.apply(actor, { loadtest: true, token: p7.token! });
  check('C7 loadtest: exam 401, үйлчилгээ 601, хэрэглэгч 100 (+email_logs) устсан; 102, 9, 50 үлдсэн', [
    await exists(C(401)), await n(`SELECT count(*)::int n FROM "userService" WHERE id=601`),
    (await ds.query(`SELECT id FROM users ORDER BY id`)).map((r: any) => Number(r.id)), await n(`SELECT count(*)::int n FROM email_logs WHERE "userId"=100`),
  ], [false, 0, [9, 50, 102], 0]);

  // ---- C8 isPreview
  check('C8 preview горим since-гүй → 400', await expectErr(() => svc.preview(actor, { preview: true })), 400);
  const p8 = await svc.preview(actor, { preview: true, since: SINCE });
  check('C8b зөвхөн isPreview exam', p8.codes, [C(501)]);
  await svc.apply(actor, { preview: true, since: SINCE, token: p8.token! });
  check('C8c устсан', await exists(C(501)), false);

  // ---- C9 hire_report холбогдохгүй → 502, DB хөндөгдөхгүй
  const p9 = await svc.preview(actor, { codes: [C(301)], force: true }); // 301 нь QPay үйлчилгээнийх → force
  process.env.REPORT = `http://127.0.0.1:1/api/v1/`;
  check('C9 hire_report унтарсан → 502, 301 үлдсэн', [await expectErr(() => svc.apply(actor, { codes: [C(301)], force: true, token: p9.token! })), await exists(C(301))], [502, true]);
  process.env.REPORT = `http://127.0.0.1:${port}/api/v1/`;
  delete process.env.INTERNAL_API_KEY;
  check('C9b INTERNAL_API_KEY байхгүй → 503', await expectErr(() => svc.apply(actor, { codes: [C(301)], force: true, token: p9.token! })), 503);
  process.env.INTERNAL_API_KEY = 'k';

  // ---- C10–C12 хамгаалалт
  process.env.OPS_CLEANUP = 'off';
  check('C10 OPS_CLEANUP=off → 403', await expectErr(() => svc.preview(actor, { codes: [C(301)] })), 403);
  delete process.env.OPS_CLEANUP;
  process.env.OPS_CLEANUP_MAX = '1';
  const p11 = await svc.preview(actor, { codes: [C(301), C(202)], force: true });
  check('C11 OPS_CLEANUP_MAX=1, 2 code → overLimit, token=null; apply → 400', [p11.overLimit, p11.token, await expectErr(() => svc.apply(actor, { codes: [C(301), C(202)], force: true, token: 'x.y' }))], [true, null, 400]);
  delete process.env.OPS_CLEANUP_MAX;
  check('C12 хоёр горим зэрэг → 400', await expectErr(() => svc.preview(actor, { codes: [C(301)], loadtest: true })), 400);
  check('C12b email since-гүй → 400', await expectErr(() => svc.preview(actor, { email: 'k6@test.mn' })), 400);
  check('C12c буруу code (../) → 400', await expectErr(() => svc.preview(actor, { codes: ['../1'] })), 400);
  check('C12d жинхэнэ 301 эцэст нь хөндөгдөөгүй', [await exists(C(301)), await n(`SELECT count(*)::int n FROM result WHERE code=$1`, [C(301)])], [true, 1]);

  server.close();
  return finish(ds)();
})().catch((e) => {
  console.error('❌ ops-cleanup алдаа:', e);
  process.exit(1);
});
