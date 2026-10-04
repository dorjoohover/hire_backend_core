/**
 * v1.3.0 тайлангийн pipeline (DB / Redis-гүй, fake-аар): enqueueCalc, patchStatus,
 * sweep, readiness, sanitizeTimings, createReport-ийн чиглүүлэлт.
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/report-pipeline.spec-lite.ts
 */
import 'reflect-metadata';
import { ReportPipelineService, sanitizeTimings } from '../src/app/report/report-pipeline.service';
import { readiness } from '../src/app/report/report.service';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`);
};

const mkDs = (selectRows: any[] = []) => {
  const calls: { sql: string; params: any[] }[] = [];
  return {
    calls,
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      if (/^SELECT/i.test(sql.trim())) return selectRows;
      return [[], 1];
    },
  };
};
const mkQueue = () => {
  const jobs = new Map<string, { state: string; removed?: boolean }>();
  const added: any[] = [];
  return {
    jobs,
    added,
    getJob: async (id: string) => {
      const j = jobs.get(id);
      if (!j) return undefined;
      return { getState: async () => j.state, remove: async () => { j.removed = true; jobs.delete(id); } };
    },
    add: async (name: string, data: any, opts: any) => {
      added.push({ name, data, opts });
      jobs.set(opts.jobId, { state: 'waiting' });
      return { id: opts.jobId };
    },
    upsertJobScheduler: async () => undefined,
  };
};

(async () => {
  process.env.REPORT_PIPELINE = 'v2';
  // ---- enqueueCalc
  {
    const ds = mkDs();
    const q = mkQueue();
    const svc = new ReportPipelineService(ds as any, q as any, mkQueue() as any);
    check('P1 enabled (REPORT_PIPELINE=v2)', svc.enabled(), true);
    const r1 = await svc.enqueueCalc({ code: '123456', role: 40, examFinishedAt: 5 });
    check('P2 upsert + jobId calc-<code>, priority-гүй (хэрэглэгч → хамгийн өндөр)', [
      r1, /INSERT INTO report_logs/.test(ds.calls[0].sql), ds.calls[0].params, q.added[0].opts.jobId, 'priority' in q.added[0].opts, q.added[0].data.logId,
    ], [{ logId: 'v2-123456', jobId: 'calc-123456', queued: true }, true, ['v2-123456', '123456', 40, true], 'calc-123456', false, 'v2-123456']);
    const r2 = await svc.enqueueCalc({ code: '123456' });
    check('P3 queue-д байгаа (waiting) → давхар оруулахгүй', [r2.queued, (r2 as any).state, q.added.length], [false, 'waiting', 1]);
    q.jobs.set('calc-123456', { state: 'failed' });
    const r3 = await svc.enqueueCalc({ code: '123456', priority: 10, recalculate: true, resetSweeps: false });
    check('P4 failed job → устгаад дахин; ops priority 10, recalculate, sweeps хадгална', [
      r3.queued, q.added.length, q.added[1].opts.priority, q.added[1].data.recalculate, ds.calls[ds.calls.length - 1].params[3],
    ], [true, 2, 10, true, false]);
    let threw = '';
    try { await svc.enqueueCalc({ code: "1'; drop" }); } catch (e: any) { threw = e?.constructor?.name; }
    check('P5 буруу код → BadRequest', threw, 'BadRequestException');
  }
  // ---- patchStatus
  {
    const ds = mkDs();
    const svc = new ReportPipelineService(ds as any, mkQueue() as any, mkQueue() as any);
    await svc.patchStatus({ logId: 'v2-1', status: 'COMPLETED', progress: 140, error: null, timings: { render_ms: 12.6, bad: 'x' as any, 'BAD-KEY': 1 } });
    const p = ds.calls[0].params;
    check('P6 patch: progress 0..100, error null, timings шүүгдэнэ', [p[0], p[1], p[2], p[3], JSON.parse(p[4])], ['v2-1', 'COMPLETED', 100, null, { render_ms: 13 }]);
    await svc.patchStatus({ code: '77', timings: {} });
    check('P7 logId-гүй → v2-<code>, error хэвээр (__keep__)', [ds.calls[1].params[0], ds.calls[1].params[3]], ['v2-77', '__keep__']);
    let threw = '';
    try { await svc.patchStatus({ logId: 'v2-1', status: 'HACKED' }); } catch (e: any) { threw = e?.constructor?.name; }
    check('P8 буруу төлөв → BadRequest', threw, 'BadRequestException');
  }
  // ---- sweep
  {
    const ds = mkDs([{ id: 'v2-9', code: '9', role: 40, status: 'WRITING', sweeps: 1 }]);
    const q = mkQueue();
    const svc = new ReportPipelineService(ds as any, q as any, mkQueue() as any);
    const r = await svc.sweep();
    const sel = ds.calls[0];
    check('P9 sweep: v2 + sweeps<3 + гацсан/FAILED сонгоно', [/pipeline = 'v2'/.test(sel.sql), sel.params[0], sel.params[2]], [true, 3, 15]);
    check('P9b sweep: [permanent] алдааг алгасна', [/strpos\(error, \$4\) = 0/.test(sel.sql), sel.params[3]], [true, '[permanent]']);
    check('P10 sweep: sweeps++ → enqueue (priority 10, sweeps хадгална)', [
      r, /sweeps = sweeps \+ 1/.test(ds.calls[1].sql), q.added[0].opts.priority, ds.calls[2].params[3],
    ], [{ requeued: 1 }, true, 10, false]);
    process.env.REPORT_PIPELINE = '';
    check('P11 pipeline унтраалттай → sweep юу ч хийхгүй', await svc.sweep(), { requeued: 0 });
    process.env.REPORT_PIPELINE = 'v2';
  }
  // ---- readiness / sanitizeTimings
  check('P12 readiness', [
    readiness({ status: 'CALCULATING', progress: 10 }),
    readiness({ status: 'WRITING', progress: 30 }),
    readiness({ status: 'WRITING', progress: 40 }),
    readiness({ status: 'FAILED', progress: 50 }),
    readiness({ status: 'COMPLETED', progress: 100 }),
    readiness({ status: 'SENT', progress: 100 }),
  ].map((x) => [x.resultReady, x.pdfReady]), [[false, false], [true, false], [true, false], [false, false], [true, true], [true, true]]);
  check('P13 sanitizeTimings', sanitizeTimings({ a_ms: 1.4, b: NaN, c: Infinity, d: '5' as any, e_ms: 2 }), { a_ms: 1, e_ms: 2 });

  if (failed) {
    console.log(`\n❌ ${failed} шалгалт унасан`);
    process.exit(1);
  }
  console.log('\n✅ БҮГД АМЖИЛТТАЙ');
})();
