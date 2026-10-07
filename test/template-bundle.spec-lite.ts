// ts-node --transpile-only test/template-bundle.spec-lite.ts
// Studio загварыг дангаар нь зөөх — асуулт / хариултын ангиллыг тааруулах цэвэр функцууд.
import {
  matchAnswerCategories,
  matchQuestions,
  normText,
  questionIdsIn,
  questionSigs,
  templateNameCandidates,
  assertTemplateBundle,
} from '../src/app/assessment-transfer/template-bundle';

let failed = 0;
const check = (name: string, got: any, want: any) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(got)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(want)})`}`);
};

check('T1 question[id] цуглуулах (объект, массив, зай)', [...questionIdsIn({ a: 'x {{question[12].point}} {{ question [ 7 ].answer}}', b: ['question[12]', { c: 'question[3].name' }] })], [12, 7, 3]);
check('T2 normText', normText('<p>Түгшиж&nbsp; байна  УУ?</p>'), 'түгшиж байна уу?');
const rows = [
  { id: 1, type: 10, name: 'A', categoryId: 10, categoryName: 'HADS' },
  { id: 2, type: 10, name: 'B', categoryId: 10, categoryName: 'HADS' },
  { id: 3, type: 80, name: 'C', categoryId: 20, categoryName: 'ISI' },
];
check('T3 гарын үсэг (бүлэг, асуултын дугаар)', questionSigs(rows).map((q) => [q.id, q.categoryIndex, q.questionIndex]), [[1, 1, 1], [2, 1, 2], [3, 2, 1]]);

const src = questionSigs([
  { id: 101, type: 10, name: 'Түгшиж байна уу?', categoryId: 1, categoryName: 'HADS' },
  { id: 102, type: 10, name: 'Тийм', categoryId: 1, categoryName: 'HADS' },
  { id: 103, type: 10, name: 'Тийм', categoryId: 2, categoryName: 'DASS' },
  { id: 104, type: 80, name: 'Хуучин текст', categoryId: 3, categoryName: 'ISI' },
  { id: 105, type: 80, name: 'Алга болсон', categoryId: 3, categoryName: 'ISI' },
]);
const tgt = questionSigs([
  { id: 201, type: 10, name: '<p>Түгшиж  байна уу?</p>', categoryId: 7, categoryName: 'HADS' },
  { id: 202, type: 10, name: 'Тийм', categoryId: 7, categoryName: 'HADS' },
  { id: 203, type: 10, name: 'Тийм', categoryId: 8, categoryName: 'DASS' },
  { id: 204, type: 80, name: 'Шинэ текст', categoryId: 9, categoryName: 'ISI' },
  { id: 205, type: 10, name: 'Өөр төрөл', categoryId: 9, categoryName: 'ISI' },
]);
const m = matchQuestions(src, tgt);
check('T4 бүлэг+текст / давхардсан текстийг бүлгээр / байрлал+төрөл', [...m.map.entries()].sort((a, b) => a[0] - b[0]), [[101, 201], [102, 202], [103, 203], [104, 204]]);
check('T5 төрөл өөр бол байрлалаар тааруулахгүй', m.unmatched.map((q) => q.id), [105]);
check('T6 хэрхэн', m.how, { name: 3, text: 0, position: 1 });
const m2 = matchQuestions(
  questionSigs([{ id: 1, type: 10, name: 'Ганц', categoryId: 1, categoryName: 'Хуучин бүлэг' }]),
  questionSigs([{ id: 9, type: 10, name: 'Ганц', categoryId: 5, categoryName: 'Шинэ нэр' }]),
);
check('T7 бүлгийн нэр өөрчлөгдсөн ч текст ганц бол', [[...m2.map.entries()], m2.how.text], [[[1, 9]], 1]);
check('T8 хариултын ангилал нэрээр, давхцвал эцгээр',
  [...matchAnswerCategories(
    [{ id: 1, name: 'Түгшил', parentName: null }, { id: 2, name: 'Нийт', parentName: 'A' }, { id: 3, name: 'Алга', parentName: null }],
    [{ id: 11, name: 'түгшил', parentName: null }, { id: 12, name: 'Нийт', parentName: 'A' }, { id: 13, name: 'Нийт', parentName: 'B' }],
  ).entries()],
  [[1, 11], [2, 12]]);
check('T9 нэрийн хувилбарууд', templateNameCandidates('Тайлан', 4), ['Тайлан', 'Тайлан (import)', 'Тайлан (import 2)', 'Тайлан (import 3)']);
const bad = (b: any) => { try { assertTemplateBundle(b); return 'OK'; } catch (e: any) { return e.message; } };
check('T10 шалгалт', [
  bad(null),
  bad({ format: 'x' }),
  bad({ format: 'hire-template-bundle', version: 2 }),
  bad({ format: 'hire-template-bundle', version: 1, template: { fields: { pages: [] } }, variables: [{ fields: {} }] }),
  bad({ format: 'hire-template-bundle', version: 1, template: { fields: { pages: [] } }, files: [{ key: '../x', base64: '' }] }),
  bad({ format: 'hire-template-bundle', version: 1, template: { fields: { pages: [] } } }),
], [
  'JSON файл хоосон эсвэл буруу байна.',
  'Энэ файл Studio загварын экспорт биш байна.',
  'Файлын хувилбар (2) энэ серверт дэмжигдэхгүй — эхлээд серверээ шинэчилнэ үү.',
  'Хувьсагчийн key дутуу байна.',
  'Файл буруу: ../x',
  'OK',
]);
console.log(failed ? `\n❌ ${failed} шалгалт унасан` : '\n✅ БҮГД АМЖИЛТТАЙ');
process.exit(failed ? 1 : 0);
