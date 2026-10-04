/**
 * v1.3.0 тодорхойлолтын кэш: QuestionDao.findByCategory / QuestionAnswerDao.findByQuestionIds
 * кэштэй ба кэшгүй үед ЯГ ижил үр дүн (эрэмбэ, limit, seed shuffle). DB / Redis-гүй (fake).
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/definition-cache-dao.spec-lite.ts
 */
import 'reflect-metadata';
import { QuestionDao } from '../src/app/question/dao/question.dao';
import { QuestionAnswerDao } from '../src/app/question/dao/question.answer.dao';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`);
};

// SQL-ийн "orderNumber ASC NULLS LAST, id ASC" + limit-ийг дуурайсан fake query builder
const QUESTIONS = [
  { id: 1, orderNumber: 3 }, { id: 2, orderNumber: null }, { id: 3, orderNumber: 1 },
  { id: 4, orderNumber: 1 }, { id: 5, orderNumber: null }, { id: 6, orderNumber: 2 },
].map((q) => ({ ...q, name: `q${q.id}` }));
const sqlSort = (rows: any[]) => [...rows].sort((a, b) => (a.orderNumber ?? 1e9) - (b.orderNumber ?? 1e9) || a.id - b.id);
let dbLoads = 0;
const qb = () => {
  const st: any = { limit: undefined as any, order: 'id' };
  const api: any = {
    select: () => api, where: () => api,
    limit: (l: any) => ((st.limit = l), api),
    orderBy: (o: string) => ((st.order = o), api),
    addOrderBy: () => api,
    getMany: async () => {
      dbLoads++;
      let rows = st.order === 'entity.id' ? [...QUESTIONS] : sqlSort(QUESTIONS);
      if (st.limit !== undefined && st.limit !== null) rows = rows.slice(0, st.limit);
      return rows;
    },
  };
  return api;
};
const ds: any = { getRepository: () => ({ createQueryBuilder: qb }) };
const passCache: any = {
  getOrLoad: async (_p: string, _id: any, load: () => Promise<any>) => JSON.parse(JSON.stringify(await load())),
  getMany: async (_p: string, ids: number[], load: (m: number[]) => Promise<Map<number, any>>, empty: any) => {
    const m = await load(ids);
    const out = new Map<number, any>();
    for (const id of ids) out.set(id, JSON.parse(JSON.stringify(m.has(id) ? m.get(id) : empty)));
    return out;
  },
};

(async () => {
  const plain = new QuestionDao(ds);
  const cached = new QuestionDao(ds, passCache);
  const ids = (rows: any[]) => rows.map((r) => r.id);
  for (const limit of [undefined, null, 0, 2, 10]) {
    const a = ids(await plain.findByCategory(limit as any, false, 1, []));
    const b = ids(await cached.findByCategory(limit as any, false, 1, []));
    check(`Q1 shuffle-гүй limit=${limit}: кэштэй == кэшгүй`, b, a);
  }
  for (const seed of ['111:c1', '222:c1']) {
    const a = ids(await plain.findByCategory(4, true, 1, [], seed));
    const b = ids(await cached.findByCategory(4, true, 1, [], seed));
    check(`Q2 seed shuffle ${seed}: ижил`, b, a);
  }

  // mv мөрүүд — SQL эрэмбэтэй (questionId, orderNumber, id, matrixOrderNumber)
  const MV = [
    { questionId: 10, id: 101, orderNumber: 1, value: 'a', point: '1', matrixId: null },
    { questionId: 10, id: 102, orderNumber: 2, value: 'b', point: '2', matrixId: null },
    { questionId: 20, id: 201, orderNumber: 1, value: 'c', point: null, matrixId: 9, matrixValue: 'm', matrixPoint: '3', matrixOrderNumber: 1 },
    { questionId: 30, id: 301, orderNumber: 1, value: 'd', point: '0', matrixId: null },
  ];
  const mvDs: any = {
    getRepository: () => ({
      query: async (_sql: string, [qids]: any[]) => MV.filter((r) => qids.includes(r.questionId)),
    }),
  };
  const view: any = { refresh: () => undefined };
  const pa = new QuestionAnswerDao(mvDs, view);
  const ca = new QuestionAnswerDao(mvDs, view, passCache);
  for (const q of [[10, 20, 30], [30, 10], [20, 40]]) {
    const a = await pa.findByQuestionIds(q, false, false);
    const b = await ca.findByQuestionIds(q, false, false);
    check(`Q3 mv ${JSON.stringify(q)}: кэштэй == кэшгүй`, [...b.entries()], [...a.entries()]);
  }
  const s1 = await pa.findByQuestionIds([10, 20], true, false, 'seed1');
  const s2 = await ca.findByQuestionIds([10, 20], true, false, 'seed1');
  check('Q4 хариулт seed shuffle: ижил', [...s2.entries()], [...s1.entries()]);

  if (failed) {
    console.log(`\n❌ ${failed} шалгалт унасан`);
    process.exit(1);
  }
  console.log('\n✅ БҮГД АМЖИЛТТАЙ');
})();
