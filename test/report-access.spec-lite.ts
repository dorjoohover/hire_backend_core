/**
 * ReportAccessService-ийн эрхийн логикийн тест (DB-гүй, mock DAO).
 *
 * Ажиллуулах:
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/report-access.spec-lite.ts
 *
 * Гол шалгах зүйл: "нэг үнэгүй харалт = нэг сеанс" — тайланг нээснээс хойш
 * REPORT_VIEW_GRACE_MINUTES-ийн дотор refresh хийхэд paywall ГАРАХГҮЙ байх.
 */
import { ReportAccessService } from '../src/app/report-access/report-access.service';
import { REPORT_VIEW_GRACE_MINUTES, PaymentStatus } from '../src/base/constants';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

function makeService(opts: {
  freeViews: number;
  pdfPaid: boolean;
  price: number;
  viewCount: number;
  viewedAt: Date | null;
  purchased?: boolean;
  servicePrice?: number;
  serviceStatus?: number;
  ownerRole?: number;
}) {
  const exam: any = {
    code: '12345',
    reportViewCount: opts.viewCount,
    reportViewedAt: opts.viewedAt,
    assessment: {
      id: 1,
      reportFreeViews: opts.freeViews,
      reportPdfPaid: opts.pdfPaid,
      reportPrice: opts.price,
    },
    service: {
      price: opts.servicePrice ?? 0,
      status: opts.serviceStatus ?? 0,
      user: { id: 9, role: opts.ownerRole ?? 20 },
    },
    user: { id: 7 },
  };

  const dao: any = {
    findPaidByCode: async () => (opts.purchased ? { id: 1 } : null),
  };
  const examDao: any = {
    findByCode: async () => exam,
    incrementReportView: async () => undefined,
  };
  const qpay: any = {};

  return new ReportAccessService(dao, examDao, qpay);
}

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`,
  );
};

(async () => {
  console.log(`grace = ${REPORT_VIEW_GRACE_MINUTES} мин\n`);
  const G = REPORT_VIEW_GRACE_MINUTES;

  // --- Сценар A: freeViews=1, PDF үнэгүй, үнэ 5000 ---
  console.log('— A: reportFreeViews=1, reportPdfPaid=false, reportPrice=5000');

  let s = await makeService({
    freeViews: 1, pdfPaid: false, price: 5000, viewCount: 0, viewedAt: null,
  }).resolve('12345');
  check('A1 анх нээх (тоолуур 0)', [s.canView, s.canDownload, s.reason],
    [true, true, 'free-view']);

  s = await makeService({
    freeViews: 1, pdfPaid: false, price: 5000, viewCount: 1, viewedAt: minutesAgo(0),
  }).resolve('12345');
  check('A2 ШУУД refresh (0 мин)', [s.canView, s.canDownload, s.reason],
    [true, true, 'free-session']);

  s = await makeService({
    freeViews: 1, pdfPaid: false, price: 5000, viewCount: 1, viewedAt: minutesAgo(G - 1),
  }).resolve('12345');
  check(`A3 refresh (${G - 1} мин — цонхны дотор)`, [s.canView, s.reason],
    [true, 'free-session']);

  s = await makeService({
    freeViews: 1, pdfPaid: false, price: 5000, viewCount: 1, viewedAt: minutesAgo(G + 1),
  }).resolve('12345');
  check(`A4 ${G + 1} минутын дараа → paywall`, [s.canView, s.canDownload, s.reason],
    [false, false, 'payment-required']);

  s = await makeService({
    freeViews: 1, pdfPaid: false, price: 5000, viewCount: 1,
    viewedAt: minutesAgo(G + 1), purchased: true,
  }).resolve('12345');
  check('A5 төлбөр төлсний дараа', [s.canView, s.canDownload, s.reason],
    [true, true, 'purchased']);

  // --- Сценар B: PDF төлбөртэй, харах үнэгүй ---
  console.log('\n— B: reportFreeViews=0, reportPdfPaid=true, reportPrice=5000');

  s = await makeService({
    freeViews: 0, pdfPaid: true, price: 5000, viewCount: 3, viewedAt: minutesAgo(120),
  }).resolve('12345');
  check('B1 дэлгэц дээр харах үнэгүй, PDF хаалттай', [s.canView, s.canDownload],
    [true, false]);

  s = await makeService({
    freeViews: 0, pdfPaid: true, price: 5000, viewCount: 3,
    viewedAt: minutesAgo(120), purchased: true,
  }).resolve('12345');
  check('B2 төлсний дараа PDF нээгдэнэ', [s.canView, s.canDownload], [true, true]);

  // --- Сценар C: freeViews=2 (олон сеанс) ---
  console.log('\n— C: reportFreeViews=2');

  s = await makeService({
    freeViews: 2, pdfPaid: false, price: 5000, viewCount: 1, viewedAt: minutesAgo(G + 5),
  }).resolve('12345');
  check('C1 1 сеанс зарцуулсан, 2 дахийг нээх', [s.canView, s.reason, s.remainingFreeViews],
    [true, 'free-view', 1]);

  s = await makeService({
    freeViews: 2, pdfPaid: false, price: 5000, viewCount: 2, viewedAt: minutesAgo(G + 5),
  }).resolve('12345');
  check('C2 2 сеанс дууссан → paywall', [s.canView, s.reason], [false, 'payment-required']);

  // --- Сценар D: чөлөөлөлтүүд ---
  console.log('\n— D: чөлөөлөлт');

  s = await makeService({
    freeViews: 1, pdfPaid: true, price: 5000, viewCount: 5, viewedAt: minutesAgo(999),
  }).resolve('12345', { role: 40, id: 1 });
  check('D1 админ', [s.paywall, s.canView, s.canDownload], [false, true, true]);

  s = await makeService({
    freeViews: 1, pdfPaid: true, price: 5000, viewCount: 5,
    viewedAt: minutesAgo(999), ownerRole: 30,
  }).resolve('12345');
  check('D2 байгууллага худалдаж авсан', [s.paywall, s.reason],
    [false, 'organization-paid']);

  s = await makeService({
    freeViews: 1, pdfPaid: true, price: 5000, viewCount: 5, viewedAt: minutesAgo(999),
    servicePrice: 20000, serviceStatus: PaymentStatus.SUCCESS,
  }).resolve('12345');
  check('D3 тестээ өөрөө төлж авсан', [s.paywall, s.reason], [false, 'test-purchased']);

  s = await makeService({
    freeViews: 1, pdfPaid: true, price: 0, viewCount: 5, viewedAt: minutesAgo(999),
  }).resolve('12345');
  check('D4 үнэ 0 → paywall унтраалттай', [s.paywall, s.canView], [false, true]);

  console.log(failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`);
  process.exit(failed === 0 ? 0 : 1);
})();
