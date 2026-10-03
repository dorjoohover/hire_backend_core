/**
 * Assessment (тест)-ийг бүх агуулгатай нь НЭГ JSON "bundle" болгож зөөх формат.
 *
 * Хэрэглээ:
 *   - Test → Prod (эсвэл prod → local): admin-д "JSON татах" → өөр орчны admin-д
 *     "JSON-оос оруулах". Хоёр орчны хооронд сүлжээ / нууц түлхүүр хэрэггүй.
 *   - Нэг орчин дотор "Хувилах" (question/copy/:id) — мөн энэ форматаар дамжина.
 *
 * Bundle-д: assessment-ийн тохиргоо, асуултын бүлэг, асуулт, хариулт, матриц,
 * хариултын ангилал (дэд бүлэг), тайлангийн томьёо (assessment.formule +
 * assessment_formulas), skip-дүрэм (questionRule), Studio загвар (pdf_template),
 * хувьсагч (assessment_variable), AI дата (assessment_ai_data), зураг/файлууд.
 *
 * ID-нууд: эх орчны ID-г зөвхөн `ref` болгон хадгална — оруулахдаа бүгд ШИНЭ ID
 * авч, ref → шинэ ID map-аар холбоосуудыг сэргээнэ. Studio-гийн текст / томьёо дахь
 * `{{question[<id>].…}}` token-уудыг ч шинэ асуултын ID руу хөрвүүлнэ.
 *
 * Энэ файл DB / Nest-гүй (test/assessment-bundle.spec-lite.ts шалгана).
 */

export const BUNDLE_FORMAT = 'hire-assessment-bundle';
export const BUNDLE_VERSION = 1;

export type Fields = Record<string, any>;
export interface RefName {
  id: number;
  name: string;
}
export interface BundleFile {
  key: string;
  contentType: string;
  base64: string;
}

export interface AssessmentBundle {
  format: typeof BUNDLE_FORMAT;
  version: number;
  exportedAt: string;
  source: { assessmentId: number; name: string };
  assessment: {
    fields: Fields;
    category: RefName | null;
    level: RefName | null;
    /** assessment.formule (нэг томьёо) — байвал шинээр үүсгэнэ */
    formule: Fields | null;
  };
  answerCategories: { ref: number; parentRef: number | null; fields: Fields }[];
  questionCategories: { ref: number; fields: Fields }[];
  questions: { ref: number; categoryRef: number; fields: Fields }[];
  answers: {
    ref: number;
    questionRef: number;
    categoryRef: number | null;
    fields: Fields;
  }[];
  matrix: {
    ref: number;
    questionRef: number | null;
    answerRef: number | null;
    categoryRef: number | null;
    fields: Fields;
  }[];
  assessmentFormulas: {
    ref: number;
    parentRef: number | null;
    questionCategoryRef: number | null;
    formule: Fields | null;
    fields: Fields;
  }[];
  rules: {
    targetQuestionRef: number;
    dependsOnQuestionRef: number;
    dependsOnAnswerRef: number | null;
    /** MATRIX нөхцөл: тухайн мөрийн нүд (bundle.matrix[].ref) */
    dependsOnMatrixRef?: number | null;
    /** MATRIX алгасах асуултын зөвхөн энэ мөр (bundle.answers[].ref); null = бүтэн асуулт */
    targetAnswerRef?: number | null;
    fields: Fields;
  }[];
  pdfTemplates: { fields: Fields }[];
  variables: { fields: Fields }[];
  aiData: { fields: Fields } | null;
  files: BundleFile[];
  /** Экспорт хийх үед эх орчинд олдоогүй файлууд (мэдээлэл) */
  missingFiles: string[];
}

// ---------------------------------------------------------------------------
// {{question[2656].point}} / {{question[2656].answer}} — Studio-гийн томьёо,
// текст, AI тохиргоонд асуултыг ID-гаар заадаг token.
// ---------------------------------------------------------------------------
const QUESTION_TOKEN = /(\bquestion\s*\[\s*)(\d+)(\s*\])/g;

/**
 * Утгын (string / массив / объект) доторх бүх `question[<хуучин id>]`-ийг шинэ ID
 * болгоно. Map-д байхгүй ID-г хэвээр үлдээж `unknown`-д нэмнэ.
 */
export function remapQuestionTokens<T>(
  value: T,
  qMap: Map<number, number>,
  unknown?: Set<number>,
): T {
  if (typeof value === 'string') {
    return value.replace(QUESTION_TOKEN, (full, pre, id, post) => {
      const next = qMap.get(Number(id));
      if (next == null) {
        unknown?.add(Number(id));
        return full;
      }
      return `${pre}${next}${post}`;
    }) as any;
  }
  if (Array.isArray(value)) {
    return value.map((v) => remapQuestionTokens(v, qMap, unknown)) as any;
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      out[k] = remapQuestionTokens(v, qMap, unknown);
    }
    return out;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Файлууд (зураг, жишээ тайлан PDF, Studio-гийн upload хийсэн зураг)
// ---------------------------------------------------------------------------

/** Core-ийн файлын түлхүүр (`1712_нэр.png`, `pt_…`, `ic_…`) — зам, `..` агуулахгүй. */
export function isSafeFileKey(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    key.length > 0 &&
    key.length <= 512 &&
    !key.includes('/') &&
    !key.includes('\\') &&
    !key.includes('..') &&
    !key.startsWith('.') &&
    !/[\0\r\n]/.test(key)
  );
}

/** Оруулахдаа (import) бичихгүй өргөтгөлүүд — api домэйн дээр inline нээгдэж болзошгүй. */
export const BLOCKED_FILE_EXT = /\.(html?|xhtml|xml|js|mjs|cjs|php|sh|exe|bat)$/i;

// `https://api.hire.mn/api/v1/file/<key>`, `/api/file/<key>` (admin/web proxy),
// `…/pdf-template/image/<key>` (Studio зураг / icon).
// ")"-ийг зөвшөөрнө — Studio-д "unnamed (2).png" гэх мэт нэртэй зураг байдаг (өмнө нь
// "(2" дээр тасарч, тийм зураг prod руу хуулагдаагүй байв). CSS `url(…)`-ийн төгсгөлийн
// ")"-ийг fileKeysInText хаалт тэнцвэржүүлж хасна.
const FILE_URL_RE =
  /(?:\/api\/v1\/file\/|\/api\/file\/|pdf-template\/image\/)([^"'\s<>?#\\]+)/g;

const count = (s: string, ch: string) => s.split(ch).length - 1;

/** Текст (HTML, JSON) доторх файлын холбоосуудын түлхүүрийг цуглуулна. */
export function fileKeysInText(text: unknown, out: Set<string>) {
  if (typeof text !== 'string' || !text) return;
  for (const m of text.matchAll(FILE_URL_RE)) {
    let key = m[1];
    try {
      key = decodeURIComponent(key);
    } catch {
      /* буруу encode — байгаагаар нь */
    }
    while (key.endsWith(')') && count(key, '(') < count(key, ')')) key = key.slice(0, -1);
    if (isSafeFileKey(key)) out.add(key);
  }
}

/**
 * Шууд түлхүүр хадгалдаг талбар (question.file, answer.file, assessment.icons,
 * assessment.exampleReport, questionCategory.url). URL бол дотроос нь түлхүүрийг
 * хайна (YouTube г.м. гадаад холбоос бол юу ч нэмэхгүй).
 */
export function fileKeyFromField(value: unknown, out: Set<string>) {
  if (typeof value !== 'string') return;
  const v = value.trim();
  if (!v) return;
  if (/^https?:\/\//i.test(v) || v.startsWith('/')) {
    fileKeysInText(v, out);
    return;
  }
  if (isSafeFileKey(v) && /\.[a-z0-9]{2,5}$/i.test(v)) out.add(v);
}

// ---------------------------------------------------------------------------
// Нэр — assessment.name нь UNIQUE
// ---------------------------------------------------------------------------

/** Давхцахгүй нэр сонгох дараалал: copy → "X copy", "X copy 2"…; import → "X", "X (import)", "X (import 2)"… */
export function nameCandidates(base: string, mode: 'copy' | 'import', max = 50): string[] {
  const b = String(base ?? '').trim() || 'Тест';
  const out: string[] = [];
  if (mode === 'import') {
    out.push(b, `${b} (import)`);
    for (let i = 2; out.length < max; i++) out.push(`${b} (import ${i})`);
  } else {
    out.push(`${b} copy`);
    for (let i = 2; out.length < max; i++) out.push(`${b} copy ${i}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Шалгалт
// ---------------------------------------------------------------------------

const ARRAY_KEYS = [
  'answerCategories',
  'questionCategories',
  'questions',
  'answers',
  'matrix',
  'assessmentFormulas',
  'rules',
  'pdfTemplates',
  'variables',
  'files',
  'missingFiles',
] as const;

/** Bundle-ийн бүтэц, ref-үүдийн бүрэн бүтэн байдлыг шалгана. Алдаатай бол Error (монгол мессежтэй). */
export function assertBundle(b: any): asserts b is AssessmentBundle {
  const fail = (m: string): never => {
    throw new Error(m);
  };
  if (!b || typeof b !== 'object' || Array.isArray(b)) fail('JSON файл хоосон эсвэл буруу байна.');
  if (b.format !== BUNDLE_FORMAT) fail('Энэ файл Hire-ийн тестийн экспорт (assessment bundle) биш байна.');
  if (typeof b.version !== 'number' || b.version < 1) fail('Файлын хувилбар тодорхойгүй байна.');
  if (b.version > BUNDLE_VERSION) {
    fail(`Файлын хувилбар (${b.version}) энэ серверт дэмжигдэхгүй — эхлээд серверээ шинэчилнэ үү.`);
  }
  if (!b.assessment || typeof b.assessment !== 'object' || !b.assessment.fields) {
    fail('Файлд тестийн (assessment) мэдээлэл алга.');
  }
  if (!String(b.assessment.fields.name ?? '').trim()) fail('Файлд тестийн нэр алга.');
  for (const k of ARRAY_KEYS) {
    if (b[k] == null) b[k] = [];
    if (!Array.isArray(b[k])) fail(`"${k}" массив байх ёстой.`);
  }
  if (b.aiData != null && typeof b.aiData !== 'object') fail('"aiData" буруу байна.');

  const refSet = (rows: any[], label: string) => {
    const s = new Set<number>();
    for (const r of rows) {
      if (!r || typeof r !== 'object' || !Number.isFinite(r.ref)) fail(`${label}: ref дутуу мөр байна.`);
      if (s.has(r.ref)) fail(`${label}: ref=${r.ref} давхардсан.`);
      s.add(r.ref);
    }
    return s;
  };
  const ac = refSet(b.answerCategories, 'Хариултын ангилал');
  const qc = refSet(b.questionCategories, 'Асуултын бүлэг');
  const q = refSet(b.questions, 'Асуулт');
  const a = refSet(b.answers, 'Хариулт');
  const mx = refSet(b.matrix, 'Матриц');
  const af = refSet(b.assessmentFormulas, 'Томьёо');

  const need = (ok: boolean, m: string) => ok || fail(m);
  const opt = (set: Set<number>, v: any) => v == null || set.has(v);
  for (const r of b.answerCategories) need(opt(ac, r.parentRef), `Хариултын ангилал ${r.ref}: parent олдсонгүй.`);
  for (const r of b.questions) need(qc.has(r.categoryRef), `Асуулт ${r.ref}: бүлэг олдсонгүй.`);
  for (const r of b.answers) {
    need(q.has(r.questionRef), `Хариулт ${r.ref}: асуулт олдсонгүй.`);
    need(opt(ac, r.categoryRef), `Хариулт ${r.ref}: ангилал олдсонгүй.`);
  }
  for (const r of b.matrix) {
    need(opt(q, r.questionRef), `Матриц ${r.ref}: асуулт олдсонгүй.`);
    need(opt(a, r.answerRef), `Матриц ${r.ref}: хариулт олдсонгүй.`);
    need(opt(ac, r.categoryRef), `Матриц ${r.ref}: ангилал олдсонгүй.`);
  }
  for (const r of b.assessmentFormulas) {
    need(opt(af, r.parentRef), `Томьёо ${r.ref}: parent олдсонгүй.`);
    need(opt(qc, r.questionCategoryRef), `Томьёо ${r.ref}: асуултын бүлэг олдсонгүй.`);
  }
  for (const r of b.rules) {
    need(opt(mx, r?.dependsOnMatrixRef), `Skip-дүрэм: матрицын нүд (${r?.dependsOnMatrixRef}) олдсонгүй.`);
    need(opt(a, r?.targetAnswerRef), `Skip-дүрэм: хасах мөр (${r?.targetAnswerRef}) олдсонгүй.`);
  }
  for (const f of b.files) {
    need(
      !!f && isSafeFileKey(f.key) && typeof f.base64 === 'string',
      `Файл буруу: ${String(f?.key ?? '?').slice(0, 80)}`,
    );
  }
}

/** parentRef-тэй мөрүүдийг эцэг нь түрүүлж орохоор эрэмбэлнэ (цикл бол Error). */
export function orderByParent<T extends { ref: number; parentRef: number | null }>(rows: T[]): T[] {
  const byRef = new Map(rows.map((r) => [r.ref, r]));
  const done = new Set<number>();
  const out: T[] = [];
  const visit = (r: T, path: Set<number>) => {
    if (done.has(r.ref)) return;
    if (path.has(r.ref)) throw new Error(`Эцэг-хүүхдийн холбоос цикл үүсгэсэн (ref=${r.ref}).`);
    path.add(r.ref);
    const p = r.parentRef != null ? byRef.get(r.parentRef) : undefined;
    if (p) visit(p, path);
    path.delete(r.ref);
    done.add(r.ref);
    out.push(r);
  };
  for (const r of rows) visit(r, new Set());
  return out;
}

/** Bundle-ийн товч тоон мэдээлэл (UI / лог). */
export function bundleStats(b: AssessmentBundle) {
  return {
    questionCategories: b.questionCategories.length,
    questions: b.questions.length,
    answers: b.answers.length,
    matrix: b.matrix.length,
    answerCategories: b.answerCategories.length,
    formulas: b.assessmentFormulas.length + (b.assessment.formule ? 1 : 0),
    rules: b.rules.length,
    pdfTemplates: b.pdfTemplates.length,
    variables: b.variables.length,
    aiData: b.aiData ? 1 : 0,
    files: b.files.length,
  };
}
