-- Assessment устгах үед дараагийн боломжит FK blockers-ийг засна:
--   assessment_formulas.assessment -> assessment            (CASCADE)
--   assessment_formulas.question_category -> questionCategory (CASCADE)
--   assessment_formulas.parent -> assessment_formulas (self-ref)  (CASCADE)
--   transaction.payment -> payment                          (CASCADE)
--
-- fix_answer_category_fk.sql-той адил зарчмаар constraint/багана нэрийг
-- өөрөө хайж олдог тул орчноос үл хамааран ажиллана.

DO $$
DECLARE
  v_constraint text;
  v_column text;
BEGIN
  SELECT tc.constraint_name, kcu.column_name
    INTO v_constraint, v_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'assessment_formulas'
    AND ccu.table_name = 'assessment'
  LIMIT 1;

  IF v_constraint IS NULL THEN
    RAISE NOTICE 'assessment_formulas -> assessment FK олдсонгүй, алгаслаа.';
  ELSE
    EXECUTE format('ALTER TABLE "assessment_formulas" DROP CONSTRAINT %I', v_constraint);
    EXECUTE format('ALTER TABLE "assessment_formulas" ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES "assessment"(id) ON DELETE CASCADE', v_constraint, v_column);
    RAISE NOTICE 'assessment_formulas.% -> assessment: CASCADE болголоо (%)', v_column, v_constraint;
  END IF;
END $$;

DO $$
DECLARE
  v_constraint text;
  v_column text;
BEGIN
  SELECT tc.constraint_name, kcu.column_name
    INTO v_constraint, v_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'assessment_formulas'
    AND ccu.table_name = 'questionCategory'
  LIMIT 1;

  IF v_constraint IS NULL THEN
    RAISE NOTICE 'assessment_formulas -> questionCategory FK олдсонгүй, алгаслаа.';
  ELSE
    EXECUTE format('ALTER TABLE "assessment_formulas" DROP CONSTRAINT %I', v_constraint);
    EXECUTE format('ALTER TABLE "assessment_formulas" ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES "questionCategory"(id) ON DELETE CASCADE', v_constraint, v_column);
    RAISE NOTICE 'assessment_formulas.% -> questionCategory: CASCADE болголоо (%)', v_column, v_constraint;
  END IF;
END $$;

DO $$
DECLARE
  v_constraint text;
  v_column text;
BEGIN
  SELECT tc.constraint_name, kcu.column_name
    INTO v_constraint, v_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'assessment_formulas'
    AND ccu.table_name = 'assessment_formulas'
  LIMIT 1;

  IF v_constraint IS NULL THEN
    RAISE NOTICE 'assessment_formulas -> assessment_formulas (parent) FK олдсонгүй, алгаслаа.';
  ELSE
    EXECUTE format('ALTER TABLE "assessment_formulas" DROP CONSTRAINT %I', v_constraint);
    EXECUTE format('ALTER TABLE "assessment_formulas" ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES "assessment_formulas"(id) ON DELETE CASCADE', v_constraint, v_column);
    RAISE NOTICE 'assessment_formulas.% -> assessment_formulas (parent): CASCADE болголоо (%)', v_column, v_constraint;
  END IF;
END $$;

DO $$
DECLARE
  v_constraint text;
  v_column text;
BEGIN
  SELECT tc.constraint_name, kcu.column_name
    INTO v_constraint, v_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'transaction'
    AND ccu.table_name = 'payment'
  LIMIT 1;

  IF v_constraint IS NULL THEN
    RAISE NOTICE 'transaction -> payment FK олдсонгүй, алгаслаа.';
  ELSE
    EXECUTE format('ALTER TABLE "transaction" DROP CONSTRAINT %I', v_constraint);
    EXECUTE format('ALTER TABLE "transaction" ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES "payment"(id) ON DELETE CASCADE', v_constraint, v_column);
    RAISE NOTICE 'transaction.% -> payment: CASCADE болголоо (%)', v_column, v_constraint;
  END IF;
END $$;
