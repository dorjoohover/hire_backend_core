/**
 * Урьсан (invited) шалгуулагчдын raw дата экспортлох скрипт.
 * Зорилго: 112 ID-тай assessment-ийн дуусгасан, байгууллагаас урьсан
 * (public QR-аар өгөөгүй) шалгалтуудын дата, блок бүрийн асуулт/хариулт,
 * блокийн оноо, байгууллагын тойм — эдгээрийг нэг Excel файлд гаргана.
 *
 * Шаардлага (chat-аас):
 *  - userEndDate заавал байх ёстой (дуусгасан байх)
 *  - email нь ddorjoo268@gmail.com биш байх (test имэйл хасах)
 *  - урьсан байгууллагын нэр, имэйлийг харуулах
 *  - блок (questionCategory) тус бүрийн асуулт/хариултыг харуулах
 *  - шалгуулагчийн дугаар (утас), нэр, имэйлийг харуулах
 *  - зөвхөн урьсан (invited) тестүүд — public QR-аар өгсөнийг оруулахгүй
 *  - зөвхөн 112 ID-тай assessment
 *
 * "Урьсан" эсэхийг тодорхойлохдоо core/src/app/exam/dao/exam.dao.ts дахь
 * findAllNew()-ийн isInvited логиктой яг адилхан ашигласан:
 *   userService-ийг худалдаж авсан хэрэглэгч (users.organizationName)
 *   хоосон биш бол "байгууллагаас урьсан" гэж үзнэ. Public QR-аар өгсөн
 *   тестүүд ч мөн userService-тэй байдаг тул зөвхөн serviceId IS NULL
 *   гэдгээр ялгах боломжгүй — organizationName-аар ялгах нь зөв арга.
 *
 * Ажиллуулах (core folder дотроос):
 *   npx ts-node scripts/export-raw-data.ts
 *   npx ts-node scripts/export-raw-data.ts --assessment=112 --exclude=ddorjoo268@gmail.com
 *
 * Шаардлагатай сан (аль хэдийн core/node_modules дотор бий):
 *   pg, excel4node (core/src/common/app.excel.ts-г шууд дахин ашиглав)
 *
 * Гаралт: core/scripts/exports/raw_data_assessment_<id>_<огноо>.xlsx
 *
 * Тайлбар: Энэ скрипт нь production DB-д шууд холбогддог тул зөвхөн
 * DATABASE_URL-д хандах эрхтэй орчноос (сервер дээр эсвэл SSH tunnel-ээр)
 * ажиллуулна уу.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { AppExcel } = require('../src/common/app.excel');

// ---------- .env ачаалах (dotenv багц шаардахгүйгээр) ----------
function loadEnv(envPath: string) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv(path.join(__dirname, '..', '.env'));

// ---------- CLI параметрүүд ----------
function getArg(name: string, fallback: string) {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=').slice(1).join('=') : fallback;
}

const ASSESSMENT_ID = Number(getArg('assessment', '112'));
const EXCLUDED_EMAIL = getArg('exclude', 'ddorjoo268@gmail.com').toLowerCase();
const OUT_NAME = getArg(
  'out',
  `raw_data_assessment_${ASSESSMENT_ID}_${new Date().toISOString().slice(0, 10)}.xlsx`,
);

function num(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtDate(d: any): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL олдсонгүй (.env шалгана уу).');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.PGSSLMODE === 'require'
        ? { rejectUnauthorized: false }
        : undefined,
  });

  await client.connect();
  console.log(`✅ DB холбогдлоо. Assessment=${ASSESSMENT_ID}, exclude=${EXCLUDED_EMAIL}`);

  // WHERE нөхцлийг бүх query-д ижилхэн ашиглана:
  //  - зөвхөн 112 ID-тай assessment
  //  - userEndDate заавал байх ёстой (дуусаагүй бол оруулахгүй)
  //  - тест мэйл хасагдана
  //  - зөвхөн байгууллагаас урьсан (organizationName хоосон биш)
  const baseWhere = `
    a.id = $1
    AND e."userEndDate" IS NOT NULL
    AND (e.email IS NULL OR LOWER(e.email) <> $2)
    AND b."organizationName" IS NOT NULL
    AND TRIM(b."organizationName") <> ''
  `;
  const baseParams = [ASSESSMENT_ID, EXCLUDED_EMAIL];

  // ---------- 1. Судалгаа (exam-level, нэг мөр = нэг шалгуулагч) ----------
  const examRes = await client.query(
    `
    SELECT
      e.id                              AS "examId",
      e.code                            AS "code",
      a.id                              AS "assessmentId",
      a.name                            AS "assessmentName",
      e."createdAt"                     AS "invitedAt",
      e."userStartDate"                 AS "startedAt",
      e."userEndDate"                   AS "finishedAt",
      ROUND(
        EXTRACT(EPOCH FROM (e."userEndDate" - e."userStartDate")) / 60.0
      )::numeric                        AS "durationMinutes",
      e.lastname                        AS "lastname",
      e.firstname                       AS "firstname",
      e.email                           AS "email",
      e.phone                           AS "phone",
      b."organizationName"              AS "orgName",
      b.email                           AS "orgEmail",
      b."organizationPhone"             AS "orgPhone",
      b."organizationRegisterNumber"    AS "orgRegisterNumber",
      r.point                           AS "point",
      r.result                          AS "result",
      r.value                           AS "value",
      r.segment                         AS "segment",
      e.visible                         AS "visible"
    FROM exam e
    JOIN assessment a       ON a.id = e."assessmentId"
    JOIN "userService" us   ON us.id = e."serviceId"
    JOIN users b            ON b.id = us."userId"
    LEFT JOIN result r      ON r.code = e.code AND r."parentId" IS NULL
    WHERE ${baseWhere}
    ORDER BY e."userEndDate" DESC
    `,
    baseParams,
  );
  console.log(`📄 Судалгаа: ${examRes.rows.length} мөр`);

  // ---------- 2. Блок тус бүрийн асуулт/хариулт (long format) ----------
  const answerRes = await client.query(
    `
    SELECT
      e.code                                 AS "code",
      e.lastname                             AS "lastname",
      e.firstname                            AS "firstname",
      e.email                                AS "email",
      qc.name                                AS "blockName",
      q.name                                 AS "questionName",
      q."orderNumber"                        AS "questionOrder",
      COALESCE(qa.value, qm.value, ua.value) AS "answerValue",
      ua.point                               AS "point"
    FROM "userAnswer" ua
    JOIN exam e                          ON e.code = ua.code
    JOIN assessment a                    ON a.id = e."assessmentId"
    JOIN "userService" us                ON us.id = e."serviceId"
    JOIN users b                         ON b.id = us."userId"
    JOIN question q                      ON q.id = ua."questionId"
    LEFT JOIN "questionCategory" qc      ON qc.id = ua."questionCategoryId"
    LEFT JOIN "questionAnswer" qa        ON qa.id = ua."answerId"
    LEFT JOIN "questionAnswerMatrix" qm  ON qm.id = ua."matrixId"
    WHERE ${baseWhere}
    ORDER BY e.code, q."orderNumber", ua.id
    `,
    baseParams,
  );
  console.log(`📄 Блок хариултууд: ${answerRes.rows.length} мөр`);

  // ---------- 3. Блок тус бүрийн нийт оноо (pivot, шинжилгээнд ойлгомжтой) ----------
  const blockPointRes = await client.query(
    `
    SELECT
      e.code        AS "code",
      qc.name       AS "blockName",
      SUM(ua.point) AS "totalPoint"
    FROM "userAnswer" ua
    JOIN exam e                 ON e.code = ua.code
    JOIN assessment a           ON a.id = e."assessmentId"
    JOIN "userService" us       ON us.id = e."serviceId"
    JOIN users b                ON b.id = us."userId"
    JOIN "questionCategory" qc  ON qc.id = ua."questionCategoryId"
    WHERE ${baseWhere}
    GROUP BY e.code, qc.name
    ORDER BY e.code, qc.name
    `,
    baseParams,
  );

  const blockNames = [...new Set(blockPointRes.rows.map((r: any) => r.blockName))].sort();
  const pivotMap = new Map<string, Record<string, number | null>>();
  for (const row of blockPointRes.rows) {
    if (!pivotMap.has(row.code)) pivotMap.set(row.code, {});
    pivotMap.get(row.code)![row.blockName] = num(row.totalPoint);
  }
  console.log(`📄 Блокийн оноо: ${blockNames.length} блок`);

  // ---------- 4. Байгууллагын тойм ----------
  const orgRes = await client.query(
    `
    SELECT
      b."organizationName" AS "orgName",
      b.email              AS "orgEmail",
      COUNT(*)             AS "completedCount",
      ROUND(
        AVG(EXTRACT(EPOCH FROM (e."userEndDate" - e."userStartDate")) / 60.0)::numeric,
        1
      )                    AS "avgDurationMinutes",
      ROUND(AVG(r.point)::numeric, 2) AS "avgPoint"
    FROM exam e
    JOIN assessment a     ON a.id = e."assessmentId"
    JOIN "userService" us ON us.id = e."serviceId"
    JOIN users b          ON b.id = us."userId"
    LEFT JOIN result r    ON r.code = e.code AND r."parentId" IS NULL
    WHERE ${baseWhere}
    GROUP BY b."organizationName", b.email
    ORDER BY "completedCount" DESC
    `,
    baseParams,
  );
  console.log(`📄 Байгууллагын тойм: ${orgRes.rows.length} байгууллага`);

  await client.end();

  // ---------- Excel ----------
  const appExcel = new AppExcel();

  const examHeader = [
    'Exam ID', 'Код', 'Assessment ID', 'Assessment нэр',
    'Урьсан огноо', 'Эхэлсэн огноо', 'Дууссан огноо', 'Үргэлжилсэн (мин)',
    'Овог', 'Нэр', 'Имэйл', 'Утас',
    'Урьсан байгууллага', 'Байгууллагын имэйл', 'Байгууллагын утас', 'Байгууллагын РД',
    'Оноо', 'Үр дүн', 'Утга', 'Сегмент', 'Харагдах эсэх',
  ];
  const examRows = [
    examHeader,
    ...examRes.rows.map((r: any) => [
      num(r.examId), r.code, num(r.assessmentId), r.assessmentName,
      fmtDate(r.invitedAt), fmtDate(r.startedAt), fmtDate(r.finishedAt), num(r.durationMinutes),
      r.lastname, r.firstname, r.email, r.phone,
      r.orgName, r.orgEmail, r.orgPhone, r.orgRegisterNumber,
      num(r.point), r.result, r.value, r.segment, r.visible ? 'Тийм' : 'Үгүй',
    ]),
  ];

  const answerHeader = [
    'Код', 'Овог', 'Нэр', 'Имэйл', 'Блок', 'Асуулт', 'Дараалал', 'Хариулт', 'Оноо',
  ];
  const answerRows = [
    answerHeader,
    ...answerRes.rows.map((r: any) => [
      r.code, r.lastname, r.firstname, r.email,
      r.blockName, r.questionName, num(r.questionOrder), r.answerValue, num(r.point),
    ]),
  ];

  const blockHeader = ['Код', ...blockNames];
  const blockRows = [
    blockHeader,
    ...[...pivotMap.entries()].map(([code, points]) => [
      code,
      ...blockNames.map((n) => (points[n as string] ?? null)),
    ]),
  ];

  const orgHeader = ['Байгууллага', 'Имэйл', 'Дуусгасан тоо', 'Дундаж хугацаа (мин)', 'Дундаж оноо'];
  const orgRows = [
    orgHeader,
    ...orgRes.rows.map((r: any) => [
      r.orgName, r.orgEmail, num(r.completedCount), num(r.avgDurationMinutes), num(r.avgPoint),
    ]),
  ];

  const { wb } = await appExcel.render(examRows, 'Судалгаа');
  await appExcel.renderSheet(wb, answerRows, 'Хариултууд');
  await appExcel.renderSheet(wb, blockRows, 'Блокийн оноо');
  await appExcel.renderSheet(wb, orgRows, 'Байгууллагын тойм');

  const outDir = path.join(__dirname, 'exports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, OUT_NAME);

  await new Promise((resolve, reject) => {
    wb.write(outPath, (err: any) => (err ? reject(err) : resolve(undefined)));
  });

  console.log(`✅ Excel бэлэн боллоо: ${outPath}`);
}

main().catch((err) => {
  console.error('❌ Алдаа гарлаа:', err);
  process.exit(1);
});
