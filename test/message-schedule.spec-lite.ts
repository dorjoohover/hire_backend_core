/**
 * Товлосон урилга / сануулга: шалгалт, цуцлалт, хугацаа болоход илгээх, нөхцөл (DB / HTTP-гүй).
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/message-schedule.spec-lite.ts
 */
import { UserServiceService } from '../src/app/user.service/user.service.service';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`);
};
const err = (fn: () => Promise<any>) => fn().then(() => 'OK', (e) => e?.message);

const H = 3600_000;
const iso = (ms: number) => new Date(Date.now() + ms).toISOString();
const services: Record<number, any> = {
  1: { id: 1, count: 2, usedUserCount: 0, user: { id: 7 } },
  2: { id: 2, count: 5, usedUserCount: 0, user: { id: 7 } },
  3: { id: 3, count: 5, usedUserCount: 0, user: { id: 8 } },
};
const exams: Record<string, any> = {};
let examSeq = 0;
const mail: any[] = [];

const dao: any = {
  findOne: async (id: number) => services[id] ?? null,
  reserveSeats: async (id: number, n: number) => {
    const s = services[id];
    if (s.usedUserCount + n > s.count) return false;
    s.usedUserCount += n;
    return true;
  },
  releaseSeats: async (id: number, n: number) => (services[id].usedUserCount -= n),
};
const examService: any = {
  create: async (dto: any) => {
    const code = `E${++examSeq}`;
    exams[code] = { code, endDate: dto.endDate, service: { id: dto.service, user: services[dto.service].user } };
    return code;
  },
  updateExamByCode: async (code: string, data: any) => Object.assign(exams[code], data),
};
let rows: any[] = [];
const schedules: any = {
  add: async (r: any) => {
    const row = { ...r, id: rows.length + 1, status: 'pending', sendAt: new Date(r.sendAt) };
    rows.push(row);
    return row;
  },
  list: async (owner: number) => rows.filter((r) => r.owner === owner),
  cancel: async (id: number, owner?: number) => {
    const r = rows.find((x) => x.id === id && x.status === 'pending' && (owner == null || x.owner === owner));
    if (r) r.status = 'cancelled';
    return !!r;
  },
  claimDue: async () => {
    const due = rows.filter((r) => r.status === 'pending' && r.sendAt.getTime() <= Date.now());
    due.forEach((r) => (r.status = 'sending'));
    return due.map((r) => JSON.parse(JSON.stringify(r))); // DB-ээс ирэх шиг (Date → string)
  },
  finish: async (id: number, status: string, result: any) => Object.assign(rows.find((r) => r.id === id), { status, result }),
};

const svc = new UserServiceService(
  dao, {} as any, {} as any, examService,
  { findByCode: async (c: string) => exams[c] ?? null } as any,
  { findByEmail: async () => null, add: async () => undefined } as any,
  {} as any,
  { sendInvitation: async (x: any) => mail.push(x) } as any,
  {} as any, {} as any, {} as any, {} as any,
  { getActive: async () => ({}), findOne: async () => null } as any,
  schedules,
);

const org = { id: 7, role: 30 };
const links = [1, 2, 3].map((i) => ({ email: `U${i}@x.mn`, firstname: `N${i}`, lastname: 'L', phone: '', visible: true }));
const invite = (over: any = {}) => ({
  kind: 'invite' as const,
  sendAt: iso(H),
  services: [1, 2],
  startDate: iso(0),
  endDate: iso(48 * H),
  links,
  ...over,
});

(async () => {
  check('S1 өнгөрсөн цаг', await err(() => svc.schedule({ kind: 'remind', sendAt: iso(-10 * 60_000), codes: ['x'], email: true }, org)), 'Илгээх цагийг ирээдүйд сонгоно уу.');
  check('S2 сувгүй', await err(() => svc.schedule(invite({ noEmail: true }), org)), 'И-мэйл эсвэл SMS сонгоно уу.');
  check('S3 бусдын тест', await err(() => svc.schedule(invite({ services: [3] }), org)), 'Тест олдсонгүй.');
  check('S4 суудал хүрэлцэхгүй', await err(() => svc.schedule(invite({ services: [1] }), org)), 'Үлдэгдэл хүрэлцэхгүй байна.');
  check('S5 сануулга тест дууссаны дараа', await err(() => svc.schedule(invite({ remind: { sendAt: iso(49 * H) } }), org)), 'Сануулгын цаг урилга илгээх болон тест дуусах хугацааны хооронд байх ёстой.');
  check('S6 буруу и-мэйл', await err(() => svc.schedule(invite({ links: [{ email: 'bad' }] }), org)), 'И-мэйл хаяг буруу байна.');

  const a = await svc.schedule(invite({ remind: { sendAt: iso(24 * H), condition: 'notStarted' } }), org);
  check('S7 товлоход юу ч илгээхгүй, суудал авахгүй', [a.id, rows[0].status, rows[0].service, mail.length, services[1].usedUserCount], [1, 'pending', 1, 0, 0]);
  await svc.runDueSchedules();
  check('S8 цаг болоогүй бол илгээхгүй', [rows[0].status, mail.length], ['pending', 0]);

  check('S9 бусдынхыг цуцлахгүй', await err(() => svc.cancelSchedule(1, { id: 8, role: 30 })), 'Цуцлах боломжгүй — аль хэдийн илгээгдсэн эсвэл олдсонгүй.');
  const b = await svc.schedule(invite(), org);
  await svc.cancelSchedule(b.id, org);
  check('S10 цуцалсан + дахин цуцлахгүй', [rows[1].status, await err(() => svc.cancelSchedule(b.id, org))], ['cancelled', 'Цуцлах боломжгүй — аль хэдийн илгээгдсэн эсвэл олдсонгүй.']);

  rows[0].sendAt = new Date(Date.now() - 1000);
  await svc.runDueSchedules();
  const remindRow = rows[2];
  check(
    'S11 урилга: 2 тестээс суудал авч илгээнэ, нөхцөлт сануулга товлогдоно',
    [rows[0].status, rows[0].result.processed, mail.length, mail[0].isNewUser, services[1].usedUserCount, services[2].usedUserCount, remindRow?.kind, remindRow?.payload.codes, remindRow?.payload.condition, rows[1].status],
    ['done', 3, 3, true, 2, 1, 'remind', ['E1', 'E2', 'E3'], 'notStarted', 'cancelled'],
  );
  check('S12 хүлээн авагчийн мэдээлэл', [exams.E1.email, exams.E3.firstname], ['u1@x.mn', 'N3']);

  exams.E2.userStartDate = new Date();
  exams.E3.userEndDate = new Date();
  remindRow.sendAt = new Date(Date.now() - 1000);
  await svc.runDueSchedules();
  check('S13 сануулга: эхэлсэн/дууссаныг алгасна', [remindRow.status, remindRow.result.processed, remindRow.result.skipped, mail.length, mail[3].action], ['done', 1, 2, 4, 'sent reminder']);

  const c = await svc.schedule({ kind: 'remind', sendAt: iso(H), codes: ['E1', 'E2'], email: true }, org);
  check('S14 сануулга default нөхцөл = дуусгаагүй', [rows[c.id - 1].payload.condition, rows[c.id - 1].service], ['notFinished', 1]);
  check('S15 бусдын кодыг товлохгүй', await err(() => svc.schedule({ kind: 'remind', sendAt: iso(H), codes: ['E1'], email: true }, { id: 8, role: 30 })), 'Код танд хамаарахгүй: E1');
  rows[c.id - 1].payload.emailDraft = 999;
  rows[c.id - 1].sendAt = new Date(Date.now() - 1000);
  await svc.runDueSchedules();
  check('S16 алдаа → failed + шалтгаан', [rows[c.id - 1].status, rows[c.id - 1].result.error], ['failed', 'Сонгосон загвар олдсонгүй.']);

  const d = await svc.schedule(invite({ services: [2], links: links.slice(0, 2) }), org);
  services[2].usedUserCount = 4; // хооронд нь суудлаа өөр урилгад зарцуулсан
  rows[d.id - 1].sendAt = new Date(Date.now() - 1000);
  await svc.runDueSchedules();
  check('S17 илгээх мөчид суудал дутвал байгаагаар нь илгээж, үлдсэнийг мэдэгдэнэ', [rows[d.id - 1].status, rows[d.id - 1].result.processed, rows[d.id - 1].result.error], ['done', 1, '1 шалгуулагчид суудал хүрэлцсэнгүй.']);

  const list = await svc.listSchedules(org);
  check('S18 жагсаалт: тоо гарна, хүлээн авагчийн мэдээлэл гарахгүй', [list.length, list[0].count, list[0].email, 'links' in list[0], JSON.stringify(list).includes('u1@x.mn')], [5, 3, true, false, false]);

  console.log(failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`);
  process.exit(failed === 0 ? 0 : 1);
})();
