/**
 * Асуулт / бүлэг / assessment-ийн нийт оноо — "-Infinity" хамгаалалт (DB / HTTP-гүй).
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/question-point.spec-lite.ts
 */
import {
  assessmentTotals,
  categoryTotalPoint,
  finitePoint,
} from '../src/app/question/point-total';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`,
  );
};

check('F1 pg numeric string → тоо', ['2.5', '0', 3].map(finitePoint), [2.5, 0, 3]);
check('F2 -Infinity / Infinity / NaN / null → 0', ['-Infinity', 'Infinity', 'NaN', null, undefined, -Infinity].map(finitePoint), [0, 0, 0, 0, 0, 0]);

check('C1 энгийн: 2 × 5', categoryTotalPoint([{ point: '2' }, { point: '2' }], 5), 10);
check('C2 эхний асуулт -Infinity (хуучин TEXT) → дараагийнхыг авна', categoryTotalPoint([{ point: '-Infinity' }, { point: '3' }], 4), 12);
check('C3 бүгд -Infinity → 0', categoryTotalPoint([{ point: '-Infinity' }], 4), 0);
check('C4 асуултгүй бүлэг (сүүлийн асуултыг устгасан) → 0, TypeError биш', [categoryTotalPoint([], 3), categoryTotalPoint(undefined, 3)], [0, 0]);
check('C5 questionCount null → 0', categoryTotalPoint([{ point: 2 }], null), 0);
check('C6 эхний асуулт оноогүй TEXT (0) → оноотой асуултыг авна', categoryTotalPoint([{ point: '0' }, { point: '2' }], 3), 6);
check('C7 бүгд оноогүй (зөвхөн TEXT) → 0', categoryTotalPoint([{ point: 0 }, { point: null }], 3), 0);

check(
  'A1 бүлгийн "-Infinity" totalPoint → 0 гэж нэмнэ, integer',
  assessmentTotals([
    { totalPoint: '-Infinity', questionCount: 3 },
    { totalPoint: '10', questionCount: '5' },
  ]),
  { totalPoint: 10, questionCount: 8 },
);
check('A2 бутархай нийлбэр → бөөрөнхийлнө (integer багана)', assessmentTotals([{ totalPoint: '2.5', questionCount: 1 }, { totalPoint: '1.25', questionCount: 1 }]), { totalPoint: 4, questionCount: 2 });
check('A3 бүлэггүй → 0', assessmentTotals(undefined), { totalPoint: 0, questionCount: 0 });

if (failed) {
  console.log(`\n❌ ${failed} шалгалт унасан`);
  process.exit(1);
}
console.log('\n✅ БҮГД АМЖИЛТТАЙ');
