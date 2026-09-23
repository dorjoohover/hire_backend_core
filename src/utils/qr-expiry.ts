import { createHmac, timingSafeEqual } from 'crypto';
import { jwtConstants } from 'src/auth/constants';

/**
 * Public QR-ийн хүчинтэй хугацаа (`?expires=<epoch ms>&sig=<HMAC>`).
 *
 * ⚠️ Өмнө нь `?expires=` нь зөвхөн UI-ийн query param байсан — сервер ч, public хуудас ч шалгадаггүй тул
 * "хугацаатай QR" үнэндээ хугацаагүй, мөн хэн ч утгыг нь өөрчилж болно. Одоо `expires`-ийг сервер
 * (service-ийн id-тай хамт) HMAC-аар гарын үсэглэж, `public-info` / `public-register`-т шалгана.
 * `expires` / `sig` байхгүй (хуучин хэвлэсэн QR) → хугацаагүй, өмнөх шигээ ажиллана.
 *
 * Түлхүүр: `QR_EXPIRY_SECRET` (байхгүй бол JWT_SECRET), "qr-expiry-v1" зориулалтаар ялгасан.
 */
const PURPOSE = 'qr-expiry-v1';
export const QR_EXPIRY_MAX_MS = 366 * 24 * 3600 * 1000;
export const QR_EXPIRY_MIN_MS = 60 * 1000;

const signingKey = () =>
  createHmac('sha256', process.env.QR_EXPIRY_SECRET || jwtConstants.secret)
    .update(PURPOSE)
    .digest();

const sign = (serviceId: number, expiresMs: number) =>
  createHmac('sha256', signingKey())
    .update(`${serviceId}.${expiresMs}`)
    .digest('base64url');

export function signQrExpiry(serviceId: number, expiresMs: number): string {
  return sign(serviceId, expiresMs);
}

export type QrExpiryStatus = 'none' | 'ok' | 'expired' | 'invalid';

/**
 *  none    — expires / sig аль нь ч ирээгүй (хугацаагүй QR)
 *  invalid — нэг нь л ирсэн, эсвэл гарын үсэг таарахгүй / хэлбэр буруу
 *  expired — гарын үсэг зөв, гэхдээ хугацаа өнгөрсөн
 *  ok      — гарын үсэг зөв, хугацаа өнгөрөөгүй
 */
export function checkQrExpiry(
  serviceId: number,
  expires: unknown,
  sig: unknown,
  now = Date.now(),
): QrExpiryStatus {
  const has = (v: unknown) => v !== undefined && v !== null && v !== '';
  if (!has(expires) && !has(sig)) return 'none';
  if (!has(expires) || !has(sig)) return 'invalid';
  const ms = Number(expires);
  if (!Number.isSafeInteger(ms) || ms <= 0 || typeof sig !== 'string' || sig.length > 200) {
    return 'invalid';
  }
  const expected = Buffer.from(sign(serviceId, ms));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return 'invalid';
  }
  return ms > now ? 'ok' : 'expired';
}

/** `expires` (ISO / epoch ms) → epoch ms, эсвэл null. Ирээдүйд (≥ 1 мин), ≤ 366 хоног байх ёстой. */
export function parseQrExpiry(value: unknown, now = Date.now()): number | null {
  if (value === undefined || value === null || value === '') return null;
  const ms = /^\d+$/.test(String(value)) ? Number(value) : Date.parse(String(value));
  if (!Number.isFinite(ms)) return NaN;
  if (ms < now + QR_EXPIRY_MIN_MS || ms > now + QR_EXPIRY_MAX_MS) return NaN;
  return Math.floor(ms);
}
