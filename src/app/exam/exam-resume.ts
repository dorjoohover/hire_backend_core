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
 * Бүлэг хооронд шилжих дүрэм — алгасахгүй:
 *   - Очих бүлгийн ӨМНӨХ бүх бүлгийн заавал бөглөх асуултууд бөглөгдсөн байх ёстой, өөрөөр хэлбэл
 *     "frontier" (бөглөгдөөгүй ЭХНИЙ бүлэг) хүртэлх аль ч бүлэг рүү шилжинэ.
 *   - 1→3 болохгүй (2 бөглөгдөөгүй) · 3→1, 3→2 болно (1, 2 бөглөгдсөн; 3 дутуу байсан ч) ·
 *     1,2,3 бөглөгдсөн бол 1→3, 1→4 болно · 2 дутуу бол 2→3 болохгүй.
 * Client тал: web/app/utils/examNavigation.js (ижил дүрэм).
 */
export function canNavigateTo(
  orderedCategoryIds: readonly number[],
  completed: { has(id: number): boolean },
  target: number,
  from?: number | null,
): boolean {
  const t = orderedCategoryIds.indexOf(Number(target));
  if (t === -1) return false;
  const f = from == null ? -1 : orderedCategoryIds.indexOf(Number(from));
  // Буцах / ижил бүлэг: одоогийн бүлэгт хүрсэн бол өмнөх бүлгүүд нь бөглөгдсөн.
  if (f !== -1 && t <= f) return true;
  // Бөглөсөн бүлгээс ДАРААГИЙН бүлэг рүү ("Дараах") үргэлж болно — хуучин өгөгдөлд (дүрмээс
  // өмнө алгассан / бүх асуулт нь нуугдсан бүлэг) өмнө нь цоорхой байсан ч гацахгүй.
  if (f !== -1 && t === f + 1 && completed.has(Number(from))) return true;
  return t <= pickResumeIndex(orderedCategoryIds, completed);
}

/**
 * Бөглөгдсөн бүлгүүдийн олонлог. `stored` (exam.completedCategories) null бол хуучин (энэ дүрмээс
 * өмнө эхэлсэн) шалгалт → хариулттай бүлгүүдийг бөглөгдсөн гэж үзнэ. `from`/`complete` (client-ийн
 * live шалгалт) өгөгдвөл тэр бүлгийг нэмнэ / хасна (буцаж ороод заавал асуултыг хоосолсон бол хасагдана).
 */
export function resolveCompletedCategories(
  stored: readonly (number | string)[] | null | undefined,
  answered: Iterable<number>,
  orderedCategoryIds: readonly number[],
  from?: number | null,
  complete?: boolean | null,
): { completed: Set<number>; changed: boolean } {
  const completed = new Set<number>(
    stored == null ? [...answered].map(Number) : stored.map(Number),
  );
  let changed = false;
  const f = from == null ? NaN : Number(from);
  if (typeof complete === 'boolean' && orderedCategoryIds.includes(f)) {
    if (complete && !completed.has(f)) {
      completed.add(f);
      changed = true;
    } else if (!complete && completed.has(f)) {
      completed.delete(f);
      changed = true;
    }
    // Анх удаа хадгалж байгаа (stored == null) бол seed-ийг ч бичнэ.
    if (stored == null) changed = true;
  }
  return { completed, changed };
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
