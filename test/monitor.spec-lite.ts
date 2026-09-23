/**
 * №11-P1 — Monitor: route metadata, role (MONITOR_ROLES), параметрийн шалгалт,
 * cache (TTL + зэрэг ирсэн хүсэлтийг нэгтгэх), READ ONLY + statement_timeout
 * SQL-ийн хэлбэр. (DB-гүй; SQL-ийн үр дүн нь test/int/monitor.int.ts-д.)
 *
 * Ажиллуулах:
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/monitor.spec-lite.ts
 */
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MonitorController } from '../src/app/monitor/monitor.controller';
import { MonitorGuard, parseMonitorRoles } from '../src/app/monitor/monitor.guard';
import { MonitorService } from '../src/app/monitor/monitor.service';
import { IS_PUBLIC_KEY } from '../src/auth/guards/jwt/jwt-auth-guard';
import { ROLES_KEY } from '../src/auth/guards/role/role.decorator';
import { SUPER_ADMIN } from '../src/base/constants';

let failed = 0;
const say = console.log.bind(console);
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  say(`${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`);
};

// ---- хуурамч DataSource: transaction(cb) → manager.query(...) бүрийг бүртгэнэ ----
const log: { sql: string; params?: any[] }[] = [];
let delayMs = 0;
const row = { registered: 0, started: 0, finished: 0, reportReady: 0, viewed: 0, paid: 0, n: 0, total: 0, p50: null, p95: null, ms: 1, ageSec: null, serverErrors: 0, clientErrors: 0, lastCompletedAt: null };
const fakeDs: any = {
  transaction: async (cb: any) => {
    const m = { query: async (sql: string, params?: any[]) => { log.push({ sql, params }); if (delayMs) await new Promise((r) => setTimeout(r, delayMs)); return [row]; } };
    return cb(m);
  },
};
const dataQueries = () => log.filter((l) => !/^SET /.test(l.sql));

(async () => {
  process.env.MONITOR_CACHE_SEC = '45';
  delete process.env.MONITOR_ROLES;

  // ===== metadata / role =====
  {
    const roles = Reflect.getMetadata(ROLES_KEY, MonitorController);
    const guards = (Reflect.getMetadata('__guards__', MonitorController) ?? []).map((g: any) => g.name);
    const pub = Reflect.getMetadata(IS_PUBLIC_KEY, MonitorController) ?? null;
    const handlers = ['overview', 'funnel', 'reports', 'payments', 'errors', 'services', 'health'];
    const handlerPub = handlers.map((h) => Reflect.getMetadata(IS_PUBLIC_KEY, (MonitorController.prototype as any)[h]) ?? null);
    const methods = handlers.map((h) => Reflect.getMetadata('method', (MonitorController.prototype as any)[h]));
    check('M1 class: @SUPER() (10) + MonitorGuard, @Public БАЙХГҮЙ, 7 endpoint бүгд GET (0)', [roles, guards, pub, handlerPub.every((x) => x === null), methods.every((m) => m === 0)], [[SUPER_ADMIN], ['MonitorGuard'], null, true, true]);
    check('M2 parseMonitorRoles: default / 10,40 / 20,30 → default', [parseMonitorRoles(undefined), parseMonitorRoles('10,40'), parseMonitorRoles('20,30')], [[10], [10, 40], [10]]);
  }

  // ===== HTTP (жинхэнэ Nest) =====
  const svc = new MonitorService(fakeDs);
  @Module({ controllers: [MonitorController], providers: [{ provide: MonitorService, useValue: svc }, MonitorGuard] })
  class T {}
  const app = await NestFactory.create(T, { logger: false });
  app.use((req: any, _r: any, next: any) => { const r = req.headers['x-test-role']; if (r) req.user = { id: 1, role: Number(r) }; next(); });
  await app.listen(0, '127.0.0.1');
  const base = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}`;
  const get = async (p: string, role?: number) => {
    const r = await fetch(base + p, { headers: role !== undefined ? { 'x-test-role': String(role) } : {} });
    let data: any = null; try { data = await r.json(); } catch { /* */ }
    return { status: r.status, data };
  };
  const paths = ['/monitor/overview', '/monitor/funnel', '/monitor/reports', '/monitor/payments', '/monitor/errors', '/monitor/services', '/monitor/health'];

  {
    log.length = 0;
    const anon = await Promise.all(paths.map((p) => get(p)));
    const roles = await Promise.all([20, 30, 40, 50].map(async (r) => (await Promise.all(paths.map((p) => get(p, r)))).map((x) => x.status)));
    const queriesAfterDenied = dataQueries().length;
    const su = await Promise.all(paths.map((p) => get(p, 10)));
    check('M3 хэрэглэгчгүй → 403 (7/7); client / org / admin / tester → 403', [anon.map((x) => x.status), roles], [Array(7).fill(403), [20, 30, 40, 50].map(() => Array(7).fill(403))]);
    check('M4 super_admin → 7/7 endpoint 200', su.map((x) => x.status), Array(7).fill(200));
    check('M4b 403-аар хаагдсан хүсэлт DB-д ХҮРЭХГҮЙ (0 query); super-ийн хүсэлт хүрнэ (> 0)', [queriesAfterDenied, dataQueries().length > 0], [0, true]);
    process.env.MONITOR_ROLES = '10,40';
    svc.clearCache();
    const admin = await get('/monitor/health', 40);
    const tester = await get('/monitor/health', 50);
    delete process.env.MONITOR_ROLES;
    check('M4c MONITOR_ROLES=10,40 → admin 200, tester 403', [admin.status, tester.status], [200, 403]);
  }

  // ===== параметр =====
  {
    const badRange = await get('/monitor/funnel?range=1y', 10);
    const badState = await get('/monitor/reports?state=zzz', 10);
    const badThr = await Promise.all(['-1', 'abc', '1.5', '5000'].map((t) => get(`/monitor/services?threshold=${t}`, 10)));
    const ok = await Promise.all(['1h', '24h', '7d', '30d'].map((r) => get(`/monitor/funnel?range=${r}`, 10)));
    check('M5 буруу range / state / threshold → 400; зөв range 4 → 200', [badRange.status, badState.status, badThr.map((x) => x.status), ok.map((x) => x.status)], [400, 400, [400, 400, 400, 400], [200, 200, 200, 200]]);
    check('M5b range нь SQL-д ЗӨВХӨН whitelist-ийн interval-аар (параметрээр) дамжина', log.filter((l) => l.params?.[0] && typeof l.params[0] === 'string').every((l) => ['1 hour', '24 hours', '7 days', '30 days'].includes(l.params![0])), true);
  }

  // ===== READ ONLY + statement_timeout =====
  {
    log.length = 0; svc.clearCache();
    await (svc as any).q('SELECT 1');
    check('M6 query бүр: SET TRANSACTION READ ONLY → SET LOCAL statement_timeout → query', [log[0].sql, /^SET LOCAL statement_timeout = \d+$/.test(log[1].sql), log[2].sql], ['SET TRANSACTION READ ONLY', true, 'SELECT 1']);
    process.env.MONITOR_STATEMENT_TIMEOUT_MS = '1234'; log.length = 0;
    await (svc as any).q('SELECT 1');
    delete process.env.MONITOR_STATEMENT_TIMEOUT_MS;
    check('M6b MONITOR_STATEMENT_TIMEOUT_MS env үйлчилнэ', log[1].sql, 'SET LOCAL statement_timeout = 1234');
  }

  // ===== cache =====
  {
    svc.clearCache(); log.length = 0;
    await svc.funnel('24h');
    const first = dataQueries().length;
    const a = await svc.funnel('24h');
    const b = await svc.funnel('24h');
    check('M7 60с дотор давтан дуудлага DB-д хүрэхгүй (cache)', [dataQueries().length, a.generatedAt === b.generatedAt], [first, true]);
    await svc.funnel('7d');
    check('M7b өөр range → өөр cache түлхүүр (шинэ query)', dataQueries().length > first, true);

    svc.clearCache(); log.length = 0; delayMs = 60;
    await Promise.all(Array.from({ length: 10 }, () => svc.errors('24h')));
    delayMs = 0;
    check('M8 зэрэг ирсэн 10 ижил хүсэлт → нэг л удаа бодогдоно (2 query: summary + top)', dataQueries().length, 2);

    process.env.MONITOR_CACHE_SEC = '0.05'; svc.clearCache(); log.length = 0;
    await svc.payments('24h'); const n1 = dataQueries().length;
    await new Promise((r) => setTimeout(r, 120));
    await svc.payments('24h');
    process.env.MONITOR_CACHE_SEC = '45';
    check('M9 TTL дуусмагц дахин бодогдоно', dataQueries().length, n1 * 2);

    // алдаа cache-д үлдэхгүй
    let boom = true;
    const badDs: any = { transaction: async () => { if (boom) throw new Error('db down'); return [row]; } };
    const s2 = new MonitorService(badDs);
    const e1 = await s2.errors('24h').then(() => 'ok', (e: any) => e.message);
    boom = false;
    const e2 = await s2.errors('24h').then(() => 'ok', (e: any) => e.message);
    check('M10 алдаа cache-д үлдэхгүй (дараагийн дуудлага дахин оролдоно)', [e1, e2], ['db down', 'ok']);
  }

  // ===== PII =====
  {
    svc.clearCache();
    const outs = await Promise.all(paths.map((p) => get(p, 10)));
    const txt = JSON.stringify(outs.map((o) => o.data));
    check('M11 хариунд email / phone / firstname / lastname талбар байхгүй', /email|phone|firstname|lastname|password/i.test(txt), false);
    const sqlAll = log.map((l) => l.sql).join('\n');
    check('M11b SQL нь exam.email / phone / firstname / lastname-ийг SELECT хийдэггүй', /e\.(email|phone|firstname|lastname)|"(email|phone|firstname|lastname)"/i.test(sqlAll), false);
  }

  await app.close();
  say(failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} шалгалт унасан`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
