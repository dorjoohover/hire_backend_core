import { QuestionType } from 'src/base/constants';

/**
 * NUMBER (90) / TIME (100) асуултын хариултын серверийн шалгалт.
 *
 * Хариулт нь SLIDERSINGLE-тэй ижил хэлбэртэй: асуултын ганц `questionAnswer` мөр
 * (хариултын ангилал) + `point` = оруулсан утга, `value` = харуулах текст
 * (NUMBER: "2.5", TIME: "01:30"). Тайлан / томьёо `userAnswer.point`-оор бодогдоно.
 *
 * min/max нь TIME-д `settings.pointUnit`-ийн нэгжээр (point-той ижил нэгж) хадгалагдана.
 */
export const isNumericQuestionType = (type: unknown) =>
  Number(type) === QuestionType.NUMBER || Number(type) === QuestionType.TIME;

type NumericQuestion = {
  type: number;
  minValue?: number | string | null;
  maxValue?: number | string | null;
  settings?: Record<string, any> | null;
};

// TIME-ийн point = секунд / нэгж, 4 орон хүртэл тоймлогдсон — хил дээрх тоймлолтын зөрүүг тэвчинэ.
const EPS = 1e-6;

const bound = (v: unknown) =>
  v === null || v === undefined || v === '' || !Number.isFinite(Number(v))
    ? null
    : Number(v);

/** Алдаатай бол хэрэглэгчид харуулах мессеж, зөв (эсвэл хариулаагүй) бол null. */
export function numericAnswerError(
  question: NumericQuestion,
  point: unknown,
): string | null {
  if (!question || !isNumericQuestionType(question.type)) return null;
  // Хариулаагүй (хугацаа дууссан г.м) — "хариултгүй" мөр болж хадгалагдана.
  if (point === null || point === undefined || point === '') return null;

  const v = Number(point);
  if (!Number.isFinite(v)) return 'Тоон утга буруу байна';

  const isTime = Number(question.type) === QuestionType.TIME;
  if (isTime && v < 0) return 'Хугацаа сөрөг байж болохгүй';
  if (!isTime && !question.settings?.decimal && !Number.isInteger(v)) {
    return 'Бүхэл тоо оруулна уу';
  }

  const min = bound(question.minValue);
  const max = bound(question.maxValue);
  if (min !== null && v < min - EPS) return `Утга ${min}-аас бага байж болохгүй`;
  if (max !== null && v > max + EPS) return `Утга ${max}-аас их байж болохгүй`;
  return null;
}
