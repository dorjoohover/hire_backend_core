const { Client } = require('pg');
async function main() {
  const client = new Client({ connectionString: 'postgresql://dorjoo:dorjooX0@localhost:5432/hp' });
  await client.connect();
  const q = async (sql, params) => (await client.query(sql, params)).rows;
  const assessment = await q('select * from assessment where id=$1', [112]);
  console.log('ASSESSMENT:', JSON.stringify(assessment, null, 2));
  const cols = await q(`select column_name, table_name from information_schema.columns where table_name in ('question_category','question','question_answer','question_answer_category','assessment_formulas','pdf_template','assessment_variable','assessment_ai_data','formule') order by table_name, ordinal_position`);
  console.log('COLUMNS:', JSON.stringify(cols, null, 2));
  await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
