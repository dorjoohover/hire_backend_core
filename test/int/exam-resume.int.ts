/**
 * №3 — дундаас нь үргэлжлүүлэх: жинхэнэ Postgres дээр
 *   D1–D3  examDetail давхардал (createManyIfAbsent, ops/shared/examdetail-unique.sql)
 *   Q1–Q3  тогтвортой shuffle (QuestionDao.findByCategory seed)
 *   E1–E7  public QR-ийн дахин ашиглах дүрэм (ExamDao.findByServiceAndContact)
 *   T1–T2  хэсгийн хугацааны серверийн эхлэл (setCategoryStart)
 *
 *   TEST_DATABASE_URL=… npx ts-node -P tsconfig.json -r tsconfig-paths/register test/int/exam-resume.int.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { PERF_BOOTSTRAP_STATEMENTS } from '../../src/database/sql/perf-bootstrap';
import { ExamDetailDao } from '../../src/app/exam/dao/exam.detail.dao';
import { ExamDao } from '../../src/app/exam/dao/exam.dao';
import { QuestionDao } from '../../src/app/question/dao/question.dao';
import { QuestionEntity } from '../../src/app/question/entities/question.entity';
import { QuestionStatus } from '../../src/base/constants';
import { check, finish, makeDs, say } from './harness';

// ops/shared нь core repo-оос ГАДНА (Hire root-ын sibling). Core-only checkout (GitHub CI) дээр файл байхгүй →
// ижил утгатай inline SQL-ээр үргэлжилнэ (файлын агуулгыг зөвхөн бүтэн Hire root дээр шалгана).
const INLINE_SQL: Record<string, string> = {
  dedupe: `DELETE FROM "examDetail" a USING "examDetail" b
           WHERE a."examId" = b."examId" AND a."questionId" = b."questionId" AND a.id > b.id
             AND a."examId" BETWEEN :lo AND :hi`,
  index: `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_examdetail_exam_question ON "examDetail" ("examId", "questionId")`,
};
const sqlBlock = (file: string, tag: string) => {
  if (!fs.existsSync(file)) {
    say(`⚠️  ${path.basename(file)} олдсонгүй (core-only checkout) — "${tag}" блокыг inline SQL-ээр орлуулав`);
    return INLINE_SQL[tag];
  }
  const s = fs.readFileSync(file, 'utf8');
  const m = s.match(new RegExp(`-- @${tag}:begin\\n([\\s\\S]*?)-- @${tag}:end`));
  if (!m) throw new Error(`${file}: @${tag} блок олдсонгүй`);
  return m[1].trim().replace(/;$/, '');
};

(async () => {
  const ds = await makeDs();
  for (const s of PERF_BOOTSTRAP_STATEMENTS) await ds.query(s);
  // FK-ийн дагалдах мөр (assessment, question, ...) үүсгэхгүйн тулд (нэг холболт тул session-д үлдэнэ).
  await ds.query(`SET session_replication_role = replica`);

  // ---------------- D: examDetail ----------------
  const dd = new ExamDetailDao(ds);
  const rows = (exam: number, qs: number[]) =>
    qs.map((q) => ({ exam, question: q, questionCategory: 7, questionCategoryName: 'A', service: 1 }));
  const count = async (exam: number) =>
    Number((await ds.query(`SELECT count(*)::int AS n FROM "examDetail" WHERE "examId" = $1`, [exam]))[0].n);

  check('D1 эхний нээлт: 5 мөр нэмэгдэнэ', await dd.createManyIfAbsent(rows(1, [1, 2, 3, 4, 5])), 5);
  check('D2 ИЖИЛ нээлт дахин (reload / bootstrap-ийн 2-р дуудлага): 0 нэмэгдэнэ, нийт 5', [await dd.createManyIfAbsent(rows(1, [1, 2, 3, 4, 5])), await count(1)], [0, 5]);
  check('D3 батч доторх давхардал + байгаа нь: зөвхөн шинэ (6) 1 мөр', [await dd.createManyIfAbsent(rows(1, [6, 6, 3])), await count(1)], [1, 6]);
  check('D4 өөр exam-д ижил асуулт хамаарахгүй', [await dd.createManyIfAbsent(rows(2, [1, 2])), await count(2)], [2, 2]);
  check('D5 хоосон жагсаалт → 0', await dd.createManyIfAbsent([]), 0);

  // ops/shared/examdetail-unique.sql: хуучин давхардал → dedupe → unique индекс
  await ds.query(`INSERT INTO "examDetail" ("examId","questionId","questionCategoryId","questionCategoryName","serviceId")
                  SELECT "examId","questionId","questionCategoryId","questionCategoryName","serviceId" FROM "examDetail" WHERE "examId" = 1`);
  check('D6 (prod-ийн хуучин байдал) давхардал бий: 12 мөр / 6 өвөрмөц', [await count(1), Number((await ds.query(`SELECT count(DISTINCT "questionId")::int n FROM "examDetail" WHERE "examId"=1`))[0].n)], [12, 6]);
  const sqlFile = path.join(__dirname, '../../../ops/shared/examdetail-unique.sql');
  await ds.query(sqlBlock(sqlFile, 'dedupe').replace(/:lo/g, '0').replace(/:hi/g, '2147483647'));
  check('D7 dedupe SQL: давхардал үлдсэнгүй (6 мөр), хамгийн бага id үлдсэн', [await count(1), Number((await ds.query(`SELECT max(id)::int n FROM "examDetail" WHERE "examId"=1`))[0].n) <= 6], [6, true]);
  await ds.query(sqlBlock(sqlFile, 'index'));
  const idx = await ds.query(`SELECT i.indisvalid AS valid FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname='uq_examdetail_exam_question'`);
  check('D8 UNIQUE индекс үүсэж valid', idx.map((r: any) => r.valid), [true]);
  let dupErr = '';
  try {
    await ds.query(`INSERT INTO "examDetail" ("examId","questionId","questionCategoryId","serviceId") VALUES (1,1,7,1)`);
  } catch (e: any) { dupErr = e.code ?? String(e.message).slice(0, 40); }
  check('D9 индекстэй бол шууд давхар INSERT татгалзагдана (23505)', dupErr, '23505');
  check('D10 индекстэй үед createManyIfAbsent: 0 нэмэгдэнэ, алдаагүй (ON CONFLICT DO NOTHING)', [await dd.createManyIfAbsent(rows(1, [1, 2])), await count(1)], [0, 6]);
  // race: байгаа эсэхийн шалгалтыг тойрсон шууд INSERT ... ON CONFLICT DO NOTHING
  await ds.query(`INSERT INTO "examDetail" ("examId","questionId","questionCategoryId","serviceId") VALUES (1,1,7,1) ON CONFLICT DO NOTHING`);
  check('D11 ON CONFLICT DO NOTHING (зэрэгцээ хүсэлт) → давхардал үүсэхгүй', await count(1), 6);

  // ---------------- Q: тогтвортой shuffle ----------------
  const qdao = new QuestionDao(ds);
  const qrepo = ds.getRepository(QuestionEntity);
  for (let i = 1; i <= 12; i++) {
    await ds.query(
      `INSERT INTO question (name, type, "categoryId", status, "orderNumber") VALUES ($1, 10, 555, $2, $3)`,
      [`Q${i}`, QuestionStatus.ACTIVE, i],
    );
  }
  void qrepo;
  const ids = async (limit: number | null, shuffle: boolean, seed?: string) =>
    (await qdao.findByCategory(limit, shuffle, 555, [], seed)).map((q) => q.id);
  const a1 = await ids(5, true, 'code-111:c555');
  const a2 = await ids(5, true, 'code-111:c555');
  const b1 = await ids(5, true, 'code-222:c555');
  check('Q1 ижил seed → ИЖИЛ 5 асуулт, ИЖИЛ дараалал (reload-д өөрчлөгдөхгүй)', a1, a2);
  check('Q2 limit=5 → 5 өвөрмөц асуулт', [a1.length, new Set(a1).size], [5, 5]);
  check('Q3 өөр seed (өөр шалгуулагч) → өөр сонголт/дараалал (12 асуултаас 5)', JSON.stringify(a1) !== JSON.stringify(b1), true);
  const all = await ids(null, true, 'code-111:c555');
  check('Q4 limit=null → бүх 12, seed-ийн эрэмбээр', [all.length, new Set(all).size, all.slice(0, 5)], [12, 12, a1]);
  const plain = await ids(null, false);
  check('Q5 shuffle=false → id-аар (seed үл хамаарна)', plain, [...plain].sort((x, y) => x - y));

  // ---------------- E: public QR дахин ашиглах ----------------
  const eDao = new ExamDao(ds, null as any);
  const mk = (code: string, svc: number, o: { phone?: string; email?: string; ago: string; end?: boolean }) =>
    ds.query(
      `INSERT INTO exam (code, "serviceId", phone, email, "assessmentName", "createdAt", "userEndDate")
       VALUES ($1, $2, $3, $4, 'DISC', now() - interval '${o.ago}', ${o.end ? `now() - interval '${o.ago}' + interval '5 minutes'` : 'NULL'})`,
      [code, svc, o.phone ?? null, o.email ?? null],
    );
  await mk('200001', 9, { phone: '99001122', ago: '3 days' });                       // дуусаагүй, 3 хоног
  await mk('200002', 9, { phone: '88001122', ago: '10 days' });                      // дуусаагүй, 10 хоног → хугацаа хэтэрсэн
  await mk('200003', 9, { phone: '77001122', ago: '2 hours', end: true });           // дууссан, 2 цаг
  await mk('200004', 9, { phone: '66001122', ago: '2 days', end: true });            // дууссан, 2 хоног → шинээр
  await mk('200005', 9, { email: 'a@b.mn', ago: '30 hours' });                       // дуусаагүй 30 цаг (өмнө нь 24ц-ээс хэтэрч давхар квот зарцуулдаг байсан)
  await mk('200006', 8, { phone: '99001122', ago: '1 day' });                        // өөр service
  await mk('200007', 9, { phone: '55001122', ago: '5 days', end: true });
  await mk('200008', 9, { phone: '55001122', ago: '1 hour' });                       // ижил хүн: дуусаагүй шинэ + дууссан хуучин

  check('E1 дуусаагүй, 3 хоног → үргэлжлүүлнэ', await eDao.findByServiceAndContact(9, null, '99001122'), { code: '200001', finished: false });
  check('E2 дуусаагүй боловч 10 хоног → шинэ exam', await eDao.findByServiceAndContact(9, null, '88001122'), null);
  check('E3 дууссан, 2 цаг → {finished:true} (квот дахин зарцуулахгүй)', await eDao.findByServiceAndContact(9, null, '77001122'), { code: '200003', finished: true });
  check('E4 дууссан, 2 хоног → шинэ exam', await eDao.findByServiceAndContact(9, null, '66001122'), null);
  check('E5 и-мэйлээр, дуусаагүй 30 цаг → үргэлжлүүлнэ (хуучин 24ц дүрмээр давхар exam үүсдэг байсан)', await eDao.findByServiceAndContact(9, 'A@B.mn', null), { code: '200005', finished: false });
  check('E6 өөр service-ийн exam хамаарахгүй; email/phone аль нь ч байхгүй → null', [await eDao.findByServiceAndContact(8, null, '11111111'), await eDao.findByServiceAndContact(9, null, null)], [null, null]);
  check('E7 ижил хүнд дуусаагүй + дууссан хоёул бол ДУУСААГҮЙ нь давуу', await eDao.findByServiceAndContact(9, null, '55001122'), { code: '200008', finished: false });

  // ---------------- T: хэсгийн хугацаа ----------------
  const ex = await ds.query(`SELECT id FROM exam WHERE code = '200001'`);
  const t0 = new Date('2026-09-20T10:00:00.000Z');
  await eDao.setCategoryStart(ex[0].id, 42, t0);
  const back = await ds.query(`SELECT "categoryStartedAt" AS at, "categoryStartedFor" AS f FROM exam WHERE id = $1`, [ex[0].id]);
  check('T1 setCategoryStart: цаг (UTC-ээр) ба хэсэг хадгалагдана', [new Date(back[0].at).toISOString(), back[0].f], [t0.toISOString(), 42]);
  const viaOrm = await ds.getRepository('ExamEntity' as any).findOne({ where: { code: '200001' } as any });
  check('T2 ExamEntity-ээр уншихад categoryStartedAt/For мөн ирнэ', [new Date((viaOrm as any).categoryStartedAt).toISOString(), (viaOrm as any).categoryStartedFor], [t0.toISOString(), 42]);

  say('');
  await finish(ds)();
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
