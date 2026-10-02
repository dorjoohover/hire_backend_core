// Assessment-ийн онооны тайлбар (scale, bands, subscaleMax) — тухайн assessment-ийн
// questionCategory-дуудаас (өөрөөр хэлбэл "totalPoint" талбараас) шууд тооцоолно.
// UserAnswerService.findByCode()-ийн буцаах "assessment" block-д "result" талбар
// болгон нэмэгддэг.
//
// totalPoint нь questionCategory болон assessment хүснэгтэд аль хэдийн хадгалагдсан
// байдаг (харах: QuestionCategoryDao.updatePoint, AssessmentDao.updatePoint) — тэр
// category/асуулт бүрийн "хамгийн их авах боломжтой оноо" тул scale.max, bands,
// subscaleMax-ийг үүгээр шууд тооцоолж болно.

export interface ScoreBand {
  questionCategory?: number;
  name: string;
  /** [доод хязгаар, дээд хязгаар] — тухайн questionCategory-д авах боломжтой оноо */
  range: [number, number];
}

export interface AssessmentScoringConfig {
  /** тухайн assessment-ийн хамгийн бага болон хамгийн их авах боломжтой оноо */
  scale: { min: number; max: number };
  /** label-гүйгээр questionCategory тус бүрийн min/max оноог харуулна */
  bands: ScoreBand[];
  // scoreDirection: өндөр оноо сайн уу, муу юу — assessment бүрээр ялгаатай бөгөөд
  // одоогоор тодорхойгүй тул түр comment.
  // scoreDirection?: 'low-good' | 'high-good';
  /** хамгийн өндөр questionCategory-гийн оноо */
  subscaleMax: number;
}

export interface ScoringCategoryInput {
  id?: number;
  name: string;
  totalPoint?: number | string | null;
}

export interface ScoringAssessmentInput {
  totalPoint?: number | string | null;
}

export function buildAssessmentScoring(
  assessment: ScoringAssessmentInput,
  categories: ScoringCategoryInput[],
): AssessmentScoringConfig {
  const categoryMaxes = categories.map((c) => +(c.totalPoint ?? 0));

  const scaleMax =
    assessment.totalPoint != null
      ? +assessment.totalPoint
      : categoryMaxes.reduce((sum, p) => sum + p, 0);

  return {
    scale: { min: 0, max: scaleMax },
    bands: categories.map((c) => ({
      questionCategory: c.id,
      name: c.name,
      range: [0, +(c.totalPoint ?? 0)],
    })),
    subscaleMax: categoryMaxes.length ? Math.max(...categoryMaxes) : 0,
  };
}
