/**
 * №3 — шалгалтыг дундаас нь үргэлжлүүлэх (public QR ба бусад) цэвэр (DB-гүй) логикууд.
 * `test/exam-resume.spec-lite.ts`-ээр шалгагдана.
 */
import { createHash } from 'crypto';

/**
 * Seed-тэй тогтвортой "санамсаргүй" эрэмбэ. Ижил (seed, id) → үргэлж ижил дараалал, тиймээс
 * шалгуулагч дундаас нь гараад буцаж ороход асуулт / хариултын дараалал өөрчлөгдөхгүй.
 * (`ORDER BY RANDOM()`-ыг орлоно; questionCount < нийт үед сонгогдох дэд олонлог ч тогтвортой.)
 */
export function stableShuffle<T>(
  items: readonly T[],
  seed: string,
  idOf: (item: T) => string | number,
): T[] {
  return items
    .map((item) => ({
      item,
      key: createHash('md5').update(`${seed}:${idOf(item)}`).digest('hex'),
    }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((x) => x.item);
}

/**
 * Үргэлжлүүлэх хэсгийн индекс: хариулаагүй ЭХНИЙ хэсэг. Бүгд хариулагдсан боловч шалгалт
 * дуусаагүй бол (сүүлийн `end` илгээлт унасан) СҮҮЛИЙН хэсэг — хэрэглэгч дахин илгээж дуусгана.
 */
export function pickResumeIndex(
  orderedCategoryIds: readonly number[],
  answered: { has(id: number): boolean },
): number {
  if (!orderedCategoryIds.length) return -1;
  const i = orderedCategoryIds.findIndex((id) => !answered.has(id));
  return i === -1 ? orderedCategoryIds.length - 1 : i;
}

/**
 * Хэсгийн (category) хугацаа хэзээ эхэлснийг тодорхойлно.
 *  - `explicit` (хэрэглэгч хэсэг рүү шилжсэн): үргэлж ШИНЭ эхлэл (өмнөх зан төлөвтэй ижил).
 *  - үгүй (нээх / reload / resume): аль хэдийн ЭНЭ хэсэгт эхэлсэн бол хуучин цагийг хэвээр.
 */
export function nextCategoryStart(
  cur: { categoryStartedFor?: number | null; categoryStartedAt?: Date | string | null },
  categoryId: number,
  explicit: boolean,
  now: Date,
): { startedAt: Date; changed: boolean } {
  if (
    !explicit &&
    cur.categoryStartedAt &&
    Number(cur.categoryStartedFor) === Number(categoryId)
  ) {
    return { startedAt: new Date(cur.categoryStartedAt), changed: false };
  }
  return { startedAt: now, changed: true };
}

export const PUBLIC_OPEN_REUSE_DAYS = 7;
export const PUBLIC_DONE_REUSE_HOURS = 24;

export interface ReuseCandidate {
  code: string;
  createdAt: Date | string;
  userEndDate?: Date | string | null;
}

/**
 * Public QR: ижил утас / и-мэйлтэй хүн дахин бүртгүүлэхэд шинэ exam (квот) үүсгэх үү, байгааг нь буцаах уу.
 *  - ДУУСААГҮЙ exam (7 хоногийн дотор) → үргэлжлүүлнэ `{finished:false}`.
 *  - ДУУССАН exam (24 цагийн дотор) → давхар квот зарцуулахгүй, үр дүн рүү `{finished:true}`.
 *  - бусад → null (шинэ exam).
 */
export function decidePublicReuse(
  candidates: readonly ReuseCandidate[],
  now: Date = new Date(),
): { code: string; finished: boolean } | null {
  const t = now.getTime();
  const created = (c: ReuseCandidate) => new Date(c.createdAt).getTime();
  const sorted = [...candidates].sort((a, b) => created(b) - created(a));
  const open = sorted.find(
    (c) => !c.userEndDate && t - created(c) <= PUBLIC_OPEN_REUSE_DAYS * 86400_000,
  );
  if (open) return { code: open.code, finished: false };
  const done = sorted.find(
    (c) => !!c.userEndDate && t - created(c) <= PUBLIC_DONE_REUSE_HOURS * 3600_000,
  );
  if (done) return { code: done.code, finished: true };
  return null;
}
