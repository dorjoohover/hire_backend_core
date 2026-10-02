/**
 * №14 — OpsModule: recalculate / regenerate / retry / PDF гараар солих / аудит.
 * Жинхэнэ Nest app (OpsController + OpsGuard) + хуурамч hire_report (http) +
 * санах ойн DataSource. DB / Redis / бодит hire_report хэрэггүй.
 *
 * Ажиллуулах:
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/ops.spec-lite.ts
 */
import 'reflect-metadata';
import * as http from 'http';
import { createHash } from 'crypto';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { OpsController } from '../src/app/ops/ops.controller';
import { OpsGuard, parseOpsRoles } from '../src/app/ops/ops.guard';
import { OpsService } from '../src/app/ops/ops.service';
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

// ---------- санах ойн DB ----------
const db = {
  exams: new Set<string>(['100001', '100002', '100003', '100004', '100005']),
  logs: [] as any[],
  actions: [] as any[],
  results: {} as Record<string, number>,
};
const fakeDs: any = {
  query: async (sql: string, p: any[] = []) => {
    const s = sql.replace(/\s+/g, ' ');
    if (s.includes('FROM exam WHERE code')) return db.exams.has(p[0]) ? [{ id: 1 }] : [];
    if (s.includes('FROM report_logs WHERE code')) {
      const rows = db.logs.filter((l) => l.code === p[0]).sort((a, b) => +b.createdAt - +a.createdAt);
      return rows.slice(0, 1);
    }
    if (s.includes('FROM result WHERE code')) return [{ n: db.results[p[0]] ?? 0 }];
    if (s.includes('count(*)::int AS n FROM ops_action_log'))
      return [{ n: db.actions.filter((a) => a.actorId === p[0] && Date.now() - a.at < 60_000).length }];
    if (s.startsWith('INSERT INTO ops_action_log')) {
      db.actions.push({ actorId: p[0], actorEmail: p[1], action: p[2], code: p[3], status: p[4], detail: p[5], ip: p[6], at: Date.now() });
      return [];
    }
    if (s.includes('FROM ops_action_log')) {
      const rows = db.actions.filter((a) => p[0] == null || a.code === p[0]).reverse();
      return rows;
    }
    throw new Error('unexpected SQL: ' + s.slice(0, 80));
  },
};
const fakeDao: any = {
  updates: [] as any[],
  created: [] as any[],
  updateById: async (id: string, dto: any) => {
    fakeDao.updates.push([id, dto]);
    const l = db.logs.find((x) => x.id === id);
    if (l) Object.assign(l, dto);
  },
  create: async (dto: any) => {
    fakeDao.created.push(dto);
    db.logs.push({ ...dto, createdAt: new Date(), updatedAt: new Date() });
  },
};
const addLog = (code: string, status: string, over: any = {}) =>
  db.logs.push({ id: `L${code}`, code, status, role: 40, progress: 50, createdAt: new Date(), updatedAt: new Date(), ...over });

// ---------- хуурамч hire_report ----------
const rep = {
  posts: [] as any[],
  puts: [] as any[],
  postMode: 'ok' as 'ok' | '409' | '500',
  files: new Set<string>(['report-100001.pdf']),
};
const reportSrv = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const json = (st: number, o: any) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.method === 'POST' && req.url === '/') {
      rep.posts.push(JSON.parse(body.toString() || '{}'));
      if (rep.postMode === '409') return json(409, { message: 'Тайлан одоо боловсруулагдаж байна (active)' });
      if (rep.postMode === '500') return json(500, { message: 'boom' });
      return json(201, { jobId: 'rpt-x', status: 'STARTED' });
    }
    if (req.method === 'GET' && req.url?.startsWith('/file/')) {
      const name = req.url.slice('/file/'.length);
      if (!rep.files.has(name)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Length': '4321' });
      return res.end(Buffer.alloc(10));
    }
    if (req.method === 'PUT' && req.url?.startsWith('/internal/files/')) {
      rep.puts.push({ url: req.url, key: req.headers['x-internal-key'], sha: req.headers['x-content-sha256'], ct: req.headers['content-type'], len: body.length, body });
      return json(200, { name: req.url.split('/').pop(), size: body.length, replaced: rep.files.has(req.url.split('/').pop()!) });
    }
    res.writeHead(404); res.end();
  });
});

const pdf = (n = 1000, tail = '\n%%EOF\n') => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(n, 65), Buffer.from(tail)]);

(async () => {
  await new Promise<void>((r) => reportSrv.listen(0, '127.0.0.1', () => r()));
  process.env.REPORT = `http://127.0.0.1:${(reportSrv.address() as any).port}/`;
  process.env.INTERNAL_API_KEY = 'k-test';
  delete process.env.OPS_ROLES;
  process.env.OPS_RATE_PER_MIN = '1000';

  // ===== route metadata =====
  {
    const roles = Reflect.getMetadata(ROLES_KEY, OpsController);
    const guards = (Reflect.getMetadata('__guards__', OpsController) ?? []).map((g: any) => g.name);
    const pub = Reflect.getMetadata(IS_PUBLIC_KEY, OpsController) ?? null;
    const handlerPub = ['status', 'log', 'recalculate', 'regenerate', 'retry', 'uploadPdf'].map((h) => Reflect.getMetadata(IS_PUBLIC_KEY, (OpsController.prototype as any)[h]) ?? null);
    check('O1 class: @SUPER() (10) + OpsGuard, @Public БАЙХГҮЙ', [roles, guards, pub, handlerPub.every((x) => x === null)], [[SUPER_ADMIN], ['OpsGuard'], null, true]);
    check('O2 parseOpsRoles: default / 10,40 / зөвхөн client,org → default / хольсон', [parseOpsRoles(undefined), parseOpsRoles('10, 40'), parseOpsRoles('20,30'), parseOpsRoles('40,abc,99')], [[10], [10, 40], [10], [40]]);
  }

  // ===== жинхэнэ Nest app =====
  const svc = new OpsService(fakeDs, fakeDao);
  @Module({ controllers: [OpsController], providers: [{ provide: OpsService, useValue: svc }, OpsGuard] })
  class T {}
  const app = await NestFactory.create(T, { logger: false });
  app.use((req: any, _res: any, next: any) => {
    const r = req.headers['x-test-role'];
    if (r) req.user = { id: Number(req.headers['x-test-id'] ?? 1), email: 'root@hire.mn', role: Number(r) };
    next();
  });
  await app.listen(0, '127.0.0.1');
  const base = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}`;
  const call = async (method: string, path: string, opts: { role?: number; id?: number; json?: any; form?: FormData } = {}) => {
    const headers: any = {};
    if (opts.role !== undefined) headers['x-test-role'] = String(opts.role);
    if (opts.id !== undefined) headers['x-test-id'] = String(opts.id);
    let body: any;
    if (opts.json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.json); }
    if (opts.form) body = opts.form;
    const r = await fetch(base + path, { method, headers, body });
    let data: any = null;
    try { data = await r.json(); } catch { /* */ }
    return { status: r.status, data };
  };
  const root = { role: 10 };
  const resetRep = () => { rep.posts.length = 0; rep.puts.length = 0; rep.postMode = 'ok'; };

  // ===== guard =====
  {
    const noUser = await call('GET', '/ops/report/100001');
    const client = await call('POST', '/ops/report/100001/regenerate', { role: 20, json: {} });
    const org = await call('GET', '/ops/report/100001', { role: 30 });
    const admin = await call('GET', '/ops/report/100001', { role: 40 });
    const su = await call('GET', '/ops/report/100001', root);
    check('O3 хэрэглэгчгүй / client / org / admin (OPS_ROLES=default) → 403; super → 200', [noUser.status, client.status, org.status, admin.status, su.status], [403, 403, 403, 403, 200]);
    check('O3b хаагдсан үед hire_report руу ХҮСЭЛТ ЯВААГҮЙ, аудит үлдээгүй', [rep.posts.length, db.actions.length], [0, 0]);
    process.env.OPS_ROLES = '10,40';
    const admin2 = await call('GET', '/ops/report/100001', { role: 40 });
    const tester = await call('GET', '/ops/report/100001', { role: 50 });
    delete process.env.OPS_ROLES;
    check('O3c OPS_ROLES=10,40 → admin 200, tester 403', [admin2.status, tester.status], [200, 403]);
  }

  // ===== status =====
  {
    db.results['100001'] = 3;
    addLog('100001', 'COMPLETED', { progress: 100 });
    const ok = await call('GET', '/ops/report/100001', root);
    const nof = await call('GET', '/ops/report/100002', root);
    check('O4 status: exam + сүүлийн log + result мөр + PDF файл (exists, size)', [ok.data.exam, ok.data.log.status, ok.data.resultRows, ok.data.file.exists, ok.data.file.size], [true, 'COMPLETED', 3, true, 4321]);
    check('O4b PDF байхгүй → file.exists=false', [nof.data.file.exists, nof.data.log], [false, null]);
    const bad = await Promise.all(['12', 'abcdefg', '1234567890123456789012'].map((c) => call('GET', `/ops/report/${c}`, root)));
    const ne = await call('POST', '/ops/report/999999/regenerate', { ...root, json: {} });
    check('O5 код буруу → 400; шалгалтгүй код → 404', [bad.map((x) => x.status), ne.status], [[400, 400, 400], 404]);
  }

  // ===== trigger =====
  {
    resetRep(); db.actions.length = 0;
    const r = await call('POST', '/ops/report/100001/recalculate', { ...root, id: 7, json: {} });
    check('O6 recalculate → hire_report: force+recalculate+role (log-оос), аудит ok', [r.status, rep.posts[0], db.actions[0]?.action, db.actions[0]?.status, db.actions[0]?.actorId, db.actions[0]?.code], [201, { code: '100001', role: 40, force: true, recalculate: true }, 'report.recalculate', 'ok', 7, '100001']);
    resetRep();
    await call('POST', '/ops/report/100001/regenerate', { ...root, json: { notify: true } });
    check('O7 regenerate → force, recalculate=false; notify дамжина', [rep.posts[0]], [{ code: '100001', role: 40, force: true, recalculate: false, notify: true }]);
  }

  // ===== retry =====
  {
    resetRep();
    const notFailed = await call('POST', '/ops/report/100001/retry', root);
    addLog('100002', 'FAILED', { progress: 30, error: 'x' });
    const failed = await call('POST', '/ops/report/100002/retry', root);
    check('O8 retry: FAILED биш → 409 (дуудлага явахгүй); FAILED → force:false-оор дамжина', [notFailed.status, failed.status, rep.posts.length, rep.posts[0]?.force], [409, 201, 1, false]);
  }

  // ===== in-flight =====
  {
    resetRep();
    addLog('100003', 'WRITING', { updatedAt: new Date() });
    const busy = await call('POST', '/ops/report/100003/regenerate', { ...root, json: {} });
    db.logs.find((l) => l.code === '100003')!.updatedAt = new Date(Date.now() - 11 * 60_000);
    const stale = await call('POST', '/ops/report/100003/regenerate', { ...root, json: {} });
    check('O9 идэвхтэй (шинэхэн WRITING) → 409, hire_report руу явахгүй; 10+ мин гацсан → зөвшөөрнө', [busy.status, stale.status, rep.posts.length], [409, 201, 1]);
  }

  // ===== hire_report алдаа =====
  {
    resetRep(); db.actions.length = 0;
    rep.postMode = '409';
    const c = await call('POST', '/ops/report/100001/regenerate', { ...root, json: {} });
    rep.postMode = '500';
    const e = await call('POST', '/ops/report/100001/regenerate', { ...root, json: {} });
    check('O10 hire_report 409 → 409, 500 → 502; аудитад failed', [c.status, e.status, db.actions.map((a) => a.status)], [409, 502, ['failed', 'failed']]);
    resetRep();
  }

  // ===== rate limit =====
  {
    process.env.OPS_RATE_PER_MIN = '3';
    db.actions.length = 0; resetRep();
    const rs: number[] = [];
    for (let i = 0; i < 5; i++) rs.push((await call('POST', '/ops/report/100001/regenerate', { ...root, id: 99, json: {} })).status);
    const other = await call('POST', '/ops/report/100001/regenerate', { ...root, id: 100, json: {} });
    check('O11 нэг actor минутад 3 → 4, 5-р нь 429; өөр actor-т нөлөөлөхгүй', [rs, other.status], [[201, 201, 201, 429, 429], 201]);
    process.env.OPS_RATE_PER_MIN = '1000';
  }

  // ===== PDF upload =====
  const form = (buf: Buffer | null, extra: Record<string, string> = {}) => {
    const f = new FormData();
    if (buf) f.append('file', new Blob([new Uint8Array(buf)], { type: 'application/pdf' }), 'x.pdf');
    for (const [k, v] of Object.entries(extra)) f.append(k, v);
    return f;
  };
  {
    resetRep(); db.actions.length = 0; fakeDao.updates.length = 0; fakeDao.created.length = 0;
    const good = pdf(2000);
    const sha = createHash('sha256').update(good).digest('hex');
    addLog('100004', 'FAILED', { progress: 30 });
    const r = await call('PUT', '/ops/report/100004/pdf', { ...root, form: form(good, { sha256: sha }) });
    const put = rep.puts[0];
    check('O12 зөв PDF → hire_report PUT report-100004.pdf (key, sha, application/pdf, бүтэн бие)', [r.status, put?.url, put?.key, put?.sha, put?.ct, put?.body?.equals(good)], [200, '/internal/files/report-100004.pdf', 'k-test', sha, 'application/pdf', true]);
    check('O12b report_logs FAILED → COMPLETED (progress 100), аудит ok', [fakeDao.updates[0]?.[1]?.status, fakeDao.updates[0]?.[1]?.progress, db.actions[0]?.action, db.actions[0]?.status], ['COMPLETED', 100, 'report.pdf.upload', 'ok']);

    addLog('100005', 'SENT', { progress: 100 });
    fakeDao.updates.length = 0;
    await call('PUT', '/ops/report/100005/pdf', { ...root, form: form(good) });
    check('O13 SENT тайлан → SENT хэвээр (мэйл дахин явахгүй)', fakeDao.updates[0]?.[1]?.status, 'SENT');
    await call('PUT', '/ops/report/100001/pdf', { ...root, form: form(good) });
    db.logs = db.logs.filter((l) => l.code !== '100001');
    fakeDao.created.length = 0;
    await call('PUT', '/ops/report/100001/pdf', { ...root, form: form(good) });
    check('O13b log мөр байхгүй → ops-manual-<code>-<ts> COMPLETED мөр үүснэ', [/^ops-manual-100001-\d+$/.test(fakeDao.created[0]?.id), fakeDao.created[0]?.status], [true, 'COMPLETED']);
  }
  {
    resetRep();
    const before = rep.puts.length;
    const notPdf = await call('PUT', '/ops/report/100004/pdf', { ...root, form: form(Buffer.alloc(900, 66)) });
    const trunc = await call('PUT', '/ops/report/100004/pdf', { ...root, form: form(pdf(900, 'xxxx')) });
    const badSha = await call('PUT', '/ops/report/100004/pdf', { ...root, form: form(pdf(900), { sha256: 'deadbeef' }) });
    const none = await call('PUT', '/ops/report/100004/pdf', { ...root, form: form(null) });
    const tiny = await call('PUT', '/ops/report/100004/pdf', { ...root, form: form(Buffer.from('%PDF-1\n%%EOF')) });
    const noExam = await call('PUT', '/ops/report/999999/pdf', { ...root, form: form(pdf()) });
    const badCode = await call('PUT', '/ops/report/12/pdf', { ...root, form: form(pdf()) });
    check('O14 PDF биш / %%EOF-гүй / sha таарахгүй / файлгүй / хэт жижиг → 400; шалгалтгүй → 404; код буруу → 400; hire_report руу ЯВААГҮЙ', [notPdf.status, trunc.status, badSha.status, none.status, tiny.status, noExam.status, badCode.status, rep.puts.length - before], [400, 400, 400, 400, 400, 404, 400, 0]);
    const big = await call('PUT', '/ops/report/100004/pdf', { ...root, form: form(pdf(21 * 1024 * 1024)) });
    check('O14b >20MB → 413 (multer), hire_report руу яваагүй', [big.status, rep.puts.length - before], [413, 0]);
    const noAuth = await call('PUT', '/ops/report/100004/pdf', { role: 20, form: form(pdf()) });
    check('O14c client role → 403', noAuth.status, 403);
    const k = process.env.INTERNAL_API_KEY; delete process.env.INTERNAL_API_KEY;
    const nokey = await call('PUT', '/ops/report/100004/pdf', { ...root, form: form(pdf()) });
    process.env.INTERNAL_API_KEY = k;
    check('O15 INTERNAL_API_KEY тохируулаагүй → 503', nokey.status, 503);
  }

  // ===== log =====
  {
    const l = await call('GET', '/ops/log?code=100004&limit=5', root);
    const all = await call('GET', '/ops/log', root);
    check('O16 GET /ops/log (code шүүлт) → зөвхөн тухайн код, нийт → ихийг', [l.data.every((x: any) => x.code === '100004'), all.data.length > l.data.length], [true, true]);
  }

  await app.close();
  reportSrv.close();
  say(failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} шалгалт унасан`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
