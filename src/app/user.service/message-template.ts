import axios from 'axios';

/**
 * Хэрэглэгч рүү явах урилга / сануулгын драфтын төрлүүд (message_draft.type, admin засна).
 * Идэвхтэй драфтгүй бол DEFAULT_TEMPLATES. Хувьсагч: {lastname} {firstname} {org} {test} {deadline} {link}.
 * И-мэйлийн body нь HTML, SMS нь энгийн текст.
 */
export type MessageTemplates = {
  inviteEmail?: string;
  inviteSms?: string;
  remindEmail?: string;
  remindSms?: string;
};

export const TEMPLATE_KEYS: (keyof MessageTemplates)[] = [
  'inviteEmail',
  'inviteSms',
  'remindEmail',
  'remindSms',
];

export const DEFAULT_TEMPLATES: Required<MessageTemplates> = {
  inviteEmail:
    '<p>Эрхэм <strong>{lastname}</strong> овогтой <strong>{firstname}</strong> танд <strong>{org}</strong> байгууллагаас <strong>{test}</strong> онлайн тест, үнэлгээнд оролцох урилга илгээсэн байна.</p>' +
    '<p>Та <strong>"Тест өгөх"</strong> товч дээр дарж тест, үнэлгээндээ оролцоно уу. Тус товч дээр дарснаар тест автоматаар эхлэх тул тестийн тухай мэдээлэл, асуумжид хариулах заавартай нухацтай танилцана уу.</p>' +
    '<p>Тест, үнэлгээний линк {deadline} хүртэл хүчинтэй ажиллахыг анхаарна уу. Танд амжилт хүсье.</p>',
  inviteSms: '{org}: {test} testiin urilga. {deadline} hurtel: {link}',
  remindEmail:
    '<p>Эрхэм <strong>{lastname}</strong> овогтой <strong>{firstname}</strong> танд <strong>{org}</strong> байгууллагаас илгээсэн <strong>{test}</strong> тестийг та хараахан бөглөж дуусгаагүй байна.</p>' +
    '<p>Тест, үнэлгээний линк {deadline} хүртэл хүчинтэй тул амжиж бөглөнө үү.</p>',
  remindSms: 'Sanuulga: {test} testee {deadline}-s omno buglunu uu. {link}',
};

export const examLink = (code: string) =>
  `${(process.env.WEB || 'https://hire.mn').replace(/\/$/, '')}/exam/${code}`;

export const DEFAULT_SUBJECTS = {
  invite: 'Танд тестийн урилга ирлээ',
  remind: 'Сануулга: тестээ бөглөнө үү',
};

/** {нэр} — кирилл нэртэй хувьсагч ч болно (масс SMS-ийн Excel багана). */
export const VAR_RE = /\{([\p{L}\p{N}_]+)\}/gu;

export const fillTemplate = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(VAR_RE, (m, k) => vars[k] ?? m);

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** HTML драфт: хувьсагчийн утгыг escape хийнэ (драфт өөрөө admin-ийн итгэмжлэгдсэн HTML), {link} → холбоос. */
export const fillHtml = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (m, k) => {
    if (vars[k] == null) return m;
    const v = escapeHtml(vars[k]);
    return k === 'link'
      ? `<a href="${v}" style="color: #ff5000; word-break: break-all;">${v}</a>`
      : v;
  });

const CYR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', ө: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ү: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sh', ъ: '', ы: 'y', ь: 'i', э: 'e', ю: 'yu', я: 'ya',
};

export const SMS_MAX = 160;

/** Skytel WebSMS зөвхөн латин, 1 segment (160) хүлээн авна → кирилл хөрвүүлж, үлдсэн ASCII бус тэмдэгтийг хасна. */
export const toSmsText = (text: string) =>
  [...text]
    .map((c) => {
      const low = c.toLowerCase();
      const t = CYR[low];
      if (t === undefined) return c;
      return c !== low && t ? t[0].toUpperCase() + t.slice(1) : t;
    })
    .join('')
    .replace(/[^\x20-\x7E]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();

/**
 * Драфтыг SMS болгоно. 160-аас хэтэрвэл {test}-ийг багтахуйц тайрна (тестийн нэр ихэвчлэн урт).
 * shortcut: {test} драфтад нэг л удаа байна гэж тооцно; олон удаа бол урт хэтэрч sendSkytelSms алдаа шиднэ.
 */
export const renderSms = (tpl: string, vars: Record<string, string>) => {
  const text = toSmsText(fillTemplate(tpl, vars));
  if (text.length <= SMS_MAX || !tpl.includes('{test}')) return text;
  // '..'-аар хэмждэг: хоосон утга давхар зайг нэгтгэж 1 тэмдэгт буруу тооцдог.
  const room =
    SMS_MAX - toSmsText(fillTemplate(tpl, { ...vars, test: '..' })).length;
  const test = toSmsText(vars.test ?? '').slice(0, Math.max(0, room));
  return toSmsText(fillTemplate(tpl, { ...vars, test: `${test}..` }));
};

/** "+976 9911-2233" → "99112233". */
export const normalizePhone = (p: unknown) =>
  String(p ?? '')
    .replace(/\D/g, '')
    .replace(/^976(?=\d{8}$)/, '');

/** Skytel-д явуулахын өмнөх шалгалт (масс SMS-ийн dryRun-д ч ашиглана). */
export const smsError = (phone: string, text: string) => {
  if (!/^\d{8}$/.test(phone)) return `Утасны дугаар буруу: ${phone}`;
  if (!text) return 'Мессеж хоосон байна';
  if (text.length > SMS_MAX) return `SMS ${text.length} тэмдэгт (${SMS_MAX}-аас их)`;
};

/** https://websms.skytel.mn → API хэсэг. Токен: SKYTEL_SMS_TOKEN. */
export async function sendSkytelSms(phone: string, text: string) {
  const token = process.env.SKYTEL_SMS_TOKEN;
  if (!token) throw new Error('SKYTEL_SMS_TOKEN тохируулаагүй байна');
  const invalid = smsError(phone, text);
  if (invalid) throw new Error(invalid);
  const res = await axios.post(
    process.env.SKYTEL_SMS_URL || 'https://websms.skytel.mn/api/v1/sms/send',
    // Skytel-ийн жишээнд phone нь тоо.
    { phone: Number(phone), text },
    {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
      validateStatus: () => true,
    },
  );
  if (!res.data?.success)
    throw new Error(
      `SMS: ${res.data?.message || res.data?.error_code || res.status}`,
    );
  return res.data.result as { message_id: number; status: string };
}
