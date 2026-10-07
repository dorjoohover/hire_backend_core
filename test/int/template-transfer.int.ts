/**
 * Studio загварыг ДАНГААР нь орчин хооронд зөөх (pdf-template/:id/export → pdf-template/import)
 * — жинхэнэ Postgres дээр. "prod" тестийг assessment bundle-ээр хуулж (ID-ууд өөр) үүсгээд
 * эх тестийн загварыг тэнд оруулна: {{question[id]}} token, wheel тэнхлэг, хувьсагч, зураг,
 * нэр, идэвхжүүлэлт, тааралдаагүй асуулт, буруу файл.
 *
 *   TEST_DATABASE_URL=… npx ts-node -P tsconfig.json -r tsconfig-paths/register test/int/template-transfer.int.ts
 */
import { DataSource } from 'typeorm';
import { PERF_BOOTSTRAP_STATEMENTS } from '../../src/database/sql/perf-bootstrap';
import { AssessmentTransferService } from '../../src/app/assessment-transfer/assessment-transfer.service';
import { TemplateTransferService } from '../../src/app/pdf-template/template-transfer.service';
import { AssessmentEntity } from '../../src/app/assessment/entities/assessment.entity';
import { QuestionCategoryEntity } from '../../src/app/question/entities/question.category.entity';
import { QuestionEntity } from '../../src/app/question/entities/question.entity';
import { QuestionAnswerEntity } from '../../src/app/question/entities/question.answer.entity';
import { QuestionAnswerCategoryEntity } from '../../src/app/question/entities/question.answer.category.entity';
import { PdfTemplateEntity } from '../../src/app/pdf-template/entities/pdf-template.entity';
import { AssessmentVariableEntity } from '../../src/app/pdf-template/entities/assessment-variable.entity';
import { check, finish, makeDs, say } from './harness';

const fakeFiles = (initial: Record<string, string> = {}) => {
  const store = new Map(Object.entries(initial).map(([k, v]) => [k, Buffer.from(v)]));
  return {
    store,
    async readBytes(key: string) { return store.get(key) ?? null; },
    async exists(key: string) { return store.has(key); },
    async upload(key: string, _ct: string, body: Buffer) { store.set(key, Buffer.from(body)); return key; },
  };
};
const ins = async (ds: DataSource, e: any, row: any): Promise<number> =>
  (await ds.getRepository(e).insert(row)).identifiers[0].id;

async function seed(ds: DataSource) {
  for (const s of PERF_BOOTSTRAP_STATEMENTS) {
    try { await ds.query(s); } catch { /* энэ тестэд хамаагүй */ }
  }
  await ds.query(`INSERT INTO users (id, email, role, "emailVerified") VALUES (1, 'admin@t.mn', 40, true)`);
  const a = await ins(ds, AssessmentEntity, { name: 'СЭМҮТ', description: 'd', usage: 'u', measure: 'm', price: 0, duration: 30, questionCount: 3, type: 10, createdUser: 1, status: 10, report: 300 });
  const acA = await ins(ds, QuestionAnswerCategoryEntity, { name: 'Сэтгэл түгшил', assessment: { id: a } });
  const acB = await ins(ds, QuestionAnswerCategoryEntity, { name: 'Нойргүйдэл', assessment: { id: a } });
  const qc1 = await ins(ds, QuestionCategoryEntity, { name: 'HADS', questionCount: 2, status: 10, createdUser: 1, orderNumber: 1, assessment: { id: a } });
  const qc2 = await ins(ds, QuestionCategoryEntity, { name: 'ISI', questionCount: 2, status: 10, createdUser: 1, orderNumber: 2, assessment: { id: a } });
  const q1 = await ins(ds, QuestionEntity, { name: '<p>Түгшиж байна уу?</p>', type: 10, status: 10, orderNumber: 1, createdUser: 1, category: { id: qc1 } });
  const q2 = await ins(ds, QuestionEntity, { name: 'Санаа зовдог уу?', type: 10, status: 10, orderNumber: 2, createdUser: 1, category: { id: qc1 } });
  const q3 = await ins(ds, QuestionEntity, { name: 'Унтатлаа удаан уу?', type: 80, status: 10, orderNumber: 1, createdUser: 1, category: { id: qc2 } });
  const q4 = await ins(ds, QuestionEntity, { name: 'Шөнө сэрдэг үү?', type: 80, status: 10, orderNumber: 2, createdUser: 1, category: { id: qc2 } });
  for (const [q, c] of [[q1, acA], [q2, acA], [q3, acB], [q4, acB]]) {
    await ins(ds, QuestionAnswerEntity, { value: 'x', point: 1, orderNumber: 1, question: { id: q }, category: { id: c } });
  }
  return { a, acA, acB, q1, q2, q3, q4 };
}

(async () => {
  const ds = await makeDs();
  const s = await seed(ds);
  const files = fakeFiles({ 'pt_1_logo.png': 'LOGO', 'pt_2_bg.png': 'BG' });
  // "prod" = эх тестийн хуулбар (бүх ID өөр). Дараа нь prod-д нэг асуултын текстийг засна.
  const prodId = await new AssessmentTransferService(ds, files as any, { refresh() {} } as any).copy(s.a, 1);
  await ds.query(`DELETE FROM pdf_template WHERE "assessmentId" = $1`, [prodId]);
  await ds.query(`DELETE FROM assessment_variable WHERE "assessmentId" = $1`, [prodId]);
  const pq = async (name: string) =>
    Number((await ds.query(`SELECT q.id FROM question q JOIN "questionCategory" c ON c.id=q."categoryId" WHERE c."assessmentId"=$1 AND q.name=$2`, [prodId, name]))[0]?.id);
  const p1 = await pq('<p>Түгшиж байна уу?</p>');
  const p2 = await pq('Санаа зовдог уу?');
  const p3 = await pq('Унтатлаа удаан уу?');
  // q4-ийн текстийг prod-д өөрчилнө → байрлалаар (ISI бүлгийн 2-р асуулт, ижил төрөл) таарах ёстой.
  await ds.query(`UPDATE question SET name = 'Шөнө сэрдэг үү? (засвар)' WHERE id = $1`, [await pq('Шөнө сэрдэг үү?')]);
  const p4 = await pq('Шөнө сэрдэг үү? (засвар)');
  const prodAcA = Number((await ds.query(`SELECT id FROM "questionAnswerCategory" WHERE "assessmentId"=$1 AND name='Сэтгэл түгшил'`, [prodId]))[0].id);
  check('0 prod-ийн асуултын ID эхийнхээс өөр', [p1 !== s.q1, p2 !== s.q2, p3 !== s.q3, p4 !== s.q4], [true, true, true, true]);

  // Эх тестийн загвар (+ өөр нэг хуучин загвар) ба хувьсагчид
  const tplId = await ins(ds, PdfTemplateEntity, {
    name: 'СЭМҮТ тайлан', assessmentId: s.a, isActive: true, fontFamily: 'Gilroy', fontSize: 12,
    pages: [{ id: 'p1', name: 'Нүүр', blocks: [
      { id: 'b1', type: 'text', content: 'HADS: {{question[' + s.q1 + '].point}} + {{question[' + s.q2 + '].point}} {{category[1].score}}' },
      { id: 'b2', type: 'image', imageUrl: 'https://api.hire-test.cloud/api/v1/pdf-template/image/pt_1_logo.png' },
      { id: 'b3', type: 'wheel-radar', wheel: { axes: [{ id: s.acA, name: 'Сэтгэл түгшил' }, { id: 424242, name: 'Алга' }] } },
      { id: 'b4', type: 'chips', chips: { items: '{{custom.isi}}\n{{question[' + s.q4 + '].answer}}' } },
      { id: 'b5', type: 'text', content: 'Мэдэгдэхгүй {{question[999999].point}}' },
    ] }],
    demoData: { bg: 'https://x/api/v1/pdf-template/image/pt_2_bg.png' },
  });
  await ins(ds, AssessmentVariableEntity, { assessmentId: s.a, key: 'isi', label: 'Нойргүйдэл', kind: 'formula', rules: { expression: '{{question[' + s.q3 + '].point}} + {{question[' + s.q4 + '].point}}', decimals: 0 } });
  await ins(ds, AssessmentVariableEntity, { assessmentId: s.a, key: 'lvl', kind: 'map', entries: { a: 'A' } });

  const svc = new TemplateTransferService(ds, files as any);
  const bundle = JSON.parse(JSON.stringify(await svc.exportTemplate(tplId)));
  check('E1 формат, эх', [bundle.format, bundle.version, bundle.source.templateName, bundle.source.assessmentName], ['hire-template-bundle', 1, 'СЭМҮТ тайлан', 'СЭМҮТ']);
  check('E2 загварт ID / assessmentId / isActive байхгүй', ['id', 'assessmentId', 'isActive', 'createdAt'].filter((k) => k in bundle.template.fields), []);
  check('E3 заасан асуултууд (999999 эх тестэд байхгүй)', bundle.questions.map((q: any) => q.id).sort((x: number, y: number) => x - y), [s.q1, s.q2, s.q3, s.q4]);
  check('E4 асуултын гарын үсэг', bundle.questions.find((q: any) => q.id === s.q4), { id: s.q4, type: 80, name: 'Шөнө сэрдэг үү?', categoryName: 'ISI', categoryIndex: 2, questionIndex: 2 });
  check('E5 зураг (загвар + demoData)', bundle.files.map((f: any) => f.key), ['pt_1_logo.png', 'pt_2_bg.png']);
  check('E6 хувьсагчид', bundle.variables.map((v: any) => v.fields.key), ['isi', 'lvl']);

  // ---- prod руу оруулах (файлгүй "prod" файлын сан)
  const prodFiles = fakeFiles({ 'pt_2_bg.png': 'OLD' });
  const prodSvc = new TemplateTransferService(ds, prodFiles as any);
  const r1 = await prodSvc.importTemplate({ bundle, assessmentId: prodId });
  const t1 = await ds.getRepository(PdfTemplateEntity).findOne({ where: { id: r1.id } });
  const blocks = (t1!.pages as any)[0].blocks;
  check('I1 шинэ загвар prod тест дээр, идэвхгүй, нэр ижил', [t1!.assessmentId, t1!.isActive, t1!.name], [prodId, false, 'СЭМҮТ тайлан']);
  check('I2 текстийн question token prod ID руу', blocks[0].content, `HADS: {{question[${p1}].point}} + {{question[${p2}].point}} {{category[1].score}}`);
  check('I3 текстээ өөрчилсөн асуулт байрлалаар таарсан', blocks[3].chips.items, `{{custom.isi}}\n{{question[${p4}].answer}}`);
  check('I4 wheel тэнхлэг нэрээр prod ангилал руу (олдоогүй нь хэвээр)', blocks[2].wheel.axes.map((a: any) => a.id), [prodAcA, 424242]);
  check('I5 тааруулалтын тайлан', [r1.questions.referenced, r1.questions.matched, r1.questions.how], [4, 4, { name: 3, text: 0, position: 1 }]);
  check('I6 байрлалаар таарсан тухай анхааруулга', r1.warnings.some((w) => w.includes('БАЙРЛАЛААР')), true);
  check('I7 эх тестэд байгаагүй ID хэвээр + анхааруулга', [blocks[4].content.includes('999999'), r1.warnings.some((w) => w.includes('999999'))], [true, true]);
  const v1 = await ds.getRepository(AssessmentVariableEntity).find({ where: { assessmentId: prodId }, order: { key: 'ASC' } });
  check('I8 хувьсагчид үүссэн, томьёоны token prod ID-тай', [v1.map((v) => v.key), v1[0].rules?.expression, r1.variables], [['isi', 'lvl'], `{{question[${p3}].point}} + {{question[${p4}].point}}`, { created: 2, updated: 0, skipped: 0 }]);
  check('I9 зураг: байхгүй нь бичигдсэн, байгаа нь дарж бичигдээгүй', [prodFiles.store.get('pt_1_logo.png')?.toString(), prodFiles.store.get('pt_2_bg.png')?.toString(), r1.files], ['LOGO', 'OLD', { written: 1, existing: 1, skipped: [] }]);
  check('I10 эх загвар өөрчлөгдөөгүй', (await ds.getRepository(PdfTemplateEntity).findOne({ where: { id: tplId } }))!.pages[0].blocks[0].content.includes(`question[${s.q1}]`), true);

  // ---- Дахин оруулах: нэр давхцахгүй, идэвхжүүлэх, хувьсагч "зөвхөн байхгүйг"
  await ds.query(`UPDATE assessment_variable SET label = 'prod нэр' WHERE "assessmentId"=$1 AND key='isi'`, [prodId]);
  const r2 = await prodSvc.importTemplate({ bundle, assessmentId: prodId, activate: true, variables: 'missing' });
  const act = await ds.query(`SELECT id FROM pdf_template WHERE "assessmentId"=$1 AND "isActive"`, [prodId]);
  check('R1 нэр "(import)", идэвхтэй нь ганц шинэ загвар', [r2.name, act.map((x: any) => x.id)], ['СЭМҮТ тайлан (import)', [r2.id]]);
  check('R2 "missing" — байгаа хувьсагч хөндөгдөөгүй', [r2.variables, (await ds.getRepository(AssessmentVariableEntity).findOne({ where: { assessmentId: prodId, key: 'isi' } }))?.label], [{ created: 0, updated: 0, skipped: 2 }, 'prod нэр']);
  const r3 = await prodSvc.importTemplate({ bundle, assessmentId: prodId, variables: 'upsert' });
  check('R3 "upsert" — шинэчилсэн, нэр "(import 2)", идэвхтэй хэвээр өмнөх', [r3.variables, (await ds.getRepository(AssessmentVariableEntity).findOne({ where: { assessmentId: prodId, key: 'isi' } }))?.label, r3.name, (await ds.query(`SELECT id FROM pdf_template WHERE "assessmentId"=$1 AND "isActive"`, [prodId])).map((x: any) => x.id)], [{ created: 0, updated: 2, skipped: 0 }, 'Нойргүйдэл', 'СЭМҮТ тайлан (import 2)', [r2.id]]);

  // ---- Алдаа
  const err = async (body: any) => { try { await prodSvc.importTemplate(body); return 'OK'; } catch (e: any) { return e?.message; } };
  check('X1 бүтэн тестийн bundle', await err({ bundle: { format: 'hire-assessment-bundle', version: 1 }, assessmentId: prodId }), 'Энэ файл бүтэн тестийн экспорт байна — admin-ий "JSON-оос оруулах"-аар оруулна уу.');
  check('X2 тест сонгоогүй', await err({ bundle }), 'Тест сонгоно уу.');
  check('X3 байхгүй тест', await err({ bundle, assessmentId: 987654 }), 'Сонгосон тест энэ орчинд олдсонгүй.');
  const n = Number((await ds.query(`SELECT count(*) n FROM pdf_template`))[0].n);
  check('X4 алдаа гарвал загвар нэмэгдээгүй', await err({ bundle: { ...bundle, template: { fields: {} } }, assessmentId: prodId }), 'Загварын хуудсууд (pages) алга.');
  check('X5 тоо хэвээр', Number((await ds.query(`SELECT count(*) n FROM pdf_template`))[0].n), n);
  say('');
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .then(() => finish()());
