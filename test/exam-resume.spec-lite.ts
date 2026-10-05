/**
 * №3 — дундаас нь үргэлжлүүлэх (DB-гүй): цэвэр функцууд + `ExamService.updateByCode`-ийн урсгал (mock DAO-той).
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/exam-resume.spec-lite.ts
 */
import 'reflect-metadata';
import {
  canNavigateTo,
  decidePublicReuse,
  nextCategoryStart,
  pickResumeIndex,
  resolveCompletedCategories,
  stableShuffle,
} from '../src/app/exam/exam-resume';
import { ExamService } from '../src/app/exam/exam.service';
import { UserServiceService } from '../src/app/user.service/user.service.service';
import { parseQrExpiry, signQrExpiry } from '../src/utils/qr-expiry';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`);
};

// ---------------- цэвэр функцууд ----------------
const items = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
const s1 = stableShuffle(items, 'A', (x) => x.id).map((x) => x.id);
check('P1 stableShuffle: ижил seed → ижил дараалал', stableShuffle(items, 'A', (x) => x.id).map((x) => x.id), s1);
check('P2 stableShuffle: өөр seed → өөр дараалал', JSON.stringify(stableShuffle(items, 'B', (x) => x.id).map((x) => x.id)) !== JSON.stringify(s1), true);
check('P3 stableShuffle: элемент бүрийг хадгална (permutation), эх массивыг өөрчлөхгүй', [[...s1].sort((a, b) => a - b), items[0].id], [items.map((x) => x.id), 1]);
check('P4 stableShuffle: массивын оролтын дараалалд үл хамаарна', stableShuffle([...items].reverse(), 'A', (x) => x.id).map((x) => x.id), s1);

check('P5 pickResumeIndex: хариулаагүй эхний хэсэг', pickResumeIndex([11, 12, 13], new Set([11])), 1);
check('P6 pickResumeIndex: хоосон → 0 (эхнийх)', pickResumeIndex([11, 12, 13], new Set()), 0);
check('P7 pickResumeIndex: 1-р хэсэг дундаас гарсан (хариулаагүй) → 0', pickResumeIndex([11, 12], new Set([12])), 0);
check('P8 pickResumeIndex: бүгд хариулагдсан → сүүлийнх', pickResumeIndex([11, 12, 13], new Set([11, 12, 13])), 2);
check('P9 pickResumeIndex: хэсэггүй → -1', pickResumeIndex([], new Set()), -1);

// Бүлэг хооронд шилжих: [11,12,13,14] = 1..4-р бүлэг
const B = [11, 12, 13, 14];
check('N1 1→3 болохгүй (2 бөглөгдөөгүй)', canNavigateTo(B, new Set([11]), 13, 11), false);
check('N2 1→2 болно (1 бөглөгдсөн)', canNavigateTo(B, new Set([11]), 12, 11), true);
check('N3 1 дутуу бол 1→2 болохгүй', canNavigateTo(B, new Set(), 12, 11), false);
check('N4 3→1, 3→2 болно (1, 2 бөглөгдсөн; 3 дутуу байсан ч)', [canNavigateTo(B, new Set([11, 12]), 11, 13), canNavigateTo(B, new Set([11, 12]), 12, 13)], [true, true]);
check('N4b ижил бүлэг (target === from) үргэлж болно', canNavigateTo(B, new Set(), 12, 12), true);
check('N5 3 бөглөгдсөн бол 1→3, 1→4 болно', [canNavigateTo(B, new Set([11, 12, 13]), 13, 11), canNavigateTo(B, new Set([11, 12, 13]), 14, 11)], [true, true]);
check('N6 3 дутуу бол 1→3 болно (frontier), 1→4 болохгүй', [canNavigateTo(B, new Set([11, 12]), 13, 11), canNavigateTo(B, new Set([11, 12]), 14, 11)], [true, false]);
check('N6b 2 дутуу бол 2→3 болохгүй (3-ын өмнөх бүлэг дутуу)', canNavigateTo(B, new Set([11]), 13, 12), false);
check('N7 мэдэгдэхгүй бүлэг → болохгүй', canNavigateTo(B, new Set(B), 99, 11), false);
check('N8 хуучин цоорхой (2 бөглөгдөөгүй, 3 бөглөгдсөн) — 3→4 "Дараах" гацахгүй, 1→4 болохгүй', [canNavigateTo(B, new Set([11, 13]), 14, 13), canNavigateTo(B, new Set([11, 13]), 14, 11)], [true, false]);
check('N9 3 дутуу бол 3→4 болохгүй', canNavigateTo(B, new Set([11, 12]), 14, 13), false);

check('R1 stored null (хуучин шалгалт) → хариулттай бүлгүүдээс seed, from-гүй бол бичихгүй', resolveCompletedCategories(null, [11, 12], B), { completed: new Set([11, 12]), changed: false });
check('R1b Set JSON харьцуулалт — утгаар', [...resolveCompletedCategories(null, [11, 12], B).completed], [11, 12]);
const r2 = resolveCompletedCategories([11], [11, 12], B, 12, true);
check('R2 complete=true → нэмнэ, changed', [[...r2.completed], r2.changed], [[11, 12], true]);
const r3 = resolveCompletedCategories([11, 12, 13], [11, 12, 13], B, 12, false);
check('R3 буцаж ороод заавал асуултыг хоосолсон (complete=false) → хасна', [[...r3.completed], r3.changed], [[11, 13], true]);
const r4 = resolveCompletedCategories([11], [11], B, 11, true);
check('R4 өөрчлөлтгүй → changed=false', r4.changed, false);
const r5 = resolveCompletedCategories(null, [11, 12], B, 12, false);
check('R5 stored null + дутуу авто-хадгалалт (12 хариулттай ч дутуу) → хасаад анх удаа бичнэ', [[...r5.completed], r5.changed], [[11], true]);
check('R6 өөр тестийн бүлэг (from ∉ ordered) → үл тооно', resolveCompletedCategories([11], [11], B, 77, true).changed, false);

const T0 = new Date('2026-09-20T10:00:00Z');
const T1 = new Date('2026-09-20T10:20:00Z');
check('P10 nextCategoryStart: reload, ижил хэсэг → хуучин цаг', nextCategoryStart({ categoryStartedFor: 12, categoryStartedAt: T0 }, 12, false, T1), { startedAt: T0, changed: false });
check('P11 nextCategoryStart: шилжсэн (explicit) → шинэ цаг', nextCategoryStart({ categoryStartedFor: 12, categoryStartedAt: T0 }, 12, true, T1), { startedAt: T1, changed: true });
check('P12 nextCategoryStart: өөр хэсэг / анх удаа → шинэ цаг', [nextCategoryStart({ categoryStartedFor: 11, categoryStartedAt: T0 }, 12, false, T1).changed, nextCategoryStart({}, 11, false, T1).changed], [true, true]);

const NOW = new Date('2026-09-21T12:00:00Z');
const ago = (h: number) => new Date(NOW.getTime() - h * 3600_000);
check('P13 decidePublicReuse: дуусаагүй 3 хоног → үргэлжлүүлнэ', decidePublicReuse([{ code: 'a', createdAt: ago(72), userEndDate: null }], NOW), { code: 'a', finished: false });
check('P14 decidePublicReuse: дуусаагүй 8 хоног → null', decidePublicReuse([{ code: 'a', createdAt: ago(8 * 24), userEndDate: null }], NOW), null);
check('P15 decidePublicReuse: дууссан 23ц → finished, 25ц → null', [decidePublicReuse([{ code: 'a', createdAt: ago(23), userEndDate: ago(22) }], NOW), decidePublicReuse([{ code: 'a', createdAt: ago(25), userEndDate: ago(24) }], NOW)], [{ code: 'a', finished: true }, null]);
check('P16 decidePublicReuse: нэг дор дуусаагүй + дууссан → дуусаагүй нь давуу', decidePublicReuse([{ code: 'done', createdAt: ago(30), userEndDate: ago(29) }, { code: 'open', createdAt: ago(2), userEndDate: null }], NOW)?.code, 'open');
check('P17 decidePublicReuse: жагсаалт хоосон → null', decidePublicReuse([], NOW), null);

// ---------------- updateByCode урсгал (mock) ----------------
type World = { answered: number[]; exam: any; cats?: number[] };
const build = (w: World) => {
  const calls = { updates: [] as any[], setStart: [] as any[], getQuestions: [] as any[], details: [] as any[], findForExam: [] as any[], completed: [] as any[] };
  const dao = {
    findByCode: async () => w.exam,
    update: async (id: number, dto: any) => { calls.updates.push({ id, keys: Object.keys(dto).filter((k) => ['userStartDate', 'userEndDate'].includes(k) && dto[k]) }); },
    setCategoryStart: async (id: number, cat: number, at: Date) => { calls.setStart.push({ id, cat, at }); },
    setCompletedCategories: async (id: number, ids: number[]) => { calls.completed.push(ids); },
  };
  const questionCategoryDao = {
    findByAssessment: async () => (w.cats ?? [11, 12, 13]).map((id, i) => ({ id, name: `C${id}`, orderNumber: i + 1, questions: [] })),
    findOne: async (id: number) => ({ id, name: `C${id}`, questionCount: 5 }),
  };
  const userAnswer = { findAnsweredCategoryIds: async () => w.answered };
  const authService = { forceLogin: async () => ({ token: 'tok', user: { id: 9 } }) };
  const questionService = {
    findForExam: async (...a: any[]) => { calls.findForExam.push(a); return [{ question: { id: a[2] * 10 }, answers: [] }]; },
  };
  const questionRuleDao = { findByTargetQuestionIds: async () => [] };
  const detailDao = { createManyIfAbsent: async (rows: any[]) => { calls.details.push(rows); return rows.length; } };
  // Жинхэнэ ExamService (createDetail зэрэг жинхэнэ), DAO-нууд л mock.
  const svc: any = new (ExamService as any)(
    dao, detailDao, questionService, authService, userAnswer,
    null, null, null, null, questionCategoryDao, questionRuleDao,
  );
  const orig = svc.getQuestions.bind(svc);
  svc.getQuestions = async (...a: any[]) => { calls.getQuestions.push(a); return orig(...a); };
  return { svc, calls };
};
const baseExam = () => ({
  id: 1, code: '123456', email: 'a@b.mn', phone: '99001122', firstname: 'B', lastname: 'D', visible: true,
  userStartDate: null, userEndDate: null, endDate: null, startDate: null, user: null, service: { id: 3 },
  categoryStartedAt: null, categoryStartedFor: null,
  assessment: { id: 5, questionShuffle: true, answerShuffle: true, duration: 30 },
});

(async () => {
  const q = console.log; const silent = () => {}; // updateByCode нь олон console.log / time хэвлэдэг
  const run = async (w: World, category?: number, con: any = true, nav: any = undefined) => {
    const { svc, calls } = build(w);
    console.log = silent; console.time = silent as any; console.timeEnd = silent as any;
    try {
      const res = await svc.updateByCode(w.exam.code, con, category, nav);
      return { res, calls };
    } finally { console.log = q; delete (console as any).time; delete (console as any).timeEnd; }
  };

  let r = await run({ answered: [], exam: baseExam() });
  check('U1 шинэ шалгуулагч: 1-р хэсэг (11), үлдсэн [12,13]', [r.res.category.id, r.res.categories], [11, [12, 13]]);
  check('U2 анх нээхэд userStartDate тавигдана, token олгогдоно', [r.calls.updates.some((u) => u.keys.includes('userStartDate')), r.res.token], [true, 'tok']);
  check('U3 хэсгийн хугацааны эхлэл (11) сервертэй тэмдэглэгдэнэ; response-д serverNow / categoryStartedAt / examStartedAt', [r.calls.setStart.map((s) => s.cat), typeof r.res.serverNow, r.res.categoryStartedAt === r.res.serverNow, r.res.examStartedAt === r.res.serverNow], [[11], 'string', true, true]);
  check('U4 shuffle seed = exam code (getQuestions → findForExam 6-р аргумент)', [r.calls.findForExam[0][5], r.calls.findForExam[0][2]], ['123456', 11]);
  check('U5 examDetail нэг удаа, батч (1 мөр, category 11)', [r.calls.details.length, r.calls.details[0].map((d: any) => [d.exam, d.question, d.questionCategory])], [1, [[1, 110, 11]]]);

  r = await run({ answered: [11], exam: { ...baseExam(), userStartDate: new Date('2026-09-20T10:00:00Z') } });
  check('U6 1-р хэсэг хариулагдсан → 2-р хэсгээс (12), үлдсэн [13]', [r.res.category.id, r.res.categories], [12, [13]]);
  check('U7 allCategories төлөв: 11 answered, 12/13 үгүй', r.res.allCategories.map((c: any) => [c.id, c.answered]), [[11, true], [12, false], [13, false]]);
  check('U8 examStartedAt = хадгалагдсан userStartDate (өөрчлөгдөхгүй)', r.res.examStartedAt, '2026-09-20T10:00:00.000Z');

  const T0 = new Date('2026-09-20T10:05:00Z');
  r = await run({ answered: [11], exam: { ...baseExam(), userStartDate: new Date('2026-09-20T10:00:00Z'), categoryStartedFor: 12, categoryStartedAt: T0 } });
  check('U9 reload (2-р хэсэг): хэсгийн хугацаа ДАХИН эхлэхгүй (setCategoryStart дуудагдахгүй, ижил categoryStartedAt)', [r.calls.setStart.length, r.res.categoryStartedAt], [0, T0.toISOString()]);

  r = await run({ answered: [11], exam: { ...baseExam(), userStartDate: new Date('2026-09-20T10:00:00Z'), categoryStartedFor: 12, categoryStartedAt: T0 } }, 12);
  check('U10 хэрэглэгч хэсэг рүү шилжсэн (category=12 заасан) → шинэ эхлэл', r.calls.setStart.map((s) => s.cat), [12]);

  r = await run({ answered: [11, 12], exam: baseExam() });
  check('U11 2 хэсэг хариулагдсан → 3-р хэсэг (13), үлдсэн []', [r.res.category.id, r.res.categories], [13, []]);
  r = await run({ answered: [11, 12, 13], exam: baseExam() });
  check('U12 бүгд хариулагдсан ч дуусаагүй → сүүлийн хэсэг (13) дахин', r.res.category.id, 13);

  r = await run({ answered: [], exam: baseExam() }, undefined, 'false');
  const r2 = await run({ answered: [11], exam: baseExam() }, undefined, 'false');
  check('U13 `con` нь URL-ээс "false" string ирсэн ч resume ажиллана (2-р хэсэг)', [r.res.category.id, r2.res.category.id], [11, 12]);

  r = await run({ answered: [11], exam: baseExam() }, 13);
  check('U14 category заасан бол resume-ээс үл хамааран тэр хэсэг', [r.res.category.id, r.res.categories], [13, []]);

  const done = baseExam(); (done as any).userEndDate = new Date();
  let err = '';
  try { await run({ answered: [], exam: done }); } catch (e: any) { err = e.message; }
  check('U15 дууссан exam → "Эрх дууссан байна."', err, 'Эрх дууссан байна.');

  r = await run({ answered: [], exam: baseExam() }, -1);
  check('U16 category=-1 → тестийг хаана (userEndDate), асуулт татахгүй', [r.res, r.calls.updates.some((u) => u.keys.includes('userEndDate')), r.calls.getQuestions.length], [undefined, true, 0]);

  // ---------------- Бүлэг хооронд алгасахгүй шилжих ----------------
  const started = () => ({ ...baseExam(), userStartDate: new Date('2026-09-20T10:00:00Z') });
  const navErr = async (w: World, category: number, nav: any) => {
    try { await run(w, category, true, nav); return null; } catch (e: any) { return [e.getStatus?.(), e.message]; }
  };
  check('S1 1→3 алгасах (1 бөглөсөн, 2 бөглөөгүй) → 400', (await navErr({ answered: [11], exam: { ...started(), completedCategories: [11] } }, 13, { from: 11, complete: true }))?.[0], 400);
  r = await run({ answered: [11], exam: { ...started(), completedCategories: [] } }, 12, true, { from: 11, complete: true });
  check('S2 1 бөглөөд "Дараах" → 2, completed [11] хадгалагдана, allCategories.completed', [r.res.category.id, r.calls.completed, r.res.allCategories.map((c: any) => c.completed)], [12, [[11]], [true, false, false]]);
  check('S3 1 дутуу бол 1→2 → 400', (await navErr({ answered: [], exam: { ...started(), completedCategories: [] } }, 12, { from: 11, complete: false }))?.[0], 400);
  r = await run({ answered: [11, 12, 13], exam: { ...started(), completedCategories: [11, 12] } }, 11, true, { from: 13, complete: false });
  check('S4 3 (дутуу) → 1 буцах болно (1, 2 бөглөгдсөн), 3 completed-д нэмэгдэхгүй', [r.res.category.id, r.calls.completed, r.res.categories], [11, [], [12, 13]]);
  check('S4c 2 дутуу → 3 → 400 "Энэ хэсгийн…"', await navErr({ answered: [11], exam: { ...started(), completedCategories: [11] } }, 13, { from: 12, complete: false }), [400, 'Энэ хэсгийн заавал бөглөх асуултуудад хариулсны дараа шилжинэ үү.']);
  check('S4d 1-ээс 3 руу (2 дутуу) → 400 "Өмнөх хэсгүүдийн…"', await navErr({ answered: [11], exam: { ...started(), completedCategories: [11] } }, 13, { from: 11, complete: true }), [400, 'Өмнөх хэсгүүдийн заавал бөглөх асуултуудад хариулсны дараа шилжинэ үү.']);
  r = await run({ answered: [11, 12, 13], exam: { ...started(), completedCategories: [11, 12] } }, 11, true, { from: 13, complete: true });
  check('S4b 3 бөглөсөн → 1 буцах болно, 3 completed-д нэмэгдэнэ', [r.res.category.id, r.calls.completed, r.res.categories], [11, [[11, 12, 13]], [12, 13]]);
  check('S5 3 дутуу бол 1→4 → 400', (await navErr({ answered: [11, 12, 13], cats: [11, 12, 13, 14], exam: { ...started(), completedCategories: [11, 12] } }, 14, { from: 11, complete: true }))?.[0], 400);
  r = await run({ answered: [11, 12, 13], cats: [11, 12, 13, 14], exam: { ...started(), completedCategories: [11, 12, 13] } }, 14, true, { from: 11, complete: true });
  check('S5b 3 бөглөгдсөн бол 1→4 болно', r.res.category.id, 14);
  r = await run({ answered: [11, 12], exam: { ...started(), completedCategories: [11, 12] } }, 13, true, { from: 11, complete: true });
  check('S6 1,2 бөглөсөн бол 1→3 болно', r.res.category.id, 13);
  r = await run({ answered: [11, 12, 13], exam: { ...started(), completedCategories: [11, 12] } });
  check('S7 reload: 3 хариулттай ч бөглөж дуусаагүй → 3-аас үргэлжилнэ (4 руу алгасахгүй)', r.res.category.id, 13);
  r = await run({ answered: [11], exam: started() }, 13);
  check('S8 хуучин client (from-гүй) → шалгахгүй, хуучин үйлдэл', [r.res.category.id, r.calls.completed.length], [13, 0]);
  r = await run({ answered: [11], exam: started() }, 11, true, { from: 12, complete: true });
  check('S9 хуучин шалгалт (completedCategories null) → хариулттайгаас seed + 12 нэмж анх удаа бичнэ', [r.res.category.id, r.calls.completed], [11, [[11, 12]]]);
  r = await run({ answered: [11, 12], exam: started() }, 11, true, { from: 12, complete: false });
  check('S10 хуучин шалгалт, 12 дутуу (хариулттай ч) → 1 руу буцах болно, 12-ыг хасаж бичнэ', [r.res.category.id, r.calls.completed], [11, [[11]]]);
  check('S11 тэр үед 1→3 болохгүй (12 дутуу)', (await navErr({ answered: [11, 12], exam: { ...started(), completedCategories: [11] } }, 13, { from: 11, complete: true }))?.[0], 400);

  // ---------------- createPublicExam (public QR бүртгэл) ----------------
  const pub = (over: any = {}) => {
    const calls = { created: 0, mails: [] as any[], counts: [] as any[], released: [] as any[], finder: [] as any[] };
    const service = { id: 3, count: 10, usedUserCount: 1, price: over.price ?? 0, assessment: { id: 5, name: 'DISC' }, user: { id: 77 } };
    const svc: any = new (UserServiceService as any)(
      {
        findOne: async () => service,
        reserveSeats: async (...a: any[]) => { calls.counts.push(a); return !over.noSeats; },
        releaseSeats: async (...a: any[]) => { calls.released.push(a); },
      },
      null, null,
      { create: async () => { if (over.createFails) throw new Error('db down'); calls.created++; return '300001'; } },
      {
        findByServiceAndContact: async (...a: any[]) => { calls.finder.push(a.slice(0, 3)); return over.existing ?? null; },
        update: async () => undefined,
      },
      null, null,
      { sendPublicResume: async (m: any) => { if (over.mailFails) throw new Error('smtp down'); calls.mails.push(m); } },
      null, null, null,
      { forceLogin: async () => ({ user: { id: 9 }, token: 't' }) },
    );
    return { svc, calls };
  };
  const dto = { firstname: 'Бат', lastname: 'Дорж', email: 'Bat@Mail.mn', phone: '99001122' };
  const quiet = async (fn: () => Promise<any>) => { const e = console.error; console.error = () => {}; try { return await fn(); } finally { console.error = e; } };

  let pc = pub({ existing: { code: '200001', finished: false } });
  check('C1 дуусаагүй exam байвал ШИНЭ үүсгэхгүй, квот зарцуулахгүй, и-мэйл илгээхгүй → {code, finished:false}', [await pc.svc.createPublicExam(3, dto), pc.calls.created, pc.calls.counts.length, pc.calls.mails.length], [{ code: '200001', finished: false }, 0, 0, 0]);
  check('C2 лавлах: и-мэйл lowercase, утас, service', pc.calls.finder[0], [3, 'bat@mail.mn', '99001122']);
  pc = pub({ existing: { code: '200003', finished: true } });
  check('C3 дууссан exam → {finished:true} (үр дүн рүү), квот өөрчлөгдөхгүй', [await pc.svc.createPublicExam(3, dto), pc.calls.counts.length], [{ code: '200003', finished: true }, 0]);
  pc = pub();
  check('C4 шинэ бүртгэл: exam 1, суудал АТОМАР 1 захиалагдана (үнэгүй service → enforce=false), үргэлжлүүлэх и-мэйл 1', [await pc.svc.createPublicExam(3, dto), pc.calls.created, pc.calls.counts, pc.calls.mails.map((m: any) => [m.email, m.code, m.firstname, m.assessmentName])], [{ code: '300001', finished: false }, 1, [[3, 1, false]], [['bat@mail.mn', '300001', 'Бат', 'DISC']]]);
  pc = pub();
  check('C5 и-мэйлгүй бүртгэл → и-мэйл илгээхгүй, exam үүснэ', [(await pc.svc.createPublicExam(3, { ...dto, email: '' })).code, pc.calls.mails.length], ['300001', 0]);
  pc = pub({ mailFails: true });
  check('C6 и-мэйл илгээж чадаагүй ч бүртгэл амжилттай (код буцна)', (await quiet(() => pc.svc.createPublicExam(3, dto))).code, '300001');
  pc = pub();
  let bad = '';
  try { await pc.svc.createPublicExam(3, { ...dto, email: 'no-at' }); } catch (e: any) { bad = e.message; }
  check('C7 буруу и-мэйл → 400, юу ч үүсэхгүй', [bad, pc.calls.created], ['И-мэйл хаяг буруу форматтай байна.', 0]);

  // ---------------- №8: атомар суудал + QR-ийн хугацаа ----------------
  pc = pub({ price: 5000 });
  await pc.svc.createPublicExam(3, dto);
  check('C8 төлбөртэй service → суудал enforce=true-аар захиалагдана', pc.calls.counts, [[3, 1, true]]);
  pc = pub({ price: 5000, noSeats: true });
  let st402 = 0;
  try { await pc.svc.createPublicExam(3, dto); } catch (e: any) { st402 = e.getStatus?.(); }
  check('C9 суудал дууссан (зэрэг бүртгэлд ялагдсан) → 402, exam үүсэхгүй, суудал буцаагдах шаардлагагүй', [st402, pc.calls.created, pc.calls.released.length], [402, 0, 0]);
  pc = pub({ createFails: true });
  const failRes = await quiet(async () => { try { await pc.svc.createPublicExam(3, dto); return 'no-error'; } catch (e: any) { return e.message; } });
  check('C10 exam үүсгэх унавал захиалсан суудал БУЦААГДАНА', [failRes, pc.calls.released], ['db down', [[3, 1]]]);

  const future = Date.now() + 3600_000;
  const past = Date.now() - 3600_000;
  const okSig = signQrExpiry(3, future);
  const pastSig = signQrExpiry(3, past);
  const reg = async (over: any, expiry: any) => {
    const h = pub(over);
    try { const r = await h.svc.createPublicExam(3, dto, expiry); return { r, created: h.calls.created }; } catch (e: any) { return { err: e.getStatus?.(), created: h.calls.created }; }
  };
  check('Q1 хугацаа өнгөрөөгүй, зөв гарын үсэг → бүртгэнэ', (await reg({}, { expires: String(future), sig: okSig })).r?.code, '300001');
  check('Q2 хугацаа дууссан QR → 410, exam үүсэхгүй', await reg({}, { expires: String(past), sig: pastSig }), { err: 410, created: 0 });
  check('Q3 expires-ийг өөрчилсөн (гарын үсэг таарахгүй) → 400', await reg({}, { expires: String(future + 999999999), sig: okSig }), { err: 400, created: 0 });
  check('Q4 sig-гүй expires / expires-гүй sig → 400', [(await reg({}, { expires: String(future) })).err, (await reg({}, { sig: okSig })).err], [400, 400]);
  check('Q5 өөр service-ийн гарын үсэг → 400', (await reg({}, { expires: String(future), sig: signQrExpiry(4, future) })).err, 400);
  check('Q6 хуучин (хугацаагүй) QR → хэвийн ажиллана', (await reg({}, undefined)).r?.code, '300001');
  check('Q7 хугацаа дууссан QR дээр АЛЬ ХЭДИЙН дуусаагүй бүртгэлтэй хүн үргэлжлүүлж чадна', (await reg({ existing: { code: '200001', finished: false } }, { expires: String(past), sig: pastSig })).r, { code: '200001', finished: false });
  const info = await pub().svc.getPublicServiceInfo(3, { expires: String(past), sig: pastSig });
  const info2 = await pub().svc.getPublicServiceInfo(3, { expires: String(future), sig: okSig });
  const info3 = await pub().svc.getPublicServiceInfo(3, { expires: String(future), sig: 'bad' });
  const info4 = await pub().svc.getPublicServiceInfo(3, {});
  check('Q8 public-info: expired / ok / invalid / хугацаагүй', [info, info2, info3, info4].map((i: any) => [i.expired, i.invalidLink]), [[true, false], [false, false], [false, true], [false, false]]);
  check('Q9 parseQrExpiry: ирээдүй ISO → ms; өнгөрсөн / 2 жил / хог → NaN; хоосон → null', [
    parseQrExpiry(new Date(future).toISOString()) === future, Number.isNaN(parseQrExpiry(new Date(past).toISOString())),
    Number.isNaN(parseQrExpiry(String(Date.now() + 2 * 366 * 86400_000))), Number.isNaN(parseQrExpiry('abc')), parseQrExpiry(undefined),
  ], [true, true, true, true, null]);


  console.log(failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} шалгалт унасан`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
