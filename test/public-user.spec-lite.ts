/**
 * Нийтийн хариу (assessment/all, assessment/:id, blog/all, blog/:id) — үүсгэгч / зохиогчийг зөвхөн { id, firstname, lastname }.
 * Өмнө нь admin-уудын email, phone, wallet, регистр нэвтрэлтгүйгээр гардаг байв.
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/public-user.spec-lite.ts
 */
import { AssessmentService } from '../src/app/assessment/assessment.service';
import { BlogService } from '../src/app/blog/blog.service';
import { CacheService } from '../src/base/cache.service';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`);
};
const full = (id: number) => ({ id, firstname: `F${id}`, lastname: `L${id}`, email: `a${id}@x.mn`, phone: '99', wallet: 5, organizationRegisterNumber: 'R', role: 10 });
const PII = /"(email|phone|wallet|organizationRegisterNumber|role|password|forget)"/;

const svc = new AssessmentService(
  {
    findAll: async () => ({ data: [{ id: 1, createdUser: 7, updatedUser: 8, category: { id: 3 }, description: 'D', usage: 'U', measure: 'M', advice: 'A' }], count: 1, total: 1 }),
    findOne: async () => ({ id: 1, createdUser: 7, updatedUser: 8, questionCategories: [], answerCategories: [], category: null, description: 'D', usage: 'U', measure: 'M', advice: 'A' }),
    countQuestionAssessment: async () => 0,
    findOrg: async () => [],
  } as any,
  { countByAssessmentBatch: async () => new Map() } as any,
  { findAll: async () => [] } as any,
  { findAll: async () => [], findOne: async () => null } as any,
  {} as any,
  { findByIds: async (ids: number[]) => ids.map(full), get: async (id: number) => full(id) } as any,
  {} as any,
  new CacheService(),
);
const blogRows = [{ id: 1, title: 't', user: full(7) }];
const blog = new BlogService({ getRepository: () => ({ count: async () => 1, findAndCount: async () => [blogRows, 1], findOne: async () => blogRows[0] }) } as any, {} as any);

(async () => {
  const all = await svc.findAll({ page: 1, limit: 20 } as any);
  check('P1 assessment/all: үүсгэгч / засварлагч зөвхөн нэр', [all.data[0].user.createdUser, all.data[0].user.updatedUser, PII.test(JSON.stringify(all))],
    [{ id: 7, firstname: "F7", lastname: "L7" }, { id: 7, firstname: "F7", lastname: "L7" }, false]); // findAll зөвхөн createdUser-ийг татдаг (updatedUser → fallback) — хуучин зан төлөв
  const one = await svc.findOne(1);
  check('P2 assessment/:id: зөвхөн нэр', [one.user.createdUser, PII.test(JSON.stringify(one))], [{ id: 7, firstname: 'F7', lastname: 'L7' }, false]);
  const keys = (o: any) => ['description', 'usage', 'measure', 'advice'].filter((k) => k in o);
  check('P4 нийтийн жагсаалт: урт HTML (usage/measure/advice) хасагдсан, description үлдсэн', keys(all.data[0].data), ['description']);
  const adm = await svc.findAll({ page: 1, limit: 20 } as any, { id: 1, role: 10 } as any);
  check('P5 admin жагсаалт: бүх талбар хэвээр', keys(adm.data[0].data), ['description', 'usage', 'measure', 'advice']);
  check('P6 assessment/:id (дэлгэрэнгүй): бүх талбар хэвээр', keys(one.data), ['description', 'usage', 'measure', 'advice']);
  const bl = await blog.findAll({ page: 1, limit: 10 } as any);
  const b1 = await blog.findOne(1);
  check('P3 blog/all, blog/:id: зохиогч зөвхөн нэр, бусад талбар хэвээр', [bl.data[0].user, bl.data[0].title, PII.test(JSON.stringify(bl)), b1.user, PII.test(JSON.stringify(b1))],
    [{ id: 7, firstname: 'F7', lastname: 'L7' }, 't', false, { id: 7, firstname: 'F7', lastname: 'L7' }, false]);

  console.log(failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`);
  process.exit(failed === 0 ? 0 : 1);
})();
