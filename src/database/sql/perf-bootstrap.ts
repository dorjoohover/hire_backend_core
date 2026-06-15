// Idempotent performance bootstrap statements, run on every app startup
// (see ../database.module.ts). Each entry must be safe to re-run
// (IF NOT EXISTS) - they are executed individually so one failure doesn't
// block the others.

export const PERF_BOOTSTRAP_STATEMENTS: string[] = [
  // ===========================================================================
  // 1) Materialized view for the rarely-changing assessment structure
  //    (questionAnswer + questionAnswerMatrix + questionAnswerCategory).
  //    Avoids the repeated 3-4 table join that ran once per question
  //    (132 calls / ~6.4s cumulative in pg_stat_statements).
  // ===========================================================================
  `CREATE MATERIALIZED VIEW IF NOT EXISTS mv_question_answer_full AS
SELECT
  qa.id,
  qa.value,
  qa.point,
  qa."orderNumber",
  qa.file,
  qa.correct,
  qa.negative,
  qa.reverse,
  qa."questionId",
  qa."categoryId" AS "categoryId",
  cat.name AS "categoryName",
  cat.description AS "categoryDescription",
  cat."parentId" AS "categoryParentId",
  cat."assessmentId" AS "categoryAssessmentId",

  m.id AS "matrixId",
  m.value AS "matrixValue",
  m.point AS "matrixPoint",
  m."orderNumber" AS "matrixOrderNumber",
  m."categoryId" AS "matrixCategoryId",
  mcat.name AS "matrixCategoryName"

FROM "questionAnswer" qa
LEFT JOIN "questionAnswerCategory" cat ON cat.id = qa."categoryId"
LEFT JOIN "questionAnswerMatrix" m ON m."answerId" = qa.id
LEFT JOIN "questionAnswerCategory" mcat ON mcat.id = m."categoryId"`,

  // Required so REFRESH MATERIALIZED VIEW CONCURRENTLY works.
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_qa_full_id_matrix
  ON mv_question_answer_full (id, "matrixId")`,

  `CREATE INDEX IF NOT EXISTS idx_mv_qa_full_question_id
  ON mv_question_answer_full ("questionId")`,

  // ===========================================================================
  // 2) Indexes for the session/transactional hot paths identified in
  //    pg_stat_statements (userAnswer, result, userService, exam).
  // ===========================================================================
  `CREATE INDEX IF NOT EXISTS idx_useranswer_exam_category
  ON "userAnswer" ("examId", "questionCategoryId")`,

  `CREATE INDEX IF NOT EXISTS idx_useranswer_code
  ON "userAnswer" ("code")`,

  `CREATE INDEX IF NOT EXISTS idx_useranswer_question
  ON "userAnswer" ("questionId")`,

  `CREATE INDEX IF NOT EXISTS idx_result_code
  ON "result" ("code")`,

  `CREATE INDEX IF NOT EXISTS idx_userservice_userid
  ON "userService" ("userId")`,

  `CREATE INDEX IF NOT EXISTS idx_exam_serviceid
  ON "exam" ("serviceId")`,

  `CREATE INDEX IF NOT EXISTS idx_exam_code
  ON "exam" ("code")`,
];
