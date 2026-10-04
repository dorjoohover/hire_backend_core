/*
 * hire_report хаягууд (v1.3.0).
 *   REPORT          — report VPS (PDF файл өгөх, legacy POST /, internal/files).
 *   REPORT_CALC_URL — calc service (core VPS, DB-тэй): DB шаардлагатай endpoint-ууд
 *                     (template/preview, calculate/:code, test/:code) + snapshot miss.
 * REPORT_CALC_URL тавиагүй бол бүгд REPORT руу (хуучин зан төлөв).
 */
const withSlash = (u: string) => (u.endsWith('/') ? u : `${u}/`);

export const reportApiBase = (): string =>
  withSlash(process.env.REPORT || 'http://localhost:4000/api/v1/');

export const reportDbBase = (): string =>
  withSlash(process.env.REPORT_CALC_URL || process.env.REPORT || 'http://localhost:4000/api/v1/');
