/**
 * Тестийг "Хувилах" (copy) ба JSON bundle-ээр өөр орчин руу зөөх (export → import) —
 * жинхэнэ Postgres дээр: бүх хүснэгт хуулагдсан, ID-ууд шинээр холбогдсон, эх тест
 * өөрчлөгдөөгүй, {{question[<id>]}} token / skip-дүрэм / томьёо шинэ ID-тай,
 * алдаа гарвал transaction бүхэлдээ буцна.
 *
 *   TEST_DATABASE_URL=… npx ts-node -P tsconfig.json -r tsconfig-paths/register test/int/assessment-transfer.int.ts
 */
import { DataSource } from 'typeorm';
import { PERF_BOOTSTRAP_STATEMENTS } from '../../src/database/sql/perf-bootstrap';
import { AssessmentTransferService } from '../../src/app/assessment-transfer/assessment-transfer.service';
import { AssessmentEntity } from '../../src/app/assessment/entities/assessment.entity';
import { LevelEntity } from '../../src/app/assessment/entities/assessment.level.entity';
import { AssessmentFormulaEntity } from '../../src/app/assessment/entities/assessment.formule.entity';
import { AssessmentCategoryEntity } from '../../src/app/assessment.category/entities/assessment.category.entity';
import { FormulaEntity } from '../../src/app/formule/formule.entity';
import { QuestionCategoryEntity } from '../../src/app/question/entities/question.category.entity';
import { QuestionEntity } from '../../src/app/question/entities/question.entity';
import { QuestionAnswerEntity } from '../../src/app/question/entities/question.answer.entity';
import { QuestionAnswerMatrixEntity } from '../../src/app/question/entities/question.answer.matrix.entity';
import { QuestionAnswerCategoryEntity } from '../../src/app/question/entities/question.answer.category.entity';
import { QuestionRuleEntity } from '../../src/app/question/entities/question.rule.entity';
import { PdfTemplateEntity } from '../../src/app/pdf-template/entities/pdf-template.entity';
import { AssessmentVariableEntity } from '../../src/app/pdf-template/entities/assessment-variable.entity';
import { AssessmentAiDataEntity } from '../../src/app/pdf-template/entities/assessment-ai-data.entity';
import { check, finish, makeDs, say } from './harness';

// Файлын санг санах ойд дуурайна (local uploads / S3-ийн оронд)
const fakeFiles = (initial: Record<string, string> = {}) => {
  const store = new Map(Object.entries(initial).map(([k, v]) => [k, Buffer.from(v)]));
  return {
    store,
    async readBytes(key: string) { return store.get(key) ?? null; },
    async exists(key: string) { return store.has(key); },
    async upload(key: string, _ct: string, body: Buffer) { store.set(key, Buffer.from(body)); return key; },
  };
};
const noView = { refresh() {} };

const ins = async (ds: DataSource, e: any, row: any): Promise<number> =>
  (await ds.getRepository(e).insert(row)).identifiers[0].id;

async function seed(ds: DataSource) {
  for (const s of PERF_BOOTSTRAP_STATEMENTS) {
    try { await ds.query(s); } catch { /* PGlite-д зарим индекс/extension дэмжигдэхгүй — энэ тестэд хамаагүй */ }
  }
  await ds.query(`INSERT INTO users (id, email, role, "emailVerified") VALUES (1, 'admin@t.mn', 40, true)`);
  const cat = await ins(ds, AssessmentCategoryEntity, { name: 'Зан төлөв', createdUser: 1 });
  const lvl = await ins(ds, LevelEntity, { name: 'Дунд', description: 'd' });
  const f0 = await ins(ds, FormulaEntity, { name: 'нийт', formula: 'a+b', variables: [1, 2] as any, sort: true, aggregations: [{ field: 'point', operation: 'SUM' }] });
  const a = await ins(ds, AssessmentEntity, {
    name: 'СЭМҮТ', description: '<p><img src="https://api.hire-test.cloud/api/v1/file/1700_cover.png"></p>', usage: 'u', measure: 'm',
    price: 5000, duration: 30, questionCount: 3, type: 10, createdUser: 1, status: 10, report: 300, formule: f0,
    icons: '1700_icon.png', reportPrice: 9900, reportFreeViews: 1, partialScore: true,
    category: { id: cat }, level: { id: lvl },
  });
  const acP = await ins(ds, QuestionAnswerCategoryEntity, { name: 'Сэтгэл түгшил', assessment: { id: a } });
  const acC = await ins(ds, QuestionAnswerCategoryEntity, { name: 'Түгшил-1', parent: { id: acP }, assessment: { id: a } });
  const acM = await ins(ds, QuestionAnswerCategoryEntity, { name: 'Багана', assessment: { id: a } });
  const qc1 = await ins(ds, QuestionCategoryEntity, { name: 'Бүлэг 1', questionCount: 2, status: 10, createdUser: 1, orderNumber: 1, assessment: { id: a }, totalPoint: 12 });
  const qc2 = await ins(ds, QuestionCategoryEntity, { name: 'Бүлэг 2', questionCount: 1, status: 10, createdUser: 1, orderNumber: 2, assessment: { id: a } });
  const q1 = await ins(ds, QuestionEntity, { name: 'Асуулт 1 <img src="/api/file/1701_q.png">', type: 10, status: 10, orderNumber: 1, createdUser: 1, category: { id: qc1 }, settings: { unit: 'мин', decimal: 1 } });
  const q2 = await ins(ds, QuestionEntity, { name: 'Асуулт 2', type: 40, status: 10, orderNumber: 2, createdUser: 1, category: { id: qc1 }, file: '1702_q2.jpg' });
  const q3 = await ins(ds, QuestionEntity, { name: 'Асуулт 3', type: 10, status: 10, orderNumber: 1, createdUser: 1, category: { id: qc2 } });
  const a11 = await ins(ds, QuestionAnswerEntity, { value: 'Тийм', point: 1, orderNumber: 1, question: { id: q1 }, category: { id: acC } });
  const a12 = await ins(ds, QuestionAnswerEntity, { value: 'Үгүй', point: 0, orderNumber: 2, question: { id: q1 }, category: { id: acC }, reverse: true });
  const a21 = await ins(ds, QuestionAnswerEntity, { value: 'Мөр', point: 0, orderNumber: 1, question: { id: q2 }, category: { id: acP } });
  await ins(ds, QuestionAnswerEntity, { value: 'x', point: 2, orderNumber: 1, question: { id: q3 } });
  await ins(ds, QuestionAnswerMatrixEntity, { value: 'Багана 1', point: 3, orderNumber: 1, question: { id: q2 }, answer: { id: a21 }, category: { id: acM } });
  const fR = await ins(ds, FormulaEntity, { name: 'дэд', formula: 'x', sort: true, aggregations: [] as any });
  const fK = await ins(ds, FormulaEntity, { name: 'дэд-хүүхэд', formula: 'y', sort: true, aggregations: [] as any });
  const afRoot = await ins(ds, AssessmentFormulaEntity, { type: 1, assessment: { id: a }, formule: { id: fR }, question_category: { id: qc1 } });
  await ins(ds, AssessmentFormulaEntity, { type: 2, assessment: { id: a }, formule: { id: fK }, parent: { id: afRoot }, question_category: { id: qc2 } });
  await ins(ds, QuestionRuleEntity, { targetQuestionId: q3, dependsOnQuestionId: q1, dependsOnAnswerId: a12, action: 'skip', active: true });
  await ins(ds, PdfTemplateEntity, {
    name: 'СЭМҮТ загвар', assessmentId: a, isActive: true,
    pages: [{ id: 'p1', name: 'Нүүр', blocks: [
      { id: 'b1', type: 'text', content: 'Оноо: {{question[' + q1 + '].point}}' },
      { id: 'b2', type: 'image', imageUrl: 'https://api.hire-test.cloud/api/v1/pdf-template/image/pt_1_logo.png' },
    ] }],
  });
  await ins(ds, AssessmentVariableEntity, { assessmentId: a, key: 'total', kind: 'formula', rules: { expression: '{{question[' + q1 + '].point}} * 2', decimals: 0 } });
  await ins(ds, AssessmentAiDataEntity, { assessmentId: a, data: { note: 'q={{question[' + q2 + '].answer}}' } });
  return { a, cat, lvl, f0, q1, q2, q3, a12 };
}

// Тестийн "агуулгын хурууны хээ" — ID-гүйгээр (хуулбар эхтэйгээ ижил байх ёстой)
async function fingerprint(ds: DataSource, id: number) {
  const q = (sql: string) => ds.query(sql, [id]);
  return {
    qc: (await q(`SELECT name, "questionCount", "orderNumber", "totalPoint"::float AS tp FROM "questionCategory" WHERE "assessmentId"=$1 ORDER BY "orderNumber"`)),
    q: (await q(`SELECT q.name, q.type, q.file, q.settings, qc.name AS qc FROM question q JOIN "questionCategory" qc ON qc.id=q."categoryId" WHERE qc."assessmentId"=$1 ORDER BY qc."orderNumber", q."orderNumber"`)),
    a: (await q(`SELECT qa.value, qa.point::float AS p, qa.reverse, c.name AS cat, pc.name AS parent FROM "questionAnswer" qa JOIN question q ON q.id=qa."questionId" JOIN "questionCategory" qc ON qc.id=q."categoryId" LEFT JOIN "questionAnswerCategory" c ON c.id=qa."categoryId" LEFT JOIN "questionAnswerCategory" pc ON pc.id=c."parentId" WHERE qc."assessmentId"=$1 ORDER BY qc."orderNumber", q."orderNumber", qa."orderNumber"`)),
    m: (await q(`SELECT m.value, m.point::float AS p, c.name AS cat, qa.value AS row FROM "questionAnswerMatrix" m JOIN question q ON q.id=m."questionId" JOIN "questionCategory" qc ON qc.id=q."categoryId" LEFT JOIN "questionAnswerCategory" c ON c.id=m."categoryId" LEFT JOIN "questionAnswer" qa ON qa.id=m."answerId" WHERE qc."assessmentId"=$1`)),
    af: (await q(`SELECT af.type, f.name AS f, f.formula, qc.name AS qc, pf.name AS parent FROM assessment_formulas af LEFT JOIN formule f ON f.id=af."formuleId" LEFT JOIN "questionCategory" qc ON qc.id=af."questionCategoryId" LEFT JOIN assessment_formulas p ON p.id=af."parentId" LEFT JOIN formule pf ON pf.id=p."formuleId" WHERE af."assessmentId"=$1 ORDER BY af.type`)),
    rules: (await q(`SELECT t.name AS target, d.name AS dep, qa.value AS ans FROM "questionRule" r JOIN question t ON t.id=r."targetQuestionId" JOIN question d ON d.id=r."dependsOnQuestionId" LEFT JOIN "questionAnswer" qa ON qa.id=r."dependsOnAnswerId" JOIN "questionCategory" qc ON qc.id=t."categoryId" WHERE qc."assessmentId"=$1`)),
  };
}

// Admin / web хариултыг mv_question_answer_full-аас уншдаг — хуулбарын хариулт ТЭНД харагдах ёстой.
async function viewVsTable(ds: DataSource, id: number) {
  const ids = `SELECT q.id FROM question q JOIN "questionCategory" qc ON qc.id=q."categoryId" WHERE qc."assessmentId"=$1`;
  const mv = Number((await ds.query(`SELECT count(DISTINCT id) AS n FROM mv_question_answer_full WHERE "questionId" IN (${ids})`, [id]))[0].n);
  const tbl = Number((await ds.query(`SELECT count(*) AS n FROM "questionAnswer" WHERE "questionId" IN (${ids})`, [id]))[0].n);
  return [mv, tbl];
}

(async () => {
  let ds = await makeDs();
  const src = await seed(ds);
  const files = fakeFiles({ '1700_cover.png': 'C', '1700_icon.png': 'I', '1701_q.png': 'Q', 'pt_1_logo.png': 'L' }); // 1702_q2.jpg — эх орчинд алга
  let svc = new AssessmentTransferService(ds, files as any, noView as any);
  const before = await fingerprint(ds, src.a);

  // ---------------- C: Хувилах (нэг орчин дотор)
  const copyId = await svc.copy(src.a, 1);
  const copy = await ds.getRepository(AssessmentEntity).findOne({ where: { id: copyId }, loadRelationIds: { relations: ['category', 'level'], disableMixedMap: false } }) as any;
  check('C1 шинэ нэр, Архив төлөв, үүсгэгч', [copy.name, copy.status, copy.createdUser], ['СЭМҮТ copy', 20, 1]);
  check('C2 тохиргоо хуулагдсан (report, paywall, partialScore, icons, ангилал, түвшин)',
    [copy.report, copy.reportPrice, copy.reportFreeViews, copy.partialScore, copy.icons, copy.category, copy.level],
    [300, 9900, 1, true, '1700_icon.png', src.cat, src.lvl]);
  check('C3 assessment.formule ШИНЭ мөр (агуулга ижил)', await (async () => {
    const f = await ds.getRepository(FormulaEntity).findOne({ where: { id: copy.formule } });
    return [copy.formule !== src.f0, f?.formula, f?.variables, f?.aggregations];
  })(), [true, 'a+b', ['1', '2'], [{ field: 'point', operation: 'SUM' }]]);
  check('C0 хуулбарын хариулт admin-ийн уншдаг харагдацад (mv_question_answer_full) шууд харагдана', await viewVsTable(ds, copyId), [4, 4]);
  const after = await fingerprint(ds, copyId);
  check('C4 бүлэг/асуулт/хариулт/матриц/томьёо/skip-дүрэм эхтэйгээ ижил (ID-гүй харьцуулалт)', after, before);
  check('C5 эх тест өөрчлөгдөөгүй (хариулт "хулгайлагдаагүй")', await fingerprint(ds, src.a), before);
  check('C6 хариултын ангилал зөвхөн шинэ тестийнх (эхийнхийг заахгүй)', Number((await ds.query(
    `SELECT count(*) AS n FROM "questionAnswer" qa JOIN question q ON q.id=qa."questionId" JOIN "questionCategory" qc ON qc.id=q."categoryId"
     JOIN "questionAnswerCategory" c ON c.id=qa."categoryId" WHERE qc."assessmentId"=$1 AND c."assessmentId"<>$1`, [copyId]))[0].n), 0);
  const newQ1 = (await ds.query(`SELECT q.id FROM question q JOIN "questionCategory" qc ON qc.id=q."categoryId" WHERE qc."assessmentId"=$1 AND q.name LIKE 'Асуулт 1%'`, [copyId]))[0].id;
  const newQ2 = (await ds.query(`SELECT q.id FROM question q JOIN "questionCategory" qc ON qc.id=q."categoryId" WHERE qc."assessmentId"=$1 AND q.name='Асуулт 2'`, [copyId]))[0].id;
  const tpl = await ds.getRepository(PdfTemplateEntity).findOne({ where: { assessmentId: copyId } });
  check('C7 Studio загвар: question[id] шинэ ID, зураг, isActive', [tpl?.pages?.[0]?.blocks?.[0]?.content, tpl?.pages?.[0]?.blocks?.[1]?.imageUrl, tpl?.isActive],
    [`Оноо: {{question[${newQ1}].point}}`, 'https://api.hire-test.cloud/api/v1/pdf-template/image/pt_1_logo.png', true]);
  const v = await ds.getRepository(AssessmentVariableEntity).findOne({ where: { assessmentId: copyId } });
  const ai = await ds.getRepository(AssessmentAiDataEntity).findOne({ where: { assessmentId: copyId } });
  check('C8 хувьсагч + AI дата: token шинэ ID', [v?.key, v?.rules?.expression, ai?.data?.note], ['total', `{{question[${newQ1}].point}} * 2`, `q={{question[${newQ2}].answer}}`]);
  check('C9 дахин хувилахад "copy 2" (хуучин "Duplicated" алдаа биш)', (await ds.getRepository(AssessmentEntity).findOne({ where: { id: await svc.copy(src.a, 1) } }))?.name, 'СЭМҮТ copy 2');
  check('C10 хуулбарыг хувилж болно', (await ds.getRepository(AssessmentEntity).findOne({ where: { id: await svc.copy(copyId, 1) } }))?.name, 'СЭМҮТ copy copy');

  // ---------------- E: Export (файлтай)
  const bundle = JSON.parse(JSON.stringify(await svc.exportBundle(src.a)));
  check('E1 файлууд bundle-д (HTML, icons, Studio зураг); олдоогүй нь missingFiles-д',
    [bundle.files.map((f: any) => f.key), bundle.missingFiles],
    [['1700_cover.png', '1700_icon.png', '1701_q.png', 'pt_1_logo.png'], ['1702_q2.jpg']]);
  check('E2 тоо', [bundle.questionCategories.length, bundle.questions.length, bundle.answers.length, bundle.matrix.length, bundle.answerCategories.length, bundle.assessmentFormulas.length, bundle.rules.length, bundle.pdfTemplates.length, bundle.variables.length, !!bundle.aiData],
    [2, 3, 4, 1, 3, 2, 1, 1, 1, true]);
  check('E3 эх орчны хэрэглэгч / огноо bundle-д ороогүй', ['createdUser', 'updatedUser', 'createdAt', 'updatedAt', 'id'].filter((k) => k in bundle.assessment.fields), []);

  // ---------------- I: Өөр орчин (prod) руу import — шинэ хоосон DB, ангиллын ID өөр
  await ds.destroy();
  ds = await makeDs();
  for (const s of PERF_BOOTSTRAP_STATEMENTS) { try { await ds.query(s); } catch { /* */ } }
  await ds.query(`INSERT INTO users (id, email, role, "emailVerified") VALUES (7, 'prod@t.mn', 10, true)`);
  await ins(ds, AssessmentCategoryEntity, { name: 'Өөр ангилал', createdUser: 7 });
  const prodCat = await ins(ds, AssessmentCategoryEntity, { name: 'Зан төлөв', createdUser: 7 }); // ижил нэр, өөр ID
  const prodFiles = fakeFiles({ '1700_icon.png': 'already' });
  svc = new AssessmentTransferService(ds, prodFiles as any, noView as any);
  const res = await svc.importBundle(bundle, 7);
  const imp = await ds.getRepository(AssessmentEntity).findOne({ where: { id: res.id }, loadRelationIds: { relations: ['category', 'level'], disableMixedMap: false } }) as any;
  check('I1 нэр, Архив, prod хэрэглэгч, ангилал нэрээр олдсон, түвшин алга',
    [imp.name, imp.status, imp.createdUser, imp.category, imp.level], ['СЭМҮТ', 20, 7, prodCat, null]);
  check('I2 агуулга эх тесттэй ижил', await fingerprint(ds, res.id), before);
  check('I2b оруулсан тестийн хариулт харагдацад шууд харагдана', await viewVsTable(ds, res.id), [4, 4]);
  check('I3 файл: 3 бичигдсэн, 1 аль хэдийн байсан (дарж бичээгүй)', [res.files.written, res.files.existing, prodFiles.store.get('1700_icon.png')?.toString(), prodFiles.store.get('pt_1_logo.png')?.toString()], [3, 1, 'already', 'L']);
  check('I4 анхааруулга: түвшин алга + олдоогүй файл', [res.warnings.some((w) => /Түвшин "Дунд"/.test(w)), res.warnings.some((w) => /1702_q2\.jpg/.test(w))], [true, true]);
  const res2 = await svc.importBundle(JSON.parse(JSON.stringify(bundle)), 7);
  check('I5 дахин оруулахад "(import)" нэртэй ШИНЭ тест', [res2.name, res2.id !== res.id], ['СЭМҮТ (import)', true]);

  // ---------------- R: алдаа → бүх зүйл буцна
  // PGlite (socket) нь transaction доторх алдааны дараа хааяа хоосон хариу өгдөг — жинхэнэ Postgres-д үгүй.
  const count = async () => {
    for (let i = 0; i < 5; i++) {
      const r = await ds.query(`SELECT count(*) AS n FROM assessment`);
      if (r?.[0]) return Number(r[0].n);
      await new Promise((ok) => setTimeout(ok, 100));
    }
    return NaN;
  };
  const n0 = await count();
  const broken = JSON.parse(JSON.stringify(bundle));
  broken.questions[2].fields.type = 'энэ тоо биш';
  let err = '';
  try { await svc.importBundle(broken, 7); } catch (e: any) { err = e?.message ?? String(e); }
  check('R1 DB алдаа → 400 + transaction буцаж, хагас тест үлдээгүй', [/юу ч хадгалагдаагүй/.test(err), await count()], [true, n0]);
  let st: any = '';
  try { await svc.importBundle({ hello: 'world' }, 7); } catch (e: any) { st = e?.getStatus?.(); }
  check('R2 буруу файл → 400', st, 400);
  const v2 = JSON.parse(JSON.stringify(bundle));
  v2.assessment.fields.someFutureColumn = 1;
  const res3 = await svc.importBundle(v2, 7);
  check('R3 шинэ хувилбарын үл мэдэгдэх талбар → алгасаж анхааруулна', res3.warnings.some((w) => /assessment\.someFutureColumn/.test(w)), true);

  say(`ℹ️  import stats: ${JSON.stringify(res.stats)}`);
  await finish(ds)();
})().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
