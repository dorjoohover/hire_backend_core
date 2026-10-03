/**
 * Тест (assessment)-ийн JSON bundle — DB-гүй туслах функцууд:
 * question[<id>] token-ий хөрвүүлэлт, файлын түлхүүр цуглуулах, нэр сонгох,
 * bundle-ийн бүтэц / ref шалгалт, эцэг-хүүхдийн эрэмбэ.
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/assessment-bundle.spec-lite.ts
 */
import {
  BUNDLE_FORMAT,
  assertBundle,
  fileKeyFromField,
  fileKeysInText,
  isSafeFileKey,
  nameCandidates,
  orderByParent,
  remapQuestionTokens,
} from '../src/app/assessment-transfer/assessment-bundle';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`,
  );
};
const throws = (fn: () => any): string => {
  try {
    fn();
    return 'OK';
  } catch (e: any) {
    return e?.message ?? String(e);
  }
};

// ---------- T: {{question[<id>]}} token
const qMap = new Map([[2656, 9001], [12, 9002]]);
const unknown = new Set<number>();
check(
  'T1 текст доторх token-ууд шинэ ID болно (зай, олон удаа)',
  remapQuestionTokens('{{question[2656].point}} * {{ question[ 12 ].answer }} + {{question[2656].point}}', qMap),
  '{{question[9001].point}} * {{ question[ 9002 ].answer }} + {{question[9001].point}}',
);
check(
  'T2 гүн объект / массив (Studio pages) — бусад утга хэвээр',
  remapQuestionTokens({ pages: [{ blocks: [{ content: 'x {{question[12].answer}}', x: 5, ok: true, n: null }] }] }, qMap),
  { pages: [{ blocks: [{ content: 'x {{question[9002].answer}}', x: 5, ok: true, n: null }] }] },
);
check(
  'T3 map-д байхгүй ID хэвээр + unknown-д бүртгэгдэнэ',
  [remapQuestionTokens('{{question[777].point}}', qMap, unknown), [...unknown]],
  ['{{question[777].point}}', [777]],
);
check('T4 category[1] / answerCategory[2] (индекс) хөндөгдөхгүй',
  remapQuestionTokens('{{category[1].name}} {{answerCategory[12].avg}}', qMap),
  '{{category[1].name}} {{answerCategory[12].avg}}');

// ---------- F: файлын түлхүүр
const keys = new Set<string>();
fileKeysInText(
  '<p><img src="https://api.hire-test.cloud/api/v1/file/1712_%D0%B7%D1%83%D1%80%D0%B0%D0%B3.png"> <img src="/api/file/1713_b.jpg"></p>',
  keys,
);
fileKeysInText('{"imageUrl":"https://api.hire.mn/api/v1/pdf-template/image/pt_1_logo.png"}', keys);
fileKeysInText('<img src="/api/file/..%2F..%2Fetc%2Fpasswd">', keys);
fileKeyFromField('1714_icon.png', keys);
fileKeyFromField('https://www.youtube.com/watch?v=abc', keys);
fileKeyFromField('plain text without ext', keys);
check('F1 HTML/JSON/талбараас түлхүүр (decode), traversal ба гадаад URL орохгүй', [...keys].sort(), [
  '1712_зураг.png',
  '1713_b.jpg',
  '1714_icon.png',
  'pt_1_logo.png',
]);
const pk = new Set<string>();
fileKeysInText('{"imageUrl":"http://hire-core-1:5000/api/v1/pdf-template/image/pt_1790607712501_unnamed%20(2).png"}', pk);
fileKeysInText('<div style="background:url(/api/file/1715_bg.png)"></div> <img src="/api/file/1716_x%20(1).jpg">', pk);
check('F1b нэрэнд "(2)" байгаа зураг бүтнээрээ; CSS url(…)-ийн ")" хасагдана', [...pk].sort(), [
  '1715_bg.png',
  '1716_x (1).jpg',
  'pt_1790607712501_unnamed (2).png',
]);
check('F2 isSafeFileKey', ['a.png', '../a', 'a/b.png', '.env', ''].map(isSafeFileKey), [true, false, false, false, false]);

// ---------- N: нэр
check('N1 import: эхлээд өөрийн нэр, дараа нь (import), (import 2)', nameCandidates('DISC', 'import', 4), [
  'DISC',
  'DISC (import)',
  'DISC (import 2)',
  'DISC (import 3)',
]);
check('N2 copy: "X copy", "X copy 2"', nameCandidates('DISC', 'copy', 3), ['DISC copy', 'DISC copy 2', 'DISC copy 3']);

// ---------- B: bundle шалгалт
const base = () => ({
  format: BUNDLE_FORMAT,
  version: 1,
  exportedAt: '',
  source: { assessmentId: 1, name: 'A' },
  assessment: { fields: { name: 'A' }, category: null, level: null, formule: null },
  answerCategories: [{ ref: 5, parentRef: null, fields: { name: 'p' } }, { ref: 6, parentRef: 5, fields: { name: 'c' } }],
  questionCategories: [{ ref: 10, fields: { name: 'b' } }],
  questions: [{ ref: 20, categoryRef: 10, fields: {} }],
  answers: [{ ref: 30, questionRef: 20, categoryRef: 6, fields: {} }],
  matrix: [{ ref: 40, questionRef: 20, answerRef: 30, categoryRef: null, fields: {} }],
  assessmentFormulas: [],
  rules: [],
  pdfTemplates: [],
  variables: [],
  aiData: null,
  files: [],
  missingFiles: [],
});
check('B1 зөв bundle', throws(() => assertBundle(base())), 'OK');
check('B2 өөр JSON', throws(() => assertBundle({ hello: 1 })), 'Энэ файл Hire-ийн тестийн экспорт (assessment bundle) биш байна.');
check('B3 шинэ хувилбар', /дэмжигдэхгүй/.test(throws(() => assertBundle({ ...base(), version: 99 }))), true);
check('B4 асуулт байхгүй бүлэг заасан', throws(() => assertBundle({ ...base(), questions: [{ ref: 20, categoryRef: 99, fields: {} }] })), 'Асуулт 20: бүлэг олдсонгүй.');
check('B5 хариулт байхгүй ангилал заасан', throws(() => assertBundle({ ...base(), answers: [{ ref: 30, questionRef: 20, categoryRef: 77, fields: {} }] })), 'Хариулт 30: ангилал олдсонгүй.');
check('B6 давхар ref', /давхардсан/.test(throws(() => assertBundle({ ...base(), questions: [{ ref: 20, categoryRef: 10, fields: {} }, { ref: 20, categoryRef: 10, fields: {} }] }))), true);
check('B7 аюултай файлын түлхүүр', /Файл буруу/.test(throws(() => assertBundle({ ...base(), files: [{ key: '../x', contentType: 'a', base64: '' }] }))), true);
check('B8 дутуу массивыг [] болгож хүлээн авна', (() => { const b: any = base(); delete b.rules; delete b.missingFiles; assertBundle(b); return [b.rules, b.missingFiles]; })(), [[], []]);

// ---------- O: эцэг түрүүлж
check('O1 хүүхэд эцгээсээ өмнө ирсэн ч эцэг түрүүлнэ',
  orderByParent([{ ref: 3, parentRef: 2 }, { ref: 2, parentRef: 1 }, { ref: 1, parentRef: null }]).map((r) => r.ref), [1, 2, 3]);
check('O2 цикл → алдаа', /цикл/.test(throws(() => orderByParent([{ ref: 1, parentRef: 2 }, { ref: 2, parentRef: 1 }]))), true);

if (failed) {
  console.log(`\n❌ ${failed} шалгалт унасан`);
  process.exit(1);
}
console.log('\n✅ БҮГД АМЖИЛТТАЙ');
