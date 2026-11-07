/**
 * assessment/home/page — 60с cache: давтан дуудалтад DB-д хандахгүй, create / update / remove цэвэрлэнэ, TTL дуусна.
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/home-cache.spec-lite.ts
 */
import { AssessmentService } from '../src/app/assessment/assessment.service';
import { CacheService } from '../src/base/cache.service';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`);
};

let loads = 0;
const dao: any = {
  find: async () => ({ items: [{ id: 1 }] }),
  findOne: async (id: number) => ({ id }),
  count: async () => ++loads, // нэг ачаалалт = нэг count
  create: async () => 9,
  update: async () => true,
  deleteOne: async () => true,
};
const svc = new AssessmentService(
  dao,
  { countDemand: async () => [{ assessmentId: 2 }] } as any,
  {} as any, {} as any,
  { create: async () => ({}) } as any,
  { countUsers: async () => ({ users: 5, orgs: 2 }) } as any,
  { count: async () => 7 } as any,
  new CacheService(),
);

(async () => {
  const a = await svc.findHomePage();
  const b = await svc.findHomePage();
  check('H1 давтан дуудалт cache-ээс (DB 1 удаа), хариу бүтэн', [loads, b.count, b.users, b.exams, b.demand.length], [1, 1, 5, 7, 1]);
  check('H1b ижил объект', a === b, true);

  await svc.update(1, {} as any, 1);
  check('H2 update → дараагийн дуудалт шинээр ачаална', (await svc.findHomePage()).count, 2);
  await svc.remove(1);
  check('H3 remove → шинээр', (await svc.findHomePage()).count, 3);
  await svc.create({ answerCategories: [], level: 1 } as any, 1);
  check('H4 create → шинээр', (await svc.findHomePage()).count, 4);

  const now = Date.now;
  Date.now = () => now() + 61_000;
  check('H5 60с-ийн дараа хугацаа дуусна', (await svc.findHomePage()).count, 5);
  Date.now = now;

  console.log(failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`);
  process.exit(failed === 0 ? 0 : 1);
})();
