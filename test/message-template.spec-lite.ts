/**
 * Байгууллагын урилга / сануулгын драфт, SMS (Skytel) болон эзэмшигчийн шалгалт (DB / HTTP-гүй).
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/message-template.spec-lite.ts
 */
import { UserServiceService } from '../src/app/user.service/user.service.service';
import {
  DEFAULT_TEMPLATES,
  fillTemplate,
  renderSms,
  toSmsText,
} from '../src/app/user.service/message-template';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`);
};

check('T1 fillTemplate: хувьсагч орлуулна, үл мэдэгдэхийг хэвээр', fillTemplate('{a}-{b}', { a: 'x' }), 'x-{b}');
check('T2 toSmsText: кирилл → латин (том үсэг)', toSmsText('Өдрийн мэнд, Шинэ ЧАТ'), 'Odriin mend, Shine ChAT');
check('T3 toSmsText: ASCII бус тэмдэгт хасна, мөр шилжилт → зай', toSmsText('№1 “тест”\nлинк'), '1 test link');
const longTest = 'Хиймэл оюун ухаан(AI)-ыг ашиглах мэдлэг, чадварыг тодорхойлох тест';
const sms = renderSms(DEFAULT_TEMPLATES.inviteSms, { org: 'Монгол Шуудан ХК', test: longTest, deadline: '2026.10.30 18:00', link: 'https://hire.mn/exam/12345678901234567' });
check('T4 renderSms: урт тестийн нэрийг тайрч 160-д багтаана, холбоос бүтэн', [sms.length <= 160, sms.endsWith('https://hire.mn/exam/12345678901234567'), sms.includes('..')], [true, true, true]);

const mail: any[] = [];
const future = new Date(Date.now() + 86400000);
const exams: Record<string, any> = {
  A: { code: 'A', email: 'a@x.mn', phone: '99112233', endDate: future, assessment: { name: 'DISC' }, service: { user: { id: 7, organizationName: 'Хайр' } } },
  B: { code: 'B', email: 'b@x.mn', endDate: future, userEndDate: new Date(), service: { user: { id: 7 } } },
  C: { code: 'C', email: 'c@x.mn', endDate: new Date(Date.now() - 1000), service: { user: { id: 7 } } },
  D: { code: 'D', email: 'd@x.mn', endDate: future, service: { user: { id: 8 } } },
};
// message_draft-ийг дуурайна (type бүрт нэг идэвхтэй).
let drafts: any[] = [];
let seq = 0;
const draftDao: any = {
  getActive: async () => Object.fromEntries(drafts.filter((d) => d.active).map((d) => [d.type, d])),
  findOne: async (id: number) => drafts.find((d) => d.id === id) ?? null,
  save: async (d: any) => {
    if (d.active) drafts.filter((x) => x.type === d.type).forEach((x) => (x.active = false));
    const row = d.id ? Object.assign(drafts.find((x) => x.id === d.id), d) : { ...d, id: ++seq };
    if (!d.id) drafts.push(row);
    return row;
  },
};
const svc = new UserServiceService(
  {} as any, {} as any, {} as any, {} as any,
  { findByCode: async (c: string) => exams[c] ?? null } as any,
  {} as any, {} as any,
  { sendInvitation: async (x: any) => mail.push(x), previewInvitation: (x: any) => `<html>${x.body}</html>` } as any,
  {} as any, {} as any, {} as any, {} as any,
  draftDao,
);

(async () => {
  // SMS-ийг жинхэнээр илгээхгүй: токенгүй үед алдаа шиддэг → failures-д орно.
  delete process.env.SKYTEL_SMS_TOKEN;
  const r = await svc.remind({ codes: ['A', 'B', 'C', 'D', 'X'], email: true }, 7);
  check(
    'R1 remind: дууссан/хугацаа дууссаныг алгасна, бусдын болон байхгүй кодыг хориглоно',
    [r.processed, r.skipped, r.failed, r.failures?.map((f) => f.code)],
    [1, 2, 2, ['D', 'X']],
  );
  check('R2 remind мэйл: сануулгын гарчиг + драфт текст', [mail[0].subject, mail[0].body.includes('DISC'), mail[0].isNewUser], ['Сануулга: тестээ бөглөнө үү', true, false]);
  exams.A.endDate = new Date('2026-10-30T10:00:00Z');
  await svc.remind({ codes: ['A'], email: true }, 7);
  check('R5 хугацааг Улаанбаатарын цагаар (UTC+8)', [mail[1]?.hour, mail[1]?.body.includes('2026.10.30 18:00')], ['18', true]);
  const r2 = await svc.remind({ codes: ['A'], sms: true }, 7);
  check('R3 remind SMS: токенгүй → тодорхой алдаа', r2.failures?.[0].error, 'SKYTEL_SMS_TOKEN тохируулаагүй байна');
  const r3 = await svc.remind({ codes: ['D'], email: true });
  check('R4 admin (owner байхгүй): бусдын кодыг ч илгээнэ', r3.processed, 1);

  const err = async (fn: () => Promise<any>) => fn().then(() => '', (e) => e.message);
  const d1 = await svc.saveDraft({ name: 'Сануулга 1', type: 'remindEmail', subject: '{test} — сануулга', body: '<p>Сайн уу {firstname}, <b>{test}</b>: {link}</p>', active: true });
  const d2 = await svc.saveDraft({ name: 'Сануулга 2', type: 'remindEmail', body: '<p>Хоёр дахь</p>', active: false });
  exams.D.firstname = '<script>x</script>';
  await svc.remind({ codes: ['D'], email: true });
  const last = mail[mail.length - 1];
  check('S1 идэвхтэй драфт бүх илгээгчид үйлчилнэ (гарчиг + HTML + {link} холбоос)', [last.subject, last.body.startsWith('<p>Сайн уу'), last.body.includes('<a href="http')], [' — сануулга', true, true]);
  check('S2 хувьсагчийн утгыг HTML escape хийнэ', last.body.includes('&#60;script&#62;'), true);
  await svc.saveDraft({ ...d2, active: true }, d2.id);
  check('S3 өөрийг идэвхжүүлэхэд өмнөх идэвхтэй унтарна', [d1.active, drafts.find((d) => d.id === d2.id).active], [false, true]);
  check('S4 SMS: 160-аас урт драфт', (await err(() => svc.saveDraft({ name: 'x', type: 'remindSms', body: 'x'.repeat(150) + '{link}' }))).startsWith('SMS драфт'), true);
  check('S5 SMS: {link}-гүй драфт', (await err(() => svc.saveDraft({ name: 'x', type: 'inviteSms', body: 'Link-gui' }))).includes('{link}'), true);
  check('S6 буруу төрөл / нэргүй / хоосон текст', [
    await err(() => svc.saveDraft({ name: 'x', type: 'foo', body: 'a' })),
    await err(() => svc.saveDraft({ name: ' ', type: 'inviteEmail', body: 'a' })),
    await err(() => svc.saveDraft({ name: 'x', type: 'inviteEmail', body: '<p></p>' })),
  ], ['Загварын төрөл буруу байна.', 'Загварын нэр оруулна уу (120 хүртэл тэмдэгт).', 'Мессежийн текст оруулна уу.']);
  const pv: any = await svc.previewDraft({ type: 'inviteEmail', subject: 'Урилга: {test}', body: '<p>{firstname}</p>' });
  check('S7 preview мэйл: жишээ утгаар бөглөнө', [pv.subject, pv.html], ['Урилга: DISC зан төлөвийн тест', '<html><p>Болд</p></html>']);
  const ps: any = await svc.previewDraft({ type: 'inviteSms' });
  check('S8 preview SMS: default + урт', [ps.text.startsWith('Hire HHK:'), ps.length <= 160], [true, true]);
  const sample = { lastname: 'Bat', firstname: 'Dorj', org: 'Хайр', test: 'x'.repeat(40), deadline: '2026.01.01 18:00', link: 'https://hire.mn/exam/' + '1'.repeat(17) };
  check('S3 default SMS драфтууд 160-д багтана', ['inviteSms', 'remindSms'].map((k) => toSmsText(fillTemplate(DEFAULT_TEMPLATES[k], sample)).length <= 160), [true, true]);

  console.log(failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`);
  process.exit(failed === 0 ? 0 : 1);
})();
