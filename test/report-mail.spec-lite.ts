/**
 * Тайлан бэлэн болсны мэйл (UserAnswerService.sendEmail → EmailService.sendReportMail): хэнд явах / явахгүй, template.
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/report-mail.spec-lite.ts
 */
import { UserAnswerService } from '../src/app/user.answer/user.answer.service';
import { EmailService } from '../src/app/email/email.service';
import { EmailLogType } from '../src/base/constants';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`);
};

const sent: any[] = [];
const exams: Record<string, any> = {
  '1': { visible: true, user: { email: 'u@t.mn' }, email: 'other@t.mn', assessment: { id: 4, name: 'DISC' }, assessmentName: 'DISC' },
  '2': { visible: true, user: null, email: 'qr@t.mn', assessment: { id: 4, name: 'DISC' } },
  '3': { visible: false, user: { email: 'u@t.mn' }, assessment: { id: 4, name: 'DISC' } },
  '4': { visible: true, isPreview: true, user: { email: 'admin@t.mn' }, assessment: { id: 4, name: 'DISC' } },
  '5': { visible: true, user: null, email: null, assessment: { id: 4, name: 'DISC' } }, // код гаргасан, и-мэйлгүй (k6 / байгууллага)
  '6': { visible: true, user: { email: 'u@t.mn' }, assessment: null },
};
const ua: any = {
  examDao: { findByCode: async (c: number) => exams[`${c}`] ?? null },
  mailService: { sendReportMail: async (i: any) => void sent.push(i) },
};
const send = (c: string, logId?: number) => UserAnswerService.prototype.sendEmail.call(ua, c, logId);

(async () => {
  await send('1', 77);
  check('R1 хэрэглэгчийн и-мэйл рүү, logId дамжина', sent[0], { code: '1', email: 'u@t.mn', assessmentName: 'DISC', id: 4, logId: 77, name: 'DISC' });
  await send('2');
  check('R2 QR (user null) → exam.email', sent[1]?.email, 'qr@t.mn');
  for (const c of ['3', '4', '5', '6', '404']) await send(c);
  check('R3 нуусан / preview / и-мэйлгүй / тестгүй / байхгүй код → мэйл явахгүй', sent.length, 2);

  // Template: href хашилттай, тестийн нэр escape хийгдсэн.
  const queued: any[] = [];
  const es: any = Object.create(EmailService.prototype);
  es.logAndQueue = async (p: any) => void queued.push(p);
  await es.sendReportMail({ email: 'u@t.mn', id: 4, name: 'A&B <i>', code: '123', assessmentName: 'A&B' });
  const html: string = queued[0].html;
  check('T1 REPORT төрөл, хүлээн авагч, гарчиг', [queued[0].type, queued[0].to, queued[0].subject, queued[0].meta.code], [EmailLogType.REPORT, 'u@t.mn', 'Таны тайлан бэлэн боллоо', '123']);
  check('T2 холбоосууд хашилттай', [/href="https:\/\/[^"]+\/test\/4"/.test(html), /href="https:\/\/[^"]+\/api\/report\/123"/.test(html)], [true, true]);
  check('T3 тестийн нэр escape (HTML эвдэхгүй)', [html.includes('A&#38;B &#60;i&#62;'), html.includes('<i>')], [true, false]);

  console.log(failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`);
  process.exit(failed === 0 ? 0 : 1);
})();
