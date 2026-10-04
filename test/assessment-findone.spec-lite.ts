/**
 * AssessmentService.findOne — JSON-оос оруулсан / хувилсан тест (ангилалгүй, updatedUser хоосон)
 * admin-д нээгдэх ёстой (өмнө нь `res.category.id` дээр 500 → admin "Ерөнхий мэдээлэл" таб унадаг).
 *
 *   npx ts-node --transpile-only -P tsconfig.json -r tsconfig-paths/register test/assessment-findone.spec-lite.ts
 */
import { AssessmentService } from '../src/app/assessment/assessment.service';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`);
};

const users: Record<number, any> = { 7: { id: 7, firstname: 'Импорт' }, 8: { id: 8, firstname: 'Засагч' } };
const make = (row: any) => {
  const dao: any = { findOne: async () => row, countQuestionAssessment: async () => 3 };
  const categoryDao: any = { findOne: async (id: number) => ({ id, name: 'Ангилал ' + id }) };
  const userDao: any = { get: async (id: any) => (id == null ? { id: 1, firstname: 'ЭХНИЙ МӨР' } : users[id] ?? null) };
  return new AssessmentService(dao, null as any, null as any, categoryDao, null as any, userDao, null as any, null as any);
};
const base = { id: 135, name: 'Сорил', answerCategories: [], questionCategories: [{ id: 1 }] };

(async () => {
  const r1 = await make({ ...base, category: null, createdUser: 7, updatedUser: null }).findOne(135);
  check('F1 ангилалгүй, updatedUser хоосон → 200 (category null, updatedUser null)', [r1.data.name, r1.category, r1.user.createdUser?.id, r1.user.updatedUser], ['Сорил', null, 7, null]);
  const r2 = await make({ ...base, category: { id: 30 }, createdUser: 7, updatedUser: 8 }).findOne(135);
  check('F2 энгийн тест хэвээр', [r2.category, r2.user.createdUser.id, r2.user.updatedUser.id, r2.count], [{ id: 30, name: 'Ангилал 30' }, 7, 8, 3]);
  const r3 = await make({ ...base, category: { id: 30 }, createdUser: 7, updatedUser: 7 }).findOne(135);
  check('F3 ижил хэрэглэгч → нэг объект', r3.user.updatedUser === r3.user.createdUser, true);
  console.log(failed ? `\n❌ ${failed} унасан` : '\n✅ БҮГД АМЖИЛТТАЙ');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
