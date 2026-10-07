/**
 * Studio тайлангийн ЗӨВХӨН загварыг (pdf_template) орчин хооронд зөөх формат — 2026-10-07.
 *
 *   test Studio → "JSON татах" → prod Studio → "JSON-оос оруулах" (тест сонгоно).
 *
 * Тест (асуулт, хариулт) аль хэдийн хоёр орчинд байгаа (assessment bundle-ээр зөөсөн эсвэл
 * гараар) — зөвхөн загварын дизайн, түүний хувьсагчид (assessment_variable) ба Studio-гийн
 * зургууд зөөгдөнө. Асуултын ID орчин бүрт өөр тул `{{question[<id>]…}}` token-уудыг
 * асуултын "гарын үсгээр" (бүлгийн нэр + асуултын текст → текст → байрлал) зорилтот тестийн
 * асуулт руу хөрвүүлнэ. "wheel-radar"-ын тэнхлэг (хариултын ангиллын ID) нэрээр хөрвөнө.
 * `category[i]` / `answerCategory[i]` нь дугаар тул хөндөгдөхгүй.
 *
 * Энэ файл DB / Nest-гүй (test/template-bundle.spec-lite.ts шалгана).
 */
import type { BundleFile, Fields } from './assessment-bundle';
import { isSafeFileKey } from './assessment-bundle';

export const TEMPLATE_BUNDLE_FORMAT = 'hire-template-bundle';
export const TEMPLATE_BUNDLE_VERSION = 1;

/** Асуултын "гарын үсэг" — ID-гүйгээр зорилтот тестээс ижил асуултыг олоход. */
export interface QuestionSig {
  id: number;
  type: number | null;
  name: string;
  categoryName: string;
  /** Тест доторх бүлгийн дараалал (orderNumber, id) — 1-ээс */
  categoryIndex: number;
  /** Бүлэг доторх асуултын дараалал (orderNumber, id) — 1-ээс */
  questionIndex: number;
}

export interface AnswerCategorySig {
  id: number;
  name: string;
  parentName: string | null;
}

export interface TemplateBundle {
  format: typeof TEMPLATE_BUNDLE_FORMAT;
  version: number;
  exportedAt: string;
  source: { templateId: number; templateName: string; assessmentId: number | null; assessmentName: string | null };
  template: { fields: Fields };
  variables: { fields: Fields }[];
  /** Загвар / хувьсагчид заасан асуултууд */
  questions: QuestionSig[];
  /** Эх тестийн хариултын ангиллууд (wheel тэнхлэгийг нэрээр хөрвүүлэхэд) */
  answerCategories: AnswerCategorySig[];
  files: BundleFile[];
  missingFiles: string[];
}

const QUESTION_ID = /\bquestion\s*\[\s*(\d+)\s*\]/g;

/** Утга (string / массив / объект) доторх бүх `question[<id>]`-ийн ID. */
export function questionIdsIn(value: unknown, out: Set<number> = new Set()): Set<number> {
  if (typeof value === 'string') {
    for (const m of value.matchAll(QUESTION_ID)) out.add(Number(m[1]));
  } else if (Array.isArray(value)) {
    for (const v of value) questionIdsIn(v, out);
  } else if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const v of Object.values(value as any)) questionIdsIn(v, out);
  }
  return out;
}

/** Харьцуулахад: HTML tag, &nbsp;, илүү зай, том/жижиг үсгийг үл тоомсорлоно. */
export function normText(s: unknown): string {
  return String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** DB-ийн мөрүүдээс (бүлэг, асуултын дарааллаар эрэмбэлсэн) гарын үсэг. */
export function questionSigs(
  rows: { id: number; type: number | null; name: string; categoryId: number; categoryName: string }[],
): QuestionSig[] {
  const catIndex = new Map<number, number>();
  const qIndex = new Map<number, number>();
  return rows.map((r) => {
    if (!catIndex.has(r.categoryId)) catIndex.set(r.categoryId, catIndex.size + 1);
    const qi = (qIndex.get(r.categoryId) ?? 0) + 1;
    qIndex.set(r.categoryId, qi);
    return {
      id: Number(r.id),
      type: r.type == null ? null : Number(r.type),
      name: String(r.name ?? ''),
      categoryName: String(r.categoryName ?? ''),
      categoryIndex: catIndex.get(r.categoryId)!,
      questionIndex: qi,
    };
  });
}

export type MatchHow = 'name' | 'text' | 'position';
export interface QuestionMatch {
  map: Map<number, number>;
  how: Record<MatchHow, number>;
  unmatched: QuestionSig[];
}

/**
 * Эх асуултуудыг зорилтот тестийн асуулттай тааруулна (давхар оноохгүй):
 *   1) бүлгийн нэр + асуултын текст ижил (зорилтод ганц) → 'name'
 *   2) асуултын текст ижил (зорилтод ганц) → 'text'
 *   3) ижил бүлгийн дугаар + асуултын дугаар + ижил төрөл → 'position'
 */
export function matchQuestions(src: QuestionSig[], target: QuestionSig[]): QuestionMatch {
  const map = new Map<number, number>();
  const how: Record<MatchHow, number> = { name: 0, text: 0, position: 0 };
  const used = new Set<number>();
  const index = (key: (q: QuestionSig) => string) => {
    const m = new Map<string, QuestionSig[]>();
    for (const q of target) {
      const k = key(q);
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(q);
    }
    return m;
  };
  const byCatName = index((q) => (normText(q.name) ? `${normText(q.categoryName)}|${normText(q.name)}` : ''));
  const byName = index((q) => normText(q.name));
  const byPos = index((q) => `${q.categoryIndex}|${q.questionIndex}`);
  const take = (s: QuestionSig, cands: QuestionSig[] | undefined, h: MatchHow, check?: (q: QuestionSig) => boolean) => {
    const free = (cands ?? []).filter((q) => !used.has(q.id) && (!check || check(q)));
    if ((cands ?? []).length !== 1 || free.length !== 1) return false;
    map.set(s.id, free[0].id);
    used.add(free[0].id);
    how[h]++;
    return true;
  };
  const pending = [...src];
  const passes: [MatchHow, (s: QuestionSig) => QuestionSig[] | undefined, ((s: QuestionSig, q: QuestionSig) => boolean)?][] = [
    ['name', (s) => (normText(s.name) ? byCatName.get(`${normText(s.categoryName)}|${normText(s.name)}`) : undefined)],
    ['text', (s) => (normText(s.name) ? byName.get(normText(s.name)) : undefined)],
    ['position', (s) => byPos.get(`${s.categoryIndex}|${s.questionIndex}`), (s, q) => s.type == null || q.type == null || s.type === q.type],
  ];
  for (const [h, find, check] of passes) {
    for (let i = pending.length - 1; i >= 0; i--) {
      const s = pending[i];
      if (map.has(s.id)) continue;
      if (take(s, find(s), h, check ? (q) => check(s, q) : undefined)) pending.splice(i, 1);
    }
  }
  return { map, how, unmatched: src.filter((s) => !map.has(s.id)) };
}

/** Хариултын ангиллыг нэрээр (давхцвал эцгийн нэрээр нь) тааруулна. */
export function matchAnswerCategories(src: AnswerCategorySig[], target: AnswerCategorySig[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const s of src) {
    const same = target.filter((t) => normText(t.name) === normText(s.name));
    let hit = same.length === 1 ? same[0] : undefined;
    if (!hit && same.length > 1) {
      const byParent = same.filter((t) => normText(t.parentName) === normText(s.parentName));
      if (byParent.length === 1) hit = byParent[0];
    }
    if (hit) out.set(s.id, hit.id);
  }
  return out;
}

/** Ижил тест дээр давхцахгүй загварын нэр: "X", "X (import)", "X (import 2)"… */
export function templateNameCandidates(base: string, max = 50): string[] {
  const b = String(base ?? '').trim() || 'Загвар';
  const out = [b, `${b} (import)`];
  for (let i = 2; out.length < max; i++) out.push(`${b} (import ${i})`);
  return out;
}

export function assertTemplateBundle(b: any): asserts b is TemplateBundle {
  const fail = (m: string): never => {
    throw new Error(m);
  };
  if (!b || typeof b !== 'object' || Array.isArray(b)) fail('JSON файл хоосон эсвэл буруу байна.');
  if (b.format === 'hire-assessment-bundle') {
    fail('Энэ файл бүтэн тестийн экспорт байна — admin-ий "JSON-оос оруулах"-аар оруулна уу.');
  }
  if (b.format !== TEMPLATE_BUNDLE_FORMAT) fail('Энэ файл Studio загварын экспорт биш байна.');
  if (typeof b.version !== 'number' || b.version < 1) fail('Файлын хувилбар тодорхойгүй байна.');
  if (b.version > TEMPLATE_BUNDLE_VERSION) {
    fail(`Файлын хувилбар (${b.version}) энэ серверт дэмжигдэхгүй — эхлээд серверээ шинэчилнэ үү.`);
  }
  if (!b.template || typeof b.template !== 'object' || !b.template.fields || typeof b.template.fields !== 'object') {
    fail('Файлд загвар алга.');
  }
  if (!Array.isArray(b.template.fields.pages)) fail('Загварын хуудсууд (pages) алга.');
  for (const k of ['variables', 'questions', 'answerCategories', 'files', 'missingFiles']) {
    if (b[k] == null) b[k] = [];
    if (!Array.isArray(b[k])) fail(`"${k}" массив байх ёстой.`);
  }
  for (const v of b.variables) {
    if (!v?.fields || !String(v.fields.key ?? '').trim()) fail('Хувьсагчийн key дутуу байна.');
  }
  for (const q of b.questions) if (!Number.isFinite(Number(q?.id))) fail('Асуултын мэдээлэл буруу байна.');
  for (const f of b.files) {
    if (!f || !isSafeFileKey(f.key) || typeof f.base64 !== 'string') fail(`Файл буруу: ${String(f?.key ?? '?').slice(0, 80)}`);
  }
}
