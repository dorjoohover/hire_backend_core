// Assessment-ийн онооны тайлбар (scale, bands, чиглэл г.м) — hardcode mapping.
// UserAnswerService.findByCode()-ийн буцаах "assessment" block-д "result" талбар
// болгон нэмэгддэг. Тухайн assessment-д тусгайлсан тохиргоо хэрэгтэй бол
// ASSESSMENT_SCORING_OVERRIDES доторх map-д assessment.id-гаараа нэмнэ — энэ нь
// DEFAULT_ASSESSMENT_SCORING-ийг талбар тус бүрээр дарж бичнэ.

export interface ScoreBand {
  /** [доод хязгаар, дээд хязгаар] хамтдаа хамаарна */
  range: [number, number];
  label: string;
}

export interface AssessmentScoringConfig {
  /** доод/дээд хязгаар */
  scale: { min: number; max: number };
  bands: ScoreBand[];
  /** өндөр оноо сайн уу, муу юу */
  scoreDirection: 'low-good' | 'high-good';
  /** дэд бүлгийн дээд оноо */
  subscaleMax: number;
}

export const DEFAULT_ASSESSMENT_SCORING: AssessmentScoringConfig = {
  scale: { min: 0, max: 40 },
  bands: [
    { range: [0, 12], label: 'Хэвийн' },
    { range: [13, 40], label: 'Эмнэл зүйн шинж илэрсэн' },
  ],
  scoreDirection: 'low-good',
  subscaleMax: 4,
};

// assessment.id -> тухайн assessment-д зориулсан тусгай тохиргоо (шаардлагатай үед нэмнэ)
export const ASSESSMENT_SCORING_OVERRIDES: Record<
  number,
  Partial<AssessmentScoringConfig>
> = {
  // Жишээ:
  // 12: {
  //   scale: { min: 0, max: 60 },
  //   bands: [
  //     { range: [0, 20], label: 'Хэвийн' },
  //     { range: [21, 60], label: 'Эмнэл зүйн шинж илэрсэн' },
  //   ],
  // },
};

export function getAssessmentScoring(
  assessmentId?: number,
): AssessmentScoringConfig {
  const override = assessmentId
    ? ASSESSMENT_SCORING_OVERRIDES[assessmentId]
    : undefined;

  return {
    ...DEFAULT_ASSESSMENT_SCORING,
    ...override,
    scale: { ...DEFAULT_ASSESSMENT_SCORING.scale, ...override?.scale },
  };
}
