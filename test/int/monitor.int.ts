/**
 * L2 — Monitor SQL жинхэнэ Postgres дээр, seed дата дээр үр дүнгийн snapshot:
 * funnel, гацсан (Pattern A / B), failed, төлбөр, алдаа, квот, health,
 * READ ONLY хамгаалалт, PII байхгүй.
 *
 *   TEST_DATABASE_URL=… npx ts-node -P tsconfig.json -r tsconfig-paths/register test/int/monitor.int.ts
 */
import { PERF_BOOTSTRAP_STATEMENTS } from '../../src/database/sql/perf-bootstrap';
import { MonitorService } from '../../src/app/monitor/monitor.service';
import { check, finish, makeDs, say } from './harness';

const mins = (n: number) => `now() - interval '${n} minutes'`;

(async () => {
  const ds = await makeDs();
  for (const s of PERF_BOOTSTRAP_STATEMENTS) await ds.query(s);
  process.env.MONITOR_CACHE_SEC = '0';
  delete process.env.REPORT;
  const svc = new MonitorService(ds);

  // ---------------- seed ----------------
  const exam = (code: string, created: string, o: { s?: string; f?: string; v?: string } = {}) =>
    ds.query(
      `INSERT INTO exam (code, "assessmentName", email, firstname, lastname, phone, "createdAt", "userStartDate", "userEndDate", "reportViewedAt")
       VALUES ($1, 'DISC', 'secret@pii.mn', 'Bat', 'Dorj', '99112233', ${created}, ${o.s ?? 'NULL'}, ${o.f ?? 'NULL'}, ${o.v ?? 'NULL'})`,
      [code],
    );
  await exam('100001', mins(120), { s: mins(110), f: mins(30), v: mins(20) }); // COMPLETED + viewed + paid
  await exam('100002', mins(120), { s: mins(110), f: mins(30), v: mins(20) }); // SENT + viewed
  await exam('100003', mins(120), { s: mins(110) }); // эхэлсэн, дуусаагүй
  await exam('100004', mins(120)); // зөвхөн бүртгэгдсэн
  await exam('100005', mins(120), { s: mins(110), f: mins(20) }); // дууссан, report_logs ОГТ байхгүй → stuck A
  await exam('100006', mins(120), { s: mins(110), f: mins(3) }); // 3 мин өмнө дууссан → grace (stuck биш)
  await exam('100007', mins(120), { s: mins(110), f: mins(40) }); // WRITING 30 мин updatedAt → stuck B
  await exam('100008', mins(120), { s: mins(110), f: mins(60) }); // FAILED
  await exam('100009', `now() - interval '3 days'`, { s: `now() - interval '3 days'`, f: `now() - interval '3 days'` }); // 24h-ээс гадуур
  await exam('100010', mins(120), { s: mins(110), f: mins(40) }); // хуучин FAILED + шинэ COMPLETED

  const log = (id: string, code: string, status: string, created: string, updated: string, extra: { p?: number; err?: string } = {}) =>
    ds.query(
      `INSERT INTO report_logs (id, code, role, status, progress, error, "createdAt", "updatedAt")
       VALUES ($1, $2, 40, $3, $4, $5, ${created}, ${updated})`,
      [id, code, status, extra.p ?? 0, extra.err ?? null],
    );
  await log('r1', '100001', 'COMPLETED', `now() - interval '35 minutes'`, `now() - interval '35 minutes' + interval '40 seconds'`, { p: 100 });
  await log('r2', '100002', 'SENT', `now() - interval '35 minutes'`, `now() - interval '35 minutes' + interval '60 seconds'`, { p: 100 });
  await log('r7', '100007', 'WRITING', mins(40), mins(30), { p: 30 });
  await log('r8', '100008', 'FAILED', mins(59), mins(58), { p: 30, err: 'boom' });
  await log('r9', '100009', 'SENT', `now() - interval '3 days'`, `now() - interval '3 days' + interval '30 seconds'`, { p: 100 });
  await log('r10a', '100010', 'FAILED', mins(45), mins(44), { err: 'core-failed' });
  await log('r10b', '100010', 'COMPLETED', `now() - interval '38 minutes'`, `now() - interval '38 minutes' + interval '100 seconds'`, { p: 100 });

  const ra = (code: string, status: number, price: number, created: string) =>
    ds.query(`INSERT INTO report_access (code, status, price, "createdAt") VALUES ($1, $2, $3, ${created})`, [code, status, price]);
  await ra('100001', 20, 5000, mins(50));
  await ra('100003', 10, 5000, mins(30)); // 15+ мин pending → stale
  await ra('100004', 10, 5000, mins(5)); // шинэхэн pending
  await ra('100008', 30, 5000, mins(50));

  const us = (price: number, count: number, used: number, status: number, invoice: string | null, created: string) =>
    ds.query(`INSERT INTO "userService" (price, count, "usedUserCount", status, "qpayInvoiceId", "createdAt") VALUES ($1,$2,$3,$4,$5, ${created}) RETURNING id`, [price, count, used, status, invoice]);
  const [svc1] = await us(1000, 10, 8, 20, null, mins(200)); // remaining 2, exam-тэй → жагсаалтад
  const [svc2] = await us(1000, 100, 10, 20, null, mins(200)); // хол
  const [svc3] = await us(1000, 10, 10, 20, null, mins(200)); // дууссан ч сүүлийн 30 хоногт exam байхгүй
  await us(1000, 5, 0, 10, 'INV-1', mins(30)); // pending invoice 15+ мин
  await ds.query(`INSERT INTO exam (code, "assessmentName", "createdAt", "serviceId") VALUES ('100011', 'DISC', ${mins(300)}, $1), ('100012', 'DISC', now() - interval '3 days', $2)`, [svc1.id, svc2.id]);
  // 100011 / 100012 нь 24h-ийн funnel-д орохгүй байх ёстой тул createdAt-г цонхны гадна тавьсан (300 мин = 5 цаг → ОРНО!). Доор шалгалтад тооцно.

  await ds.query(`INSERT INTO payment ("totalPrice", method, "createdAt") VALUES (3000, 10, ${mins(60)}), (2000, 10, ${mins(50)})`);

  const err = (status: number, url: string, msg: string, ts: string) =>
    ds.query(`INSERT INTO error_logs (message, name, status, url, method, "timestamp") VALUES ($1,'Error',$2,$3,'GET', ${ts})`, [msg, status, url]);
  for (let i = 0; i < 3; i++) await err(500, '/api/a?token=zzz', 'boom', mins(10 + i));
  await err(404, '/api/b', 'not found', mins(20));
  await err(500, '/api/old', 'old', `now() - interval '2 days'`);

  // ---------------- funnel ----------------
  // 24h-д үүссэн exam: 100001..100008, 100010, 100011 (5 цагийн өмнө) = 10; 100009 (3 хоног), 100012 (3 хоног) гадуур
  const f = await svc.funnel('24h');
  check('I1 funnel totals (24h)', f.totals, { registered: 10, started: 8, finished: 7, reportReady: 3, viewed: 2, paid: 1 });
  const f7 = await svc.funnel('7d');
  check('I1b funnel 7d → 3 хоногийн өмнөх 2 exam нэмэгдэнэ (registered 12)', [f7.totals.registered, f7.totals.reportReady], [12, 4]);
  check('I1c conversion хувь', f.conversion, { startedOfRegistered: 80, finishedOfStarted: 87.5, reportReadyOfFinished: 42.9, viewedOfReportReady: 66.7, paidOfViewed: 50 });
  check('I1d byAssessment: DISC нэг мөр, нийлбэр totals-тай тэнцүү', [f.byAssessment.length, f.byAssessment[0].registered], [1, 10]);

  // ---------------- reports ----------------
  const r = await svc.reports('24h');
  check('I2 counts: сүүлийн мөр бүрээр (100010-ийн хуучин FAILED тоологдохгүй; 3 хоногийн өмнөх SENT гадуур)', Object.entries(r.counts).sort(), Object.entries({ COMPLETED: 2, FAILED: 1, SENT: 1, WRITING: 1 }).sort());
  check('I3 stuckNoLog (Pattern A): зөвхөн 100005 (100006 grace, 100009 цонхны гадна)', [r.stuckNoLog.total, r.stuckNoLog.items.map((x: any) => x.code)], [1, ['100005']]);
  check('I4 stuckInProgress (Pattern B): зөвхөн 100007 (WRITING, 30 мин)', [r.stuckInProgress.total, r.stuckInProgress.items.map((x: any) => [x.code, x.status])], [1, [['100007', 'WRITING']]]);
  check('I5 failed: зөвхөн 100008 (100010-ийн шинэ мөр COMPLETED)', [r.failed.total, r.failed.items.map((x: any) => [x.code, x.error])], [1, [['100008', 'boom']]]);
  check('I6 durationSec: n=3, p50=60, p95=96', [r.durationSec.n, r.durationSec.p50, Math.round(r.durationSec.p95 * 10) / 10], [3, 60, 96]);
  check('I7 lastCompletedAt байна', typeof r.lastCompletedAt, 'object');
  const rs = await svc.reports('24h', 'stuck');
  const rf = await svc.reports('24h', 'failed');
  check('I7b state=stuck → failed жагсаалт хоосон; state=failed → stuck жагсаалт хоосон', [rs.failed.items.length, rf.stuckNoLog.items.length, rf.stuckInProgress.items.length], [0, 0, 0]);

  // ---------------- payments ----------------
  const p = await svc.payments('24h');
  check('I8 report_access byStatus: 10:{2,10000}, 20:{1,5000}, 30:{1,5000}', p.reportAccess.byStatus.map((x: any) => [x.status, x.n, x.amount]), [[10, 2, 10000], [20, 1, 5000], [30, 1, 5000]]);
  check('I9 pending 15+ мин: зөвхөн 100003 (100004 шинэхэн)', [p.reportAccess.pendingOver15min.total, p.reportAccess.pendingOver15min.items.map((x: any) => x.code)], [1, ['100003']]);
  check('I10 userService pending invoice 15+ мин: 1', p.userService.pendingInvoiceOver15min.total, 1);
  check('I11 wallet: method 10 → 2 гүйлгээ, 5000', p.wallet.byMethod, [{ method: 10, n: 2, amount: 5000 }]);

  // ---------------- errors ----------------
  const e = await svc.errors('24h');
  check('I12 errors: total 4, 5xx 3, 4xx 1 (2 хоногийн өмнөх гадуур)', [e.total, e.serverErrors, e.clientErrors], [4, 3, 1]);
  check('I13 top[0]: 500 /api/a (query string цэвэрлэгдсэн — token алга) ×3', [e.top[0].status, e.top[0].url, e.top[0].n], [500, '/api/a', 3]);

  // ---------------- services ----------------
  const s = await svc.services(5);
  check('I14 квот дөхсөн: зөвхөн svc1 (remaining 2); svc2 хол, svc3-д сүүлийн 30 хоногт exam байхгүй', s.items.map((x: any) => [x.id, x.remaining]), [[svc1.id, 2]]);
  const s0 = await svc.services(0);
  check('I14b threshold=0 → хоосон (svc1 remaining 2)', s0.items.length, 0);

  // ---------------- health ----------------
  const h = await svc.health();
  check('I15 health: db.ms тоо, reportVps REPORT-гүй → ok=false, oldestPending ≈ 100007-ийн мөр (~40 мин)', [typeof h.db.ms, h.reportVps.ok, h.oldestPendingReportAgeSec >= 2300 && h.oldestPendingReportAgeSec <= 2600, h.materializedViews.every((m: any) => m.populated)], ['number', false, true, true]);

  // ---------------- overview ----------------
  const o = await svc.overview('24h');
  check('I16 overview: stuck / failed / төлбөр / алдааны KPI', [o.reports.stuckNoLog, o.reports.stuckInProgress, o.reports.failed, o.payments.pendingOver15min, o.errors.serverErrors], [1, 1, 1, 2, 3]);

  // ---------------- хамгаалалт ----------------
  const w = await (svc as any).q('DELETE FROM exam').then(() => 'DELETED', (x: any) => x.message);
  check('I17 READ ONLY: Monitor-ын q() бичих оролдлого татгалзагдана', /read-only/i.test(String(w)), true);
  const left = (await ds.query('SELECT count(*)::int AS n FROM exam'))[0].n;
  check('I17b exam мөр устаагүй', left, 12);

  process.env.MONITOR_STATEMENT_TIMEOUT_MS = '500';
  const inTx = (await (svc as any).q('SHOW statement_timeout'))[0].statement_timeout;
  const outTx = (await ds.query('SHOW statement_timeout'))[0].statement_timeout;
  check('I18 SET LOCAL statement_timeout: transaction дотор 500ms, гадна нь өөрчлөгдөөгүй (pgbouncer-т нийцтэй)', [inTx, outTx !== '500ms'], ['500ms', true]);
  if (process.env.TEST_DB_ENGINE === 'pglite') {
    say('ℹ️  I18b: PGlite нь statement_timeout-ыг албадаж таслахгүй — жинхэнэ Postgres (docker `test:int` / CI)-д шалгагдана');
  } else {
    const t0 = Date.now();
    const slow = await (svc as any).q('SELECT pg_sleep(3)').then(() => 'DONE', (x: any) => x.message);
    check('I18b удаан query (pg_sleep 3с) 500ms дээр таслагдана', [/statement timeout/i.test(String(slow)), Date.now() - t0 < 2500], [true, true]);
  }
  process.env.MONITOR_STATEMENT_TIMEOUT_MS = '5000';

  const all = JSON.stringify([f, r, p, e, s, h, o]);
  check('I19 PII (secret@pii.mn / Bat / 99112233) хариунд огт байхгүй', /secret@pii|Bat|99112233|Dorj/.test(all), false);

  await finish(ds)();
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
