// AI module-ийн DB / сүлжээгүй цэвэр функцууд (test/ai-prompt.spec-lite.ts).

export type CatalogItem = {
  id: number;
  name: string;
  description?: string | null;
  usage?: string | null;
  measure?: string | null;
  category?: string | null;
  aiData?: any;
  variables?: Record<string, { label?: string | null }>;
};

// Anthropic prompt cache-ийн TTL цагаар (УБ, UTC+8, DST-гүй). 2026 оны 1–6 сарын дүнгээр өдөр (08–24) хүсэлт хоорондын
// зай ихэвчлэн 5–60 мин → 1 цаг (бичих 2×, гэхдээ дахин бичихгүй); шөнө (00–08) 1 цагаас урт → 5 мин (бичих 1.25×).
// Keep-alive ping хийхгүй: structured output-тэй хүсэлтэд max_tokens:0 pre-warm зөвшөөрөгдөхгүй.
export function cacheTtl(now = new Date()): '1h' | '5m' {
  return (now.getUTCHours() + 8) % 24 >= 8 ? '1h' : '5m';
}

// Catalog-д тест бүрийн Studio AI Data-гийн эхний 400 тэмдэгт л (жиш. "Тохирох ажлын байр") — ярьж буй тестийнх
// <test_ai_data>-аар бүтнээрээ очдог. 1500 байхад бүгд бөглөгдвөл catalog ~71K token (100K-аас дээш Haiku ×5 үнэ).
// shortcut: тест ~200-аас олон болж catalog 100K token-д ойртвол embedding-ээр top-K сонгох (жинхэнэ retrieval) руу шилжинэ.
export const AI_DATA_MAX_CHARS = 400;

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);

// Catalog-д AI Data-гийн эхний хэсэг л ордог тул тест санал болгоход хамгийн хэрэгтэй түлхүүрийг эхэнд нь.
const JOBS_KEY = 'Тохирох ажлын байр';
const jobsFirst = (d: any) =>
  d && typeof d === 'object' && !Array.isArray(d) && JOBS_KEY in d ? { [JOBS_KEY]: d[JOBS_KEY], ...d } : d;

// Catalog-ийг тогтвортой (id-аар эрэмбэлсэн) текст болгоно — prompt cache prefix өөрчлөгдөхгүй байх ёстой.
export function buildCatalogText(items: CatalogItem[]): string {
  return [...items]
    .sort((a, b) => a.id - b.id)
    .map((a) => {
      const lines = [`<test id="${a.id}">`, `Нэр: ${a.name}`];
      if (a.category) lines.push(`Ангилал: ${a.category}`);
      if (a.description) lines.push(`Тайлбар: ${a.description}`);
      if (a.usage) lines.push(`Хэрэглээ: ${a.usage}`);
      if (a.measure) lines.push(`Хэмждэг зүйл: ${a.measure}`);
      const vars = Object.entries(a.variables ?? {})
        .map(([k, v]) => v?.label || k)
        .join(', ');
      if (vars) lines.push(`Хувьсагчид: ${vars}`);
      if (a.aiData) lines.push(`AI өгөгдөл: ${clip(JSON.stringify(jobsFirst(a.aiData)), AI_DATA_MAX_CHARS)}`);
      lines.push('</test>');
      return lines.join('\n');
    })
    .join('\n');
}

export type Recommendation = { assessmentId: number; name: string; priority: number; reason: string };

// LLM-ийн гаргасан id-г catalog-д байгаа эсэхээр шүүнэ (зохиосон тест санал болгохгүй), давхардлыг хасна.
export function pickRecommendations(raw: any, items: CatalogItem[], limit: number): Recommendation[] {
  const byId = new Map(items.map((a) => [a.id, a]));
  const seen = new Set<number>();
  const out: Recommendation[] = [];
  for (const r of Array.isArray(raw?.recommendations) ? raw.recommendations : []) {
    const id = Number(r?.assessmentId);
    const a = byId.get(id);
    if (!a || seen.has(id)) continue;
    seen.add(id);
    out.push({ assessmentId: id, name: a.name, priority: Number(r.priority) || out.length + 1, reason: String(r.reason ?? '') });
  }
  return out.sort((x, y) => x.priority - y.priority).slice(0, limit);
}

export type ResultRow = { firstname?: string; lastname?: string; point?: any; total?: any; result?: string; segment?: string; value?: string };

// Оролцогчийн нэрийг LLM рүү илгээхгүй — "#1, #2…" дугаараар солино; хариуд нь дугаараар нэрийг буцааж холбоно.
export function anonymizeResults(rows: ResultRow[]): { text: string; names: string[] } {
  const names = rows.map((r) => [r.lastname, r.firstname].filter(Boolean).join(' '));
  const text = rows
    .map((r, i) => {
      const parts = [`#${i + 1}`];
      if (r.point != null) parts.push(`оноо ${r.point}${r.total != null ? '/' + r.total : ''}`);
      if (r.result) parts.push(`үр дүн: ${r.result}`);
      if (r.segment) parts.push(`түвшин: ${r.segment}`);
      if (r.value) parts.push(`утга: ${r.value}`);
      return parts.join(', ');
    })
    .join('\n');
  return { text, names };
}

// LLM дүгнэлтэд "#31" гэж бичсэнийг HR-д ойлгомжтой болгож нэрээр солино (нэр LLM рүү очоогүй, энд л холбогдоно).
export function restoreNames(text: unknown, names: string[]): string {
  return String(text ?? '').replace(/#(\d+)/g, (m, n) => names[Number(n) - 1] || m);
}

// ── Чат widget (POST /ai/chat) ──

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export const CHAT_MAX_TURNS = 12;
export const CHAT_MAX_CHARS = 2000;

// Browser-оос ирсэн түүхэд итгэхгүй: зөвхөн user/assistant текст, сүүлийн 12, урт хязгаартай, user-ээр эхэлж/дуусна.
export function sanitizeHistory(raw: unknown): ChatTurn[] {
  const turns: ChatTurn[] = (Array.isArray(raw) ? raw : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: clip(m.content.trim(), CHAT_MAX_CHARS) }))
    .slice(-CHAT_MAX_TURNS);
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns.at(-1)?.role === 'user' ? turns : [];
}

// web-ийн pathname → одоо үзэж буй тест (/test/5, /tests/5, /test/details/5) эсвэл үр дүн (/result/<code>).
export function parsePagePath(path: unknown): { assessmentId?: number; code?: string } {
  const p = String(path ?? '');
  const t = p.match(/^\/(?:tests?|test\/details)\/(\d+)/);
  if (t) return { assessmentId: Number(t[1]) };
  const r = p.match(/^\/result\/([\w-]+)/);
  return r ? { code: r[1] } : {};
}

// LLM-ийн санал болгосон тестийн id-г catalog-оор шүүнэ (зохиосон тест гарахгүй), давхардалгүй, ихдээ 3.
export function pickTests(ids: unknown, items: CatalogItem[], limit = 3): { assessmentId: number; name: string }[] {
  const byId = new Map(items.map((a) => [a.id, a]));
  return [...new Set((Array.isArray(ids) ? ids : []).map(Number))]
    .filter((id) => byId.has(id))
    .slice(0, limit)
    .map((id) => ({ assessmentId: id, name: byId.get(id)!.name }));
}

export type ChatResult = ResultRow & {
  code: string;
  name: string;
  endDate?: any;
  details?: { category?: string; value?: string; cause?: string }[];
};
export type ChatContext = {
  role: number;
  // Бэлэн асуултын хариу — бүх хэрэглэгчид дахин үзүүлэх тул хувийн өгөгдөлгүйгээр үүсгэнэ.
  generic?: boolean;
  pageTest?: string | null;
  pageCode?: string;
  results?: ChatResult[];
  services?: { name: string; count: number; used: number; done: number }[];
};

// Хэрэглэгчийн <user> блок — нэр оруулахгүй; тайлангийн дэлгэрэнгүй (details) урт байж болох тул таслана.
export function buildUserContext(c: ChatContext): string {
  const org = c.role === 30;
  const lines = [
    `Хэрэглэгч: ${org ? 'байгууллага (HR)' : 'хувь хүн (тест өгөгч)'}`,
    // Role бүрийн бодит цэс — LLM байхгүй цэс руу заахгүй.
    org
      ? 'Сайт дээр: "Хяналтын самбар" (тест бүрийн "AI дүгнэлт"), "Нийт шалгуулагчид" (шалгуулагчийн PDF тайлан), "Миний тестүүд", тест авах — тестийн хуудаснаас. Шалгуулагч бүрийн үр дүнг чатаар тайлбарлахгүй.'
      : 'Сайт дээр: "Өгсөн тестүүд" (үр дүн, PDF тайлан), "Уригдсан тестүүд" (байгууллагаас ирсэн), шинэ тест — тестийн хуудаснаас.',
  ];
  if (c.pageTest) lines.push(`Одоо нээж буй хуудас: "${c.pageTest}" тестийн хуудас`);
  if (c.generic) {
    lines.push('Ерөнхий асуулт: хэрэглэгчийн хувийн өгөгдөл байхгүй — бүх хэрэглэгчид адил тохирох хариу өг, "таны үр дүн" гэх мэт бүү дурд.');
    return lines.join('\n');
  }
  if (c.services?.length) {
    lines.push('Байгууллагын авсан тестүүд:');
    for (const s of c.services) lines.push(`- ${s.name}: ${s.count} эрх, ${s.used} ашигласан, ${s.done} дууссан`);
  }
  if (c.results?.length) {
    lines.push('Хэрэглэгчийн өөрийн дууссан тестүүд (шинэ нь эхэнд):');
    for (const r of c.results) {
      const parts = [`- ${r.name}`];
      if (r.endDate) parts.push(`(${new Date(r.endDate).toISOString().slice(0, 10)})`);
      if (c.pageCode && r.code === c.pageCode) parts.push('[одоо нээж буй тайлан]');
      if (r.point != null) parts.push(`оноо ${r.point}${r.total != null ? '/' + r.total : ''}`);
      if (r.result) parts.push(`үр дүн: ${r.result}`);
      if (r.segment) parts.push(`түвшин: ${r.segment}`);
      if (r.value) parts.push(`утга: ${r.value}`);
      lines.push(parts.join(' '));
      // Ихэнх тестэд category хоосон, дэд хэмжүүрийн нэр value-д, оноо cause-д байдаг.
      for (const d of (r.details ?? []).slice(0, 12)) {
        const label = [d.category, d.value].filter(Boolean).join(': ');
        lines.push(`  · ${label}${d.cause ? ' — ' + clip(String(d.cause), 300) : ''}`);
      }
    }
  } else if (!org) {
    lines.push('Хэрэглэгчид харагдах дууссан тест одоогоор алга.');
  }
  return lines.join('\n');
}

// Ярьж буй тест(үүд)-ийн Studio AI Data-г бүтнээр нь өгнө — catalog-д AI_DATA_MAX_CHARS-аар таслагддаг тул
// түвшин/дэд хэмжүүрийн урт тайлбар энд л бүрэн очно. minChars-аас богино нь catalog-д аль хэдийн бүтэн байгаа.
export const AI_FOCUS_MAX_CHARS = 8000;
export function buildFocusAiData(items: CatalogItem[], ids: unknown[], minChars = AI_DATA_MAX_CHARS): string {
  const byId = new Map(items.map((a) => [a.id, a]));
  return [...new Set(ids.map(Number))]
    .map((id) => byId.get(id))
    .filter((a) => a?.aiData)
    .map((a) => ({ a, json: JSON.stringify(a.aiData) }))
    .filter(({ json }) => json.length > minChars)
    .map(({ a, json }) => `<test_ai_data id="${a.id}" name="${a.name}">\n${clip(json, AI_FOCUS_MAX_CHARS)}\n</test_ai_data>`)
    .join('\n');
}

// ── Бэлэн асуулт (FAQ) ──

// Ижил асуултыг таних түлхүүр: жижиг үсэг, цэг таслалгүй, нэг зай.
export function normQuestion(q: unknown): string {
  return String(q ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Бусад хэрэглэгчид товч болж харагдах тул: богино, холбоосгүй, хувийн (1-р бие) үггүй.
const PERSONAL_RE = /(^|\s)(миний|минийх|надад|намайг|надаас|надтай|би|манай|өөрийн|өөрт)(\s|$)/;
export function isSafeFaq(q: unknown): boolean {
  const t = String(q ?? '').trim();
  return t.length >= 8 && t.length <= 150 && !/(https?:|www\.|@)/i.test(t) && !PERSONAL_RE.test(normQuestion(t));
}

// Өгөгдөл хуримтлагдахаас өмнө харагдах анхны бэлэн асуултууд (scope 20 хувь хүн, 30 байгууллага).
export const FAQ_MIN_ASKERS = 3;
export function defaultFaqs(scope: number, onTestPage: boolean): string[] {
  if (onTestPage) return ['Энэ тест юуг хэмждэг вэ?', 'Энэ тест хэнд тохирох вэ?'];
  return scope === 30 ? ['Борлуулалтын ажилтанд ямар тест өгүүлэх вэ?'] : [];
}

