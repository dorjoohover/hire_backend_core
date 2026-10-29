/**
 * Байгууллагын урилга / сануулгын драфт, SMS (Skytel) болон эзэмшигчийн шалгалт (DB / HTTP-гүй).
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/message-template.spec-lite.ts
 */
import { UserServiceService } from '../src/app/user.service/user.service.service';
import {
  DEFAULT_TEMPLATES,
  fillTemplate,
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

const mail: any[] = [];
const sms: any[] = [];
const future = new Date(Date.now() + 86400000);
const exams: Record<string, any> = {
  A: { code: 'A', email: 'a@x.mn', phone: '99112233', endDate: future, assessment: { name: 'DISC' }, service: { user: { id: 7, organizationName: 'Хайр' } } },
  B: { code: 'B', email: 'b@x.mn', endDate: future, userEndDate: new Date(), service: { user: { id: 7 } } },
  C: { code: 'C', email: 'c@x.mn', endDate: new Date(Date.now() - 1000), service: { user: { id: 7 } } },
  D: { code: 'D', email: 'd@x.mn', endDate: future, service: { user: { id: 8 } } },
};
const users: Record<number, any> = { 7: { id: 7, organizationName: 'Хайр' } };
const svc = new UserServiceService(
  {} as any, {} as any, {} as any, {} as any,
  { findByCode: async (c: string) => exams[c] ?? null } as any,
  {
    get: async (id: number) => users[id],
    setMessageTemplates: async (id: number, t: any) => (users[id].messageTemplates = t),
  } as any,
  {} as any,
  { sendInvitation: async (x: any) => mail.push(x) } as any,
  {} as any, {} as any, {} as any, {} as any,
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

  await svc.saveTemplates(7, { inviteSms: 'Sain uu {firstname}. {link}', remindEmail: '' } as any);
  check('S1 saveTemplates: хоосныг хаяна', users[7].messageTemplates, { inviteSms: 'Sain uu {firstname}. {link}' });
  let err = '';
  try {
    await svc.saveTemplates(7, { remindSms: 'x'.repeat(150) + '{link}' });
  } catch (e: any) {
    err = e.message;
  }
  check('S2 saveTemplates: 160-аас урт SMS драфтыг хүлээж авахгүй', err.startsWith('SMS драфт'), true);
  try {
    await svc.saveTemplates(7, { inviteSms: 'Link-gui msg' });
  } catch (e: any) {
    err = e.message;
  }
  check('S4 saveTemplates: {link}-гүй SMS драфтыг хүлээж авахгүй', err.includes('{link}'), true);
  const sample = { lastname: 'Bat', firstname: 'Dorj', org: 'Хайр', test: 'x'.repeat(40), deadline: '2026.01.01 18:00', link: 'https://hire.mn/exam/' + '1'.repeat(17) };
  check('S3 default SMS драфтууд 160-д багтана', ['inviteSms', 'remindSms'].map((k) => toSmsText(fillTemplate(DEFAULT_TEMPLATES[k], sample)).length <= 160), [true, true]);

  console.log(failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`);
  process.exit(failed === 0 ? 0 : 1);
})();
