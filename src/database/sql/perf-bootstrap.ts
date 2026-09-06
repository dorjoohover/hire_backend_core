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

  // Тайлан бодох/уншихад `result` нь `relations: ['details']`-ээр
  // resultDetail-тэй join хийдэг. FK багана дээр индекс байхгүй бол
  // тайлан бүрд seq scan болно.
  `CREATE INDEX IF NOT EXISTS idx_resultdetail_resultid
  ON "resultDetail" ("resultId")`,

  `CREATE INDEX IF NOT EXISTS idx_userservice_userid
  ON "userService" ("userId")`,

  `CREATE INDEX IF NOT EXISTS idx_exam_serviceid
  ON "exam" ("serviceId")`,

  `CREATE INDEX IF NOT EXISTS idx_exam_code
  ON "exam" ("code")`,

  // ===========================================================================
  // 3) Studio (PDF builder) template storage — pdf_template. `synchronize` is
  //    off, and this repo has no migration runner, so new tables are
  //    provisioned here the same way as the indexes above (idempotent,
  //    runs on every boot). See core/src/app/pdf-template/entities/pdf-template.entity.ts
  // ===========================================================================
  `CREATE TABLE IF NOT EXISTS pdf_template (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    key VARCHAR,
    "assessmentId" INTEGER,
    "assessmentTypeCode" VARCHAR,
    context VARCHAR,
    content JSONB,
    "internalView" BOOLEAN NOT NULL DEFAULT false,
    "fontFamily" VARCHAR,
    "fontSize" INTEGER,
    color VARCHAR,
    "logoPosition" VARCHAR DEFAULT 'start',
    pages JSONB NOT NULL DEFAULT '[]',
    "aiConfig" JSONB,
    "demoMode" BOOLEAN NOT NULL DEFAULT false,
    "demoData" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE INDEX IF NOT EXISTS idx_pdf_template_assessment_type
  ON pdf_template ("assessmentTypeCode")`,

  // isActive: тухайн assessment дээр аль report generation-д ашиглагдахыг
  // тэмдэглэнэ (studio-ийн "Ашиглах" товч). Хүснэгт өмнө үүссэн байж болох тул
  // ADD COLUMN IF NOT EXISTS-аар аюулгүй нэмнэ.
  `ALTER TABLE pdf_template
   ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT false`,

  `CREATE INDEX IF NOT EXISTS idx_pdf_template_active
  ON pdf_template ("assessmentId", "isActive")`,

  // AI Data tab-ийн JSON input feature (hire_mn_mapping.docx-ийн mapping
  // schema-той тохирсон JSON) — зөвхөн Studio-ийн preview/token эх сурвалж.
  // ⚠ Доорх assessment_ai_data хүснэгт үүсснээс хойш ЭНЭ багана нь зөвхөн
  // in-memory (Zustand) кэш/backward-compat зорилготой — жинхэнэ хадгалалт
  // assessment_ai_data руу шилжсэн (assessmentId-аар түлхүүрлэгдсэн, template
  // бүрт биш).
  `ALTER TABLE pdf_template
   ADD COLUMN IF NOT EXISTS "aiJsonData" JSONB`,

  // AI Data tab-ийн JSON өгөгдлийг pdf_template-ээс ТУСДАА, assessment
  // бүрт ганцхан хадгална (олон template нэг assessment дээр байж болох тул
  // template тус бүрт давхардуулахгүйн тулд). Уншихдаа/бичихдээ
  // core/src/app/pdf-template/pdf-template.controller.ts-ийн
  // GET/PUT ai-data/:assessmentId ашиглана.
  `CREATE TABLE IF NOT EXISTS assessment_ai_data (
    id SERIAL PRIMARY KEY,
    "assessmentId" INTEGER NOT NULL UNIQUE,
    data JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE INDEX IF NOT EXISTS idx_assessment_ai_data_assessment
  ON assessment_ai_data ("assessmentId")`,

  // Studio-ийн "Хэрэглэгчийн variable" — тухайн assessment дээр хэрэглэгчийн
  // өөрөө нэрлэж үүсгэсэн key->утга map-ууд (жиш нь "characterDescription":
  // {d: "...", i: "...", ...}). Нэг assessment дээр ОЛОН variable (өөр
  // key нэртэй) байж болно тул UNIQUE(assessmentId, key), assessment_ai_data
  // шиг UNIQUE(assessmentId) биш. core/src/app/pdf-template/
  // pdf-template.controller.ts-ийн GET/PUT/DELETE variables/:assessmentId
  // [/:key] endpoint-ээр CRUD хийгдэнэ; hire_report/src/pdf/
  // dynamic-template.renderer.ts render үед exam.assessment.id-аар татаж
  // {{custom.<key>}} token болгон ашиглана.
  `CREATE TABLE IF NOT EXISTS assessment_variable (
    id SERIAL PRIMARY KEY,
    "assessmentId" INTEGER NOT NULL,
    key VARCHAR(100) NOT NULL,
    label VARCHAR(255),
    entries JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("assessmentId", key)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_assessment_variable_assessment
  ON assessment_variable ("assessmentId")`,

  // "Тайлан уншаад гацдаг" гомдол: report_logs.status Postgres native enum
  // тул TS enum-д REPORT_STATUS.FAILED нэмсэн ч (src/base/constants.ts,
  // hire_report/src/base/constants.ts) DB-ийн enum type өөрөө шинэ утгыг
  // мэдэхгүй байвал hire_report-ийн worker "FAILED" гэж бичихийг оролдоход
  // "invalid input value for enum" алдаа шидэнэ. ADD VALUE IF NOT EXISTS
  // (Postgres 12+) — аюулгүй, олон удаа ажиллуулж болно.
  // ⚠️ Хэрэв enum type-ийн бодит нэр report_logs_status_enum биш бол энэ
  // мөр алдаатай (console.error) боловч бусад bootstrap statement-д
  // нөлөөлөхгүй — тухайн тохиолдолд \dT+ report_logs_status_enum-ээр
  // жинхэнэ нэрийг psql-ээр шалгаад засах хэрэгтэй.
  `ALTER TYPE report_logs_status_enum ADD VALUE IF NOT EXISTS 'FAILED'`,

  // ===========================================================================
  // 4) Тайлангийн monetization (paywall).
  //    Загвар: тест (assessment) БҮРЭЭР admin-аас тохируулна.
  //      • reportFreeViews = 0  → харах paywall УНТРААЛТТАЙ (хязгааргүй үнэгүй)
  //      • reportFreeViews = 1  → тайланг нэг л удаа үнэгүй харна, дараа нь төлбөртэй
  //      • reportPdfPaid = true → дэлгэц дээр харах үнэгүй ч PDF татахад төлбөртэй
  //      • reportPrice          → нэг удаа "нээх"-ийн үнэ (₮). 0 бол paywall идэвхгүй.
  //    Нэг удаа төлсний дараа тухайн exam code дээр ХЯЗГААРГҮЙ харах + PDF
  //    татах эрх нээгдэнэ (хоёр тохиргоо нэг худалдан авалтаар нээгдэнэ).
  // ===========================================================================
  `ALTER TABLE assessment
   ADD COLUMN IF NOT EXISTS "reportFreeViews" INTEGER NOT NULL DEFAULT 0`,

  `ALTER TABLE assessment
   ADD COLUMN IF NOT EXISTS "reportPdfPaid" BOOLEAN NOT NULL DEFAULT false`,

  `ALTER TABLE assessment
   ADD COLUMN IF NOT EXISTS "reportPrice" INTEGER NOT NULL DEFAULT 0`,

  // Тухайн тестийн тайланг хэдэн удаа үзсэн (үнэгүй харалтыг тоолоход).
  `ALTER TABLE exam
   ADD COLUMN IF NOT EXISTS "reportViewCount" INTEGER NOT NULL DEFAULT 0`,

  // Сүүлд үзсэн хугацаа — санамсаргүй refresh нэг "үнэгүй харалт"-ыг
  // хэд хэдэн удаа зарцуулахаас сэргийлэх 30 минутын цонхонд ашиглана.
  `ALTER TABLE exam
   ADD COLUMN IF NOT EXISTS "reportViewedAt" TIMESTAMP`,

  // Тайлан нээх эрхийн бүртгэл. Нэг exam code дээр PAID мөр байвал тухайн
  // тайланг хязгааргүй харах + PDF татах эрхтэй.
  `CREATE TABLE IF NOT EXISTS report_access (
    id SERIAL PRIMARY KEY,
    code VARCHAR NOT NULL,
    "userId" INTEGER,
    "assessmentId" INTEGER,
    status INTEGER NOT NULL DEFAULT 10,
    price INTEGER NOT NULL DEFAULT 0,
    "invoiceId" VARCHAR,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP
  )`,

  `CREATE INDEX IF NOT EXISTS idx_report_access_code
  ON report_access ("code")`,

  `CREATE INDEX IF NOT EXISTS idx_report_access_code_status
  ON report_access ("code", "status")`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_report_access_invoice
  ON report_access ("invoiceId") WHERE "invoiceId" IS NOT NULL`,
];
