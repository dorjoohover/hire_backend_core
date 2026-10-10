// Studio "Алгасалт" хувьсагч (assessment_variable.kind = 'skip') — шалгуулагч асуултууд / бүлгийг
// алгассан (хариулаагүй) эсэх. Бодит үнэлгээг hire_report/src/pdf/skip-rules.ts хийнэ (studio
// lib/skipRules.ts толин хуулбар) — энд зөвхөн хадгалахаас өмнө шалгаж цэвэрлэнэ.
//
//   { scope: 'questions' | 'category', questions: ['question[101]', …], category: 'HADS',
//     mode: 'all' | 'any' | 'fewer', min, output: 'number' | 'text', skippedText, answeredText }
//
// Асуулт 'question[<id>]' хэлбэрээр хадгалагдана — загвар / тест зөөхөд remapQuestionTokens
// ID-г автоматаар шинэ орчны ID болгоно.
const QREF_RE = /question\s*\[\s*(\d+)\s*\]/;

export interface SkipVariableRules {
  scope: 'questions' | 'category';
  questions: string[];
  category: string;
  mode: 'all' | 'any' | 'fewer';
  min: number;
  output: 'number' | 'text';
  skippedText: string;
  answeredText: string;
}

// Буруу бол null (асуулт / бүлэг заагаагүй).
export function normalizeSkipVariableRules(rules: any): SkipVariableRules | null {
  if (!rules || typeof rules !== 'object') return null;
  const scope = rules.scope === 'questions' ? 'questions' : rules.scope === 'category' ? 'category' : null;
  if (!scope) return null;
  const questions: string[] = Array.isArray(rules.questions)
    ? Array.from(
        new Set(
          rules.questions
            .map((q: any) => {
              const s = String(q ?? '').trim();
              const m = s.match(QREF_RE);
              if (m) return `question[${m[1]}]`;
              return /^\d+$/.test(s) ? `question[${s}]` : '';
            })
            .filter(Boolean),
        ),
      ).slice(0, 500) as string[]
    : [];
  const category = String(rules.category ?? '').trim().slice(0, 255);
  if (scope === 'questions' && !questions.length) return null;
  if (scope === 'category' && !category) return null;
  const min = Math.round(Number(rules.min));
  return {
    scope,
    questions: scope === 'questions' ? questions : [],
    category: scope === 'category' ? category : '',
    mode: rules.mode === 'any' ? 'any' : rules.mode === 'fewer' ? 'fewer' : 'all',
    min: Number.isFinite(min) && min > 0 ? Math.min(min, 1000) : 1,
    output: rules.output === 'text' ? 'text' : 'number',
    skippedText: String(rules.skippedText ?? '').slice(0, 5000),
    answeredText: String(rules.answeredText ?? '').slice(0, 5000),
  };
}
