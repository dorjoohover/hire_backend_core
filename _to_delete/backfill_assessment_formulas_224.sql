-- Backfill: assessment 212 (СЭМҮТ)-ийн assessment_formulas-ыг (HADS/
-- DASS-21/Тархины хэт ачаалал/WHOQOL-BREF шиг олон дэд-оноотой сорилуудын
-- тооцооллын томьёо) 224 ("Сэтгэцийн эрүүл мэндийг үнэлэх багц сорил")
-- руу, category-г НЭРЭЭР нь тааруулж, шинээр хуулна.
--
-- Ажиллуулахаас ӨМНӨ: backfill_assessment_formulas_224_preview.sql-ийг
-- ажиллуулж, category бүх мөр "OK" гарч байгааг шалгаарай. "ТААРААГҮЙ"
-- байгаа category байвал тухайн дэд-ангилал энэ script-д АЛГАСАГДАНА
-- (script унахгүй, зөвхөн RAISE NOTICE-ээр анхааруулна).
--
-- Ажиллуулах: psql "$DATABASE_URL" -f backfill_assessment_formulas_224.sql
--
-- Аюулгүй байдал:
--   - Бүгд НЭГ transaction дотор (BEGIN...COMMIT) — дунд нь алдаа гарвал
--     бүхэлдээ буцна (ROLLBACK), хагас бичигдсэн өгөгдөл үлдэхгүй.
--   - Эхлээд шалгаад 224 дээр аль хэдийн мөр байвал ЮУ Ч БИЧИХГҮЙ зогсоно.
--   - Зөвхөн 224-т зориулж ШИНЭ formule/assessment_formulas мөр
--     ҮҮСГЭДЭГ — 212-ийн өгөгдөлд огт хүрэхгүй.
--
-- Туршиж үзэхийг хүсвэл: доор хамгийн сүүлийн мөрийг COMMIT-ийн оронд
-- ROLLBACK болгож ажиллуулаад, дунд хэвлэгдэх NOTICE мессежүүдийг уншаад,
-- зөв бол буцаад COMMIT болгоно уу.

BEGIN;

DO $$
DECLARE
  v_existing        integer;
  root_row          record;
  child_row         record;
  v_new_formule_id  integer;
  v_new_root_af_id  integer;
  v_new_cat_id      integer;
  v_root_count      integer := 0;
  v_child_count     integer := 0;
  v_skip_count      integer := 0;
BEGIN
  -- 0) Аюулгүй байдлын шалгалт
  SELECT count(*) INTO v_existing
  FROM assessment_formulas
  WHERE "assessmentId" = 224;

  IF v_existing > 0 THEN
    RAISE EXCEPTION '224 дээр аль хэдийн % assessment_formulas мөр байна — script-ийг ЗОГСООВ. Эхлээд шалгаарай.', v_existing;
  END IF;

  -- 1) ROOT мөрүүд (parentId IS NULL) — эх (212) -> шинэ (224)
  FOR root_row IN
    SELECT af.id, af.type, af."formuleId", af."questionCategoryId"
    FROM assessment_formulas af
    WHERE af."assessmentId" = 212 AND af."parentId" IS NULL
  LOOP
    v_new_formule_id := NULL;

    IF root_row."formuleId" IS NOT NULL THEN
      INSERT INTO formule (name, formula, variables, "groupBy", aggregations, filters, "limit", "order", sort)
      SELECT name, formula, variables, "groupBy", aggregations, filters, "limit", "order", sort
      FROM formule WHERE id = root_row."formuleId"
      RETURNING id INTO v_new_formule_id;
    END IF;

    v_new_cat_id := NULL;
    IF root_row."questionCategoryId" IS NOT NULL THEN
      SELECT dst.id INTO v_new_cat_id
      FROM "questionCategory" src
      JOIN "questionCategory" dst
        ON lower(trim(dst.name)) = lower(trim(src.name))
       AND dst."assessmentId" = 224
      WHERE src.id = root_row."questionCategoryId";
    END IF;

    INSERT INTO assessment_formulas ("assessmentId", "formuleId", "parentId", type, "questionCategoryId")
    VALUES (224, v_new_formule_id, NULL, root_row.type, v_new_cat_id)
    RETURNING id INTO v_new_root_af_id;

    v_root_count := v_root_count + 1;
    RAISE NOTICE 'ROOT: эх af.id=% -> шинэ af.id=% (formule %->%, category %->%)',
      root_row.id, v_new_root_af_id, root_row."formuleId", v_new_formule_id,
      root_row."questionCategoryId", v_new_cat_id;

    -- 2) Энэ root-ийн дэд (child) мөрүүд (parentId = root_row.id)
    FOR child_row IN
      SELECT af.id, af.type, af."formuleId", af."questionCategoryId"
      FROM assessment_formulas af
      WHERE af."assessmentId" = 212 AND af."parentId" = root_row.id
    LOOP
      v_new_cat_id := NULL;
      IF child_row."questionCategoryId" IS NOT NULL THEN
        SELECT dst.id INTO v_new_cat_id
        FROM "questionCategory" src
        JOIN "questionCategory" dst
          ON lower(trim(dst.name)) = lower(trim(src.name))
         AND dst."assessmentId" = 224
        WHERE src.id = child_row."questionCategoryId";
      END IF;

      IF v_new_cat_id IS NULL THEN
        v_skip_count := v_skip_count + 1;
        RAISE NOTICE '  ⚠️ SKIP child af.id=% — category (id=%) 224 дээр нэрээр таарсангүй', child_row.id, child_row."questionCategoryId";
        CONTINUE;
      END IF;

      v_new_formule_id := NULL;
      IF child_row."formuleId" IS NOT NULL THEN
        INSERT INTO formule (name, formula, variables, "groupBy", aggregations, filters, "limit", "order", sort)
        SELECT name, formula, variables, "groupBy", aggregations, filters, "limit", "order", sort
        FROM formule WHERE id = child_row."formuleId"
        RETURNING id INTO v_new_formule_id;
      END IF;

      INSERT INTO assessment_formulas ("assessmentId", "formuleId", "parentId", type, "questionCategoryId")
      VALUES (224, v_new_formule_id, v_new_root_af_id, child_row.type, v_new_cat_id);

      v_child_count := v_child_count + 1;
      RAISE NOTICE '  child: эх af.id=% -> шинэ parentId=% (formule %->%, category %->%)',
        child_row.id, v_new_root_af_id, child_row."formuleId", v_new_formule_id,
        child_row."questionCategoryId", v_new_cat_id;
    END LOOP;
  END LOOP;

  RAISE NOTICE '=== ДУУСЛАА: root=%, child=%, skip(category олдоогүй)=% ===', v_root_count, v_child_count, v_skip_count;
END $$;

COMMIT;
