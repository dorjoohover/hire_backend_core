/**
 * Асуулт / бүлэг / assessment-ийн нийт оноо бодох цэвэр (DB-гүй) функцууд.
 *
 * ⚠️ `question.point`, `questionCategory.totalPoint` нь `numeric` багана тул Postgres
 * `-Infinity` / `NaN`-г хадгалж чаддаг. getPoint()-ийн Math.max(...[]) засвараас (d7f7393)
 * ӨМНӨ үүссэн TEXT асуултууд `point = -Infinity`-тэй үлдсэн → бүлгийн totalPoint мөн
 * -Infinity болж, `assessment.totalPoint` (integer) руу бичих үед
 * `invalid input syntax for type integer: "-Infinity"` алдаа гарч асуулт устгах /
 * хадгалах урсгал унадаг байв. Энд төгсгөлгүй утгыг 0 гэж тооцно.
 */

/** pg numeric → string ("-Infinity", "2.5") ирдэг. Төгсгөлгүй / тоо биш → 0. */
export const finitePoint = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Бүлгийн нийт оноо = нэг асуултын оноо × questionCount (бүлгээс авах асуултын тоо).
 * Хуучин логик (`questions[0].point`) асуултууд ижил оноотой гэж үздэг. Гэхдээ оноогүй
 * TEXT асуулт (0 / хуучин -Infinity) эхэнд таарвал бүхэл бүлэг 0 / -Infinity болдог байсан
 * тул эерэг, төгсгөлтэй оноотой эхний асуултыг авна. Асуултгүй / бүгд оноогүй бүлэг → 0
 * (өмнө нь асуултгүй бүлэгт `questions?.[0].point` TypeError шиддэг байв).
 */
export const categoryTotalPoint = (
  questions: { point?: unknown }[] | null | undefined,
  questionCount: unknown,
): number => {
  const q = (questions ?? []).find((x) => {
    const n = Number(x?.point);
    return Number.isFinite(n) && n > 0;
  });
  const total = finitePoint(q?.point) * finitePoint(questionCount);
  return Number.isFinite(total) ? total : 0;
};

/** assessment.totalPoint / questionCount нь integer багана → бүхэл тоо болгож бөөрөнхийлнө. */
export const assessmentTotals = (
  categories: { totalPoint?: unknown; questionCount?: unknown }[] | null | undefined,
) => {
  let totalPoint = 0;
  let questionCount = 0;
  for (const c of categories ?? []) {
    totalPoint += finitePoint(c?.totalPoint);
    questionCount += finitePoint(c?.questionCount);
  }
  return {
    totalPoint: Math.round(totalPoint),
    questionCount: Math.round(questionCount),
  };
};
