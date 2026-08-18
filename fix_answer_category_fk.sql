-- Тест устгахад "update or delete on table questionAnswerCategory violates
-- foreign key constraint ... on table questionAnswer" гэсэн алдаа гарч байгааг засна.
--
-- Учир: questionAnswer.category болон questionAnswerMatrix.category FK-үүд
-- ON DELETE дүрэмгүй (NO ACTION) үүссэн байсан тул assessment устгахад
-- questionAnswerCategory мөрийг CASCADE устгах гэхэд эдгээр хүснэгтийн
-- мөрүүд саад болж байв.
--
-- Энэ script нь тухайн FK-уудыг олж, зөв ON DELETE дүрэмтэйгээр (SET NULL /
-- CASCADE) дахин үүсгэнэ. Constraint болон багана нэрийг өөрөө хайж олдог
-- тул аль ч орчинд (local dev, production) нэг мөсөн ажиллана.
--
-- Ажиллуулах заавар: энэ файлыг psql-ээр эсвэл DBeaver/TablePlus гэх мэт
-- дурын Postgres клиентээр асаагаад DATABASE_URL-тэй холбогдсоны дараа
-- бүтнээр нь гүйцэтгэнэ. Хэрэв алдаа local dev дээр гарч байгаа бол локал
-- DB (postgresql://dorjoo@localhost:5432/hp) дээр, production дээр гарч
-- байгаа бол prod DB дээр ажиллуулна.

-- 1) questionAnswer.category -> questionAnswerCategory: ON DELETE SET NULL
DO $$
DECLARE
  v_constraint text;
  v_column text;
BEGIN
  SELECT tc.constraint_name, kcu.column_name
    INTO v_constraint, v_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
   AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'questionAnswer'
    AND ccu.table_name = 'questionAnswerCategory'
  LIMIT 1;

  IF v_constraint IS NULL THEN
    RAISE NOTICE 'questionAnswer -> questionAnswerCategory FK олдсонгүй, алгаслаа.';
  ELSE
    EXECUTE format('ALTER TABLE "questionAnswer" DROP CONSTRAINT %I', v_constraint);
    EXECUTE format(
      'ALTER TABLE "questionAnswer" ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES "questionAnswerCategory"(id) ON DELETE SET NULL',
      v_constraint, v_column
    );
    RAISE NOTICE 'questionAnswer.% -> questionAnswerCategory: ON DELETE SET NULL болголоо (constraint: %)', v_column, v_constraint;
  END IF;
END $$;

-- 2) questionAnswerMatrix.category -> questionAnswerCategory: ON DELETE CASCADE
-- (энэ багана NOT NULL тул SET NULL хийх боломжгүй, харин assessment/category
-- устахад matrix-ийн мөр хамт устах учиртай тул CASCADE зөв)
DO $$
DECLARE
  v_constraint text;
  v_column text;
BEGIN
  SELECT tc.constraint_name, kcu.column_name
    INTO v_constraint, v_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
   AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'questionAnswerMatrix'
    AND ccu.table_name = 'questionAnswerCategory'
  LIMIT 1;

  IF v_constraint IS NULL THEN
    RAISE NOTICE 'questionAnswerMatrix -> questionAnswerCategory FK олдсонгүй, алгаслаа.';
  ELSE
    EXECUTE format('ALTER TABLE "questionAnswerMatrix" DROP CONSTRAINT %I', v_constraint);
    EXECUTE format(
      'ALTER TABLE "questionAnswerMatrix" ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES "questionAnswerCategory"(id) ON DELETE CASCADE',
      v_constraint, v_column
    );
    RAISE NOTICE 'questionAnswerMatrix.% -> questionAnswerCategory: ON DELETE CASCADE болголоо (constraint: %)', v_column, v_constraint;
  END IF;
END $$;
