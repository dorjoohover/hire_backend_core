/**
 * NUMBER (90) / TIME (100) асуултын хариултын серверийн шалгалт (DB / HTTP-гүй).
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/numeric-answer.spec-lite.ts
 */
import {
  isNumericQuestionType,
  numericAnswerError,
} from '../src/app/user.answer/numeric-answer';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`,
  );
};

const num = (settings: any = {}, minValue: any = 0, maxValue: any = 7) => ({
  type: 90,
  minValue,
  maxValue,
  settings,
});
const time = (minValue: any = 0, maxValue: any = 960) => ({
  type: 100,
  minValue,
  maxValue,
  settings: { hours: true, minutes: true, pointUnit: 'minute' },
});

check('T1 төрөл: 90/100 тоон, бусад биш', [90, 100, '100', 80, 60, null].map(isNumericQuestionType), [true, true, true, false, false, false]);
check('N1 хүрээнд бүхэл тоо → зөв', numericAnswerError(num(), 3), null);
check('N2 хил (min/max) → зөв', [numericAnswerError(num(), 0), numericAnswerError(num(), 7)], [null, null]);
check('N3 max-аас их → алдаа', numericAnswerError(num(), 8), 'Утга 7-аас их байж болохгүй');
check('N4 min-ээс бага → алдаа', numericAnswerError(num(), -1), 'Утга 0-аас бага байж болохгүй');
check('N5 бутархай зөвшөөрөөгүй → алдаа', numericAnswerError(num(), 2.5), 'Бүхэл тоо оруулна уу');
check('N6 бутархай зөвшөөрсөн → зөв', numericAnswerError(num({ decimal: true }), 2.5), null);
check('N7 тоо биш → алдаа', numericAnswerError(num(), 'abc'), 'Тоон утга буруу байна');
check('N8 хариулаагүй (null / undefined / "") → шалгахгүй', [null, undefined, ''].map((p) => numericAnswerError(num(), p)), [null, null, null]);
check('N9 min/max null → хязгааргүй', numericAnswerError(num({}, null, null), 123456), null);
check('N10 string min/max (numeric багана) → тоогоор жишинэ', numericAnswerError(num({}, '1', '10'), 10), null);
check('M1 TIME: 16ц (960 мин) хил → зөв, 961 → алдаа', [numericAnswerError(time(), 960), numericAnswerError(time(), 961)], [null, 'Утга 960-аас их байж болохгүй']);
check('M2 TIME: секундтэй (бутархай минут) → зөв', numericAnswerError(time(), 90.3333), null);
check('M3 TIME: сөрөг → алдаа', numericAnswerError(time(null, null), -5), 'Хугацаа сөрөг байж болохгүй');
check('M4 TIME: тоймлолтын зөрүү (≤1e-6) тэвчинэ', numericAnswerError(time(0, 90.3333), 90.3333004), null);
check('O1 бусад төрөл (80) — шалгахгүй', numericAnswerError({ type: 80, minValue: 1, maxValue: 5 } as any, 99), null);

if (failed) {
  console.log(`\n❌ ${failed} шалгалт унасан`);
  process.exit(1);
}
console.log('\n✅ БҮГД АМЖИЛТТАЙ');
