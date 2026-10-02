/**
 * userAnswer create — өөр хэсгийн асуултын (дахин илгээсэн) хариулт, NaN id (DB / HTTP-гүй).
 *
 *   npx ts-node --transpile-only -P tsconfig.json -r tsconfig-paths/register test/user-answer-sections.spec-lite.ts
 *
 * Хуучин web өмнөх хэсгийн тоо/хугацааны хариултыг ({answer, point, value}) дараагийн
 * хэсгийн ангиллаар, matrix болгож дахин илгээдэг байсан:
 *   matrix = [8071, 8072, 300, NaN, …] → Postgres "invalid input syntax for type integer: NaN" → 500.
 */
import { UserAnswerService } from '../src/app/user.answer/user.answer.service';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}${ok ? '' : `\n   got ${JSON.stringify(actual)}\n   exp ${JSON.stringify(expected)}`}`);
};

const intOnly = (label: string, ids: number[]) => {
  // Postgres integer[]-ийн адил: бүхэл бус утга бол query унана.
  if (ids.some((x) => !Number.isInteger(x))) throw new Error(`${label}: invalid input syntax for type integer: "NaN"`);
};

async function run() {
  const calls: any = { deleted: null, inserted: null, updated: null, matrixIds: null };
  const questions = [
    { id: 101, type: 90, minValue: 0, maxValue: 7, settings: null, categoryId: 1 },
    { id: 102, type: 100, minValue: 0, maxValue: 960, settings: null, categoryId: 1 },
    { id: 201, type: 90, minValue: 0, maxValue: 7, settings: null, categoryId: 2 },
    { id: 202, type: 100, minValue: 0, maxValue: 960, settings: null, categoryId: 2 },
  ];
  const svc = new (UserAnswerService as any)(
    {
      findExistingByCode: async () => [
        { id: 1, questionId: 101, answerId: 8071, matrixId: null },
        { id: 2, questionId: 102, answerId: 8072, matrixId: null },
      ],
      deleteByIds: async (ids: number[]) => (calls.deleted = ids),
      bulkInsert: async (b: any[]) => ((calls.inserted = b.map((x) => ({ q: +x.question, answer: x.answer, matrix: x.matrix, point: x.point, value: x.value, cat: x.questionCategory }))), []),
      bulkUpdatePoints: async (u: any[]) => (calls.updated = u.map((x) => ({ id: x.id, point: x.point }))),
    },
    { findMinMaxByIds: async (ids: number[]) => (intOnly('question', ids), questions.filter((q) => ids.includes(q.id))) },
    { findByCodeOnly: async () => ({ id: 9, visible: true }) },
    {},
    { findMetaByIds: async (ids: number[]) => (intOnly('answer', ids), ids.filter((i) => i >= 8071 && i <= 8074).map((id) => ({ id, reverse: false, negative: false, correct: false, categoryId: 5, point: 0 }))) },
    {},
    { findMetaByIds: async (ids: number[]) => ((calls.matrixIds = ids), intOnly('matrix', ids), []) },
    { findIsCalculatedByIds: async (ids: number[]) => ids.map((id) => ({ id, is_calculated: true })) },
    {},
  );
  const base = { flag: false, code: 'C1', correct: false };
  // Хуучин web-ийн payload: 101/102 (1-р хэсэг) нь 2-р хэсгийн ангиллаар, matrix болж эвдэрсэн.
  const legacy = (q: number, id: number, point: number, value: string) => ({
    ...base, question: q, questionCategory: 2,
    answers: [
      { answer: 'answer', point: null, matrix: id },
      { answer: 'point', point: null, matrix: point },
      { answer: 'value', point: null, matrix: value },
    ],
  });
  const good = (q: number, id: number, point: number, value: string) => ({
    ...base, question: q, questionCategory: 2, answers: [{ answer: id, point, matrix: null, value }],
  });
  let err: any = null;
  try {
    await svc.create({ data: [legacy(101, 8071, 3, '3'), legacy(102, 8072, 300, '05:00'), good(201, 8073, 2, '2'), good(202, 8074, 180, '03:00')], startDate: new Date() }, '1.1.1.1', 'test');
  } catch (e: any) {
    err = e?.message || String(e);
  }
  check('алдаагүй (500 биш)', err, null);
  check('matrix lookup-д NaN орохгүй', (calls.matrixIds || []).every((x: number) => Number.isInteger(x)), true);
  check('1-р хэсгийн зөв мөрүүд устахгүй', calls.deleted, []);
  check('зөвхөн 2-р хэсгийн хариулт бичигдэнэ', calls.inserted, [
    { q: 201, answer: 8073, matrix: null, point: 2, value: '2', cat: 2 },
    { q: 202, answer: 8074, matrix: null, point: 180, value: '03:00', cat: 2 },
  ]);

  console.log(failed ? `\n❌ ${failed} failed` : '\n✅ all passed');
  process.exit(failed ? 1 : 0);
}
run();
