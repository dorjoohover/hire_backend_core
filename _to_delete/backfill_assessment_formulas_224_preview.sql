-- ЗӨВХӨН УНШИХ (read-only) — юу ч бичихгүй.
-- assessment 212 (СЭМҮТ) -> 224 ("Сэтгэцийн эрүүл мэндийг үнэлэх багц сорил")
-- руу assessment_formulas хуулахаас өмнө шалгах query-үүд.
--
-- Ажиллуулах: psql "$DATABASE_URL" -f backfill_assessment_formulas_224_preview.sql
-- (.env файлаас DATABASE_URL-г аваад орлуулж болно, жиш нь:
--   psql postgresql://dorjoo:dorjooX0@localhost:5432/hp -f backfill_assessment_formulas_224_preview.sql )

-- 0) 224 дээр АЛЬ ХЭДИЙН assessment_formulas байгаа эсэх (байвал 0 мөр
--    гарах ёстой — эс тэгвэл backfill-ийг АЖИЛЛУУЛАХГҮЙ, эхлээд эдгээрийг
--    шалгах хэрэгтэй)
SELECT count(*) AS existing_224_formula_rows
FROM assessment_formulas
WHERE "assessmentId" = 224;

-- 0.1) ID-үүд зөв эсэхийг батлах: 212/224 гэдэг нь жинхэнэ өгөгдсөн
--      assessment мөн үү, мөн тус бүрт хэдэн questionCategory байгааг
--      харах (доорх query "0 rows" гарвал 212 дээр category огт байхгүй
--      гэсэн үг — ийм тохиолдолд 212 нь буруу ID байх магадлалтай тул
--      backfill-ийг АЖИЛЛУУЛАХГҮЙ, ID-гаа дахин шалгаарай)
SELECT
  a.id,
  a.name,
  (SELECT count(*) FROM "questionCategory" qc WHERE qc."assessmentId" = a.id) AS category_count
FROM assessment a
WHERE a.id IN (212, 224);

-- 1) 212 дээрх category-уудыг 224-тэй нэрээр нь тааруулах — таарсан/
--    тааралгүй байгааг харах
SELECT
  src.id   AS src_category_id,
  src.name AS category_name,
  dst.id   AS dst_category_id,
  CASE WHEN dst.id IS NULL THEN '⚠️ ТААРААГҮЙ' ELSE 'OK' END AS status
FROM "questionCategory" src
LEFT JOIN "questionCategory" dst
  ON lower(trim(dst.name)) = lower(trim(src.name))
 AND dst."assessmentId" = 224
WHERE src."assessmentId" = 212
ORDER BY status DESC, src.id;

-- 2) 212 дээрх assessment_formulas бүтэц (root + child), category нэртэй нь
SELECT
  af.id,
  af.type,
  af."parentId",
  qc.name AS category_name,
  f.name  AS formula_name
FROM assessment_formulas af
LEFT JOIN "questionCategory" qc ON qc.id = af."questionCategoryId"
LEFT JOIN formule f ON f.id = af."formuleId"
WHERE af."assessmentId" = 212
ORDER BY (af."parentId" IS NOT NULL), af."parentId", af.id;
