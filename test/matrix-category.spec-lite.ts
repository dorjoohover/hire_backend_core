/**
 * MATRIX хариултын ангилал: баганын ангилал → байхгүй бол мөрийн ангилал (DB / HTTP-гүй).
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/matrix-category.spec-lite.ts
 */
import { matrixAnswerMeta } from '../src/app/user.answer/matrix-category';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`,
  );
};

const col = (categoryId: number | null) => ({ id: 900, categoryId, point: 6 });
const row = (categoryId: number | null) => ({ id: 50, categoryId, reverse: true, negative: true, correct: true, point: 0 });

check('C1 баганын ангилал байвал түүнийг (өмнөх зан төлөв)', matrixAnswerMeta(col(7), row(3))?.categoryId, 7);
check('C2 баганын ангилалгүй → мөрийн ангилал (ASSIST: "Тамхи")', matrixAnswerMeta(col(null), row(3))?.categoryId, 3);
check('C3 аль аль нь байхгүй → null', matrixAnswerMeta(col(null), row(null))?.categoryId, null);
check('C4 мөр олдоогүй → баганын (null)', matrixAnswerMeta(col(null), undefined)?.categoryId, null);
check('C5 matrix id буруу (meta байхгүй) → undefined', matrixAnswerMeta(undefined, row(3)), undefined);
check('C6 мөрийн reverse/negative/correct матрицад дамжихгүй, point нь баганынх', (() => {
  const m: any = matrixAnswerMeta(col(null), row(3));
  return [m.reverse, m.negative, m.correct, m.point, m.id];
})(), [null, null, null, 6, 900].map((v) => (v === null ? undefined : v)));

if (failed) {
  console.log(`\n❌ ${failed} шалгалт унасан`);
  process.exit(1);
}
console.log('\n✅ БҮГД АМЖИЛТТАЙ');
