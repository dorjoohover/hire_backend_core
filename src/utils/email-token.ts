import { createHmac, timingSafeEqual } from 'crypto';
import { jwtConstants } from 'src/auth/constants';

/**
 * И-мэйл баталгаажуулах холбоосын гарын үсэгтэй, хугацаатай token.
 *
 * ⚠️ Өмнө нь холбоос `…/user/email/confirm/${email}` байсан — и-мэйл хаягийг
 * мэддэг хэн ч (мэйл хайрцгийг нь эзэмшихгүй байсан ч) тухайн хаягийг
 * "баталгаажсан" болгож чаддаг байв. Одоо холбоос нь зөвхөн сервер л үүсгэж
 * чадах HMAC-тай, 24 цагийн хугацаатай token агуулна.
 *
 * Формат: `base64url(JSON{e: email, x: expEpochSec}).base64url(HMAC-SHA256)`.
 * JWT БИШ — зориуд: access token-ийн стратеги (passport-jwt) энэ token-ийг
 * нэвтрэлтийн token гэж хүлээж авахгүй. Түлхүүрийг `EMAIL_CONFIRM_SECRET`
 * (байхгүй бол JWT_SECRET)-ээс, "email-confirm-v1" зориулалтаар ялгаж гаргана —
 * өөр зориулалтын гарын үсэг энд хүчинтэй болохгүй.
 */
export const EMAIL_CONFIRM_TTL_MS = 24 * 60 * 60 * 1000;
const PURPOSE = 'email-confirm-v1';

const signingKey = () =>
  createHmac('sha256', process.env.EMAIL_CONFIRM_SECRET || jwtConstants.secret)
    .update(PURPOSE)
    .digest();

const sign = (payload: string) =>
  createHmac('sha256', signingKey()).update(payload).digest('base64url');

export function signEmailToken(
  email: string,
  ttlMs = EMAIL_CONFIRM_TTL_MS,
  now = Date.now(),
): string {
  const payload = Buffer.from(
    JSON.stringify({
      e: email.toLowerCase(),
      x: Math.floor((now + ttlMs) / 1000),
    }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Хүчинтэй бол и-мэйлийг, үгүй бол (буруу гарын үсэг / хугацаа дууссан / эвдэрсэн) null. */
export function verifyEmailToken(
  token: unknown,
  now = Date.now(),
): string | null {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }

  try {
    const { e, x } = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    if (typeof e !== 'string' || !e || !Number.isFinite(x)) return null;
    if (now / 1000 > x) return null;
    return e;
  } catch {
    return null;
  }
}
