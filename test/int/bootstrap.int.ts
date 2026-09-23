/**
 * L2 — perf-bootstrap (DDL) жинхэнэ Postgres дээр:
 *   1) entity-үүдээс үүссэн хоосон схем дээр бүх statement АЛДААГҮЙ,
 *   2) дахин ажиллуулахад мөн алдаагүй (идемпотент),
 *   3) шинэ индекс / хүснэгтүүд бий, materialized view refresh хийгдэнэ.
 *
 * Ажиллуулах: `npm run test:int` (docker) эсвэл
 *   TEST_DATABASE_URL=postgres://… npx ts-node -P tsconfig.json -r tsconfig-paths/register test/int/bootstrap.int.ts
 */
import { PERF_BOOTSTRAP_STATEMENTS } from '../../src/database/sql/perf-bootstrap';
import { check, finish, makeDs } from './harness';

const runAll = async (ds: any) => {
  const failures: string[] = [];
  for (const s of PERF_BOOTSTRAP_STATEMENTS) {
    try {
      await ds.query(s);
    } catch (e: any) {
      failures.push(`${s.replace(/\s+/g, ' ').slice(0, 70)} → ${e?.message}`);
    }
  }
  return failures;
};

(async () => {
  const ds = await makeDs();
  const first = await runAll(ds);
  check('B1 хоосон схем дээр бүх bootstrap statement алдаагүй', first, []);
  const second = await runAll(ds);
  check('B2 дахин ажиллуулахад алдаагүй (идемпотент)', second, []);

  const idx = (await ds.query(`SELECT indexname FROM pg_indexes WHERE schemaname='public'`)).map((r: any) => r.indexname);
  const want = [
    'idx_report_logs_code_created',
    'idx_report_logs_status_updated',
    'idx_exam_userenddate',
    'idx_exam_createdat',
    'idx_error_logs_timestamp',
    'idx_ops_action_log_code',
    'idx_ops_action_log_actor',
    'idx_report_access_code',
    'idx_result_code',
  ];
  check('B3 шаардлагатай индексүүд бүгд бий', want.filter((i) => !idx.includes(i)), []);

  const tables = (await ds.query(`SELECT tablename FROM pg_tables WHERE schemaname='public'`)).map((r: any) => r.tablename);
  check('B4 ops_action_log / report_access / questionRule хүснэгтүүд бий', ['ops_action_log', 'report_access', 'questionRule'].filter((t) => !tables.includes(t)), []);

  const mv = await ds.query(`SELECT matviewname FROM pg_matviews WHERE schemaname='public'`);
  let refreshed = 'no-mv';
  if (mv.length) {
    try {
      await ds.query(`REFRESH MATERIALIZED VIEW ${mv[0].matviewname}`);
      refreshed = 'ok';
    } catch (e: any) {
      refreshed = e.message;
    }
  }
  check('B5 materialized view refresh хийгдэнэ', refreshed, 'ok');

  await ds.query('SET enable_seqscan = off');
  const plan = await ds.query(`EXPLAIN SELECT id FROM report_logs WHERE code = 'x' ORDER BY "createdAt" DESC LIMIT 1`);
  await ds.query('RESET enable_seqscan');
  check('B6 report_logs(code) хайлт шинэ индексийг ашиглана (seqscan идэвхгүй үед)', /idx_report_logs_code_created/.test(JSON.stringify(plan)), true);

  // №3: хуучин схем (categoryStarted* байхгүй) дээр bootstrap багануудыг нэмнэ; examDetail-ийн unique индекс boot-д ОРОХГҮЙ.
  await ds.query(`ALTER TABLE exam DROP COLUMN "categoryStartedAt", DROP COLUMN "categoryStartedFor"`);
  const beforeCols = (await ds.query(`SELECT column_name FROM information_schema.columns WHERE table_name='exam' AND column_name LIKE 'categoryStarted%'`)).length;
  const again = await runAll(ds);
  const afterCols = (await ds.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='exam' AND column_name LIKE 'categoryStarted%' ORDER BY column_name`));
  check('B7 хуучин схем дээр bootstrap exam.categoryStartedAt (timestamptz) / categoryStartedFor (integer)-г нэмнэ', [beforeCols, again, afterCols.map((c: any) => `${c.column_name}:${c.data_type}`)], [0, [], ['categoryStartedAt:timestamp with time zone', 'categoryStartedFor:integer']]);
  const uq = await ds.query(`SELECT 1 FROM pg_indexes WHERE indexname='uq_examdetail_exam_question'`);
  check('B8 examDetail unique индекс boot-д автоматаар үүсэхгүй (ops/shared/examdetail-unique.sql-ээр гараар)', uq.length, 0);

  await finish(ds)();
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
