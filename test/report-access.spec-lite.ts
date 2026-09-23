/**
 * ReportAccessService-ийн эрхийн логикийн тест (DB-гүй, mock DAO).
 *
 * Ажиллуулах:
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/report-access.spec-lite.ts
 *
 * Гол шалгах зүйл (2026-09-22 хялбарчлалын дараа): `reportPrice > 0` бол
 * PDF ҮРГЭЛЖ шууд төлбөртэй — `reportPdfPaid` / `reportFreeViews` / grace-session
 * ("нэг үнэгүй харалт = нэг сеанс") механизм БҮРЭН устгагдсан (хэрэглэгчийн
 * хүсэлтээр, зөвхөн логик/UI — DB багана хэвээр, ашиглагдахаа больсон,
 * report-access.service.ts). Байгууллага/admin/tester үргэлж чөлөөлөгдөнө
 * (isExempt); `/result` дэлгэцийн үр дүн (canView) ҮРГЭЛЖ нээлттэй, PDF татах
 * (canDownload) л reportPrice-аар хаагдана. `registerView()` одоо байнгын
 * no-op (E хэсэг үүнийг баталгаажуулна — ирээдүйд санамсаргүй дахин асаавал
 * энд танигдана).
 *
 * Мөн (F) QPay callback / polling: төлбөрийг ЗӨВХӨН мөрийн өөрийн invoice-аар
 * QPay-с дахин шалгадаг, callback давтагдахад аюулгүй, өөр нэхэмжлэхийн
 * төлбөрөөр эрх нээгддэггүй эсэх.
 */
import {
  ReportAccessService,
  INVOICE_MAX_PER_CODE,
  INVOICE_GLOBAL_PER_MIN,
} from '../src/app/report-access/report-access.service';
import { REPORT_VIEW_GRACE_MINUTES, PaymentStatus } from '../src/base/constants';
import { ExamController } from '../src/app/exam/exam.controller';

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
  exampleReport?: string;
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
      exampleReport: opts.exampleReport,
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
  const calls = { increments: 0 };
  const examDao: any = {
    findByCode: async () => exam,
    incrementReportView: async () => {
      // ExamDao-ийн WHERE нөхцөлийг дуурайна: grace цонхны дотор бол
      // тоолуур нэмэгдэхгүй (жинхэнэ SQL-ийг Postgres дээр тусад нь шалгасан).
      const viewedAt = exam.reportViewedAt
        ? new Date(exam.reportViewedAt).getTime()
        : null;
      const graceMs = REPORT_VIEW_GRACE_MINUTES * 60 * 1000;
      if (viewedAt == null || Date.now() - viewedAt >= graceMs) {
        exam.reportViewCount += 1;
        exam.reportViewedAt = new Date();
        calls.increments += 1;
      }
    },
  };
  const qpay: any = {};

  const service = new ReportAccessService(dao, examDao, qpay);
  (service as any).__calls = calls;
  (service as any).__exam = exam;
  return service;
}

/** Төлбөрийн (callback / polling) тестэд зориулсан in-memory DAO + QPay mock. */
function makePaymentHarness(rows: any[], qpayPaid: Record<string, number> = {}) {
  const calls = { qpay: [] as string[], marked: [] as number[] };
  const dao: any = {
    findPaidByCode: async (code: string) =>
      rows.find(
        (r) => r.code === `${code}` && r.status === PaymentStatus.SUCCESS,
      ) ?? null,
    findByInvoice: async (invoiceId: string) =>
      rows.find((r) => r.invoiceId === invoiceId) ?? null,
    findById: async (id: number) => rows.find((r) => r.id === id) ?? null,
    // Жинхэнэ DAO-ийн `WHERE status = PENDING` нөхцөлийг дуурайна.
    markPaid: async (id: number) => {
      const r = rows.find((x) => x.id === id);
      if (r && r.status === PaymentStatus.PENDING) {
        r.status = PaymentStatus.SUCCESS;
        r.paidAt = new Date();
        calls.marked.push(id);
      }
      return r;
    },
  };
  const qpay: any = {
    checkPayment: async (invoiceId: string) => {
      calls.qpay.push(invoiceId);
      return { paid_amount: qpayPaid[invoiceId] ?? 0 };
    },
  };
  const examDao: any = {
    findByCode: async (code: string) => ({
      code,
      reportViewCount: 0,
      reportViewedAt: null,
      assessment: {
        id: 1,
        reportFreeViews: 0,
        reportPdfPaid: true,
        reportPrice: 5000,
      },
      service: { price: 0, status: 0, user: { id: 9, role: 20 } },
      user: { id: 7 },
    }),
  };
  const svc = new ReportAccessService(dao, examDao, qpay);
  return { svc, calls, rows };
}

/** Нэхэмжлэх үүсгэх (POST :code/invoice) spam хязгаарын тестэд зориулсан harness. */
function makeInvoiceHarness(opts: { recent?: number; purchased?: boolean }) {
  const calls = { created: 0, qpay: 0, setInvoice: 0, countArgs: [] as any[] };
  const dao: any = {
    findPaidByCode: async () => (opts.purchased ? { id: 1 } : null),
    countRecentByCode: async (code: string, minutes: number) => {
      calls.countArgs.push([code, minutes]);
      return opts.recent ?? 0;
    },
    create: async (dto: any) => ({ id: ++calls.created, ...dto }),
    setInvoice: async () => {
      calls.setInvoice++;
    },
  };
  const qpay: any = {
    createInvoice: async () => {
      calls.qpay++;
      return { invoice_id: `INV-${calls.qpay}` };
    },
  };
  const examDao: any = {
    findByCode: async (code: string) => ({
      code,
      reportViewCount: 0,
      reportViewedAt: null,
      assessment: {
        id: 1,
        reportFreeViews: 0,
        reportPdfPaid: true,
        reportPrice: 5000,
      },
      service: { price: 0, status: 0, user: { id: 9, role: 20 } },
      user: { id: 7 },
    }),
  };
  const svc = new ReportAccessService(dao, examDao, qpay);
  return { svc, calls };
}

const payRow = (
  id: number,
  code: string,
  invoiceId: string,
  extra: any = {},
) => ({
  id,
  code,
  invoiceId,
  price: 5000,
  status: PaymentStatus.PENDING,
  ...extra,
});

/** Алдаа шидсэн бол HTTP статусыг, шидээгүй бол null-г буцаана. */
const errStatus = async (fn: () => Promise<any>) => {
  try {
    await fn();
    return null;
  } catch (e: any) {
    return e?.getStatus ? e.getStatus() : `ERR:${e?.message}`;
  }
};

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

  // --- Сценар A (2026-09-22 хялбарчлалаас хойш): reportPrice=5000 —
  // pdfPaid / freeViews / хугацаанаас ҮЛ ХАМААРНА, зөвхөн price л шийднэ ---
  console.log('— A: reportPrice=5000 — pdfPaid/freeViews/хугацаанаас үл хамаарна, шууд төлбөртэй');

  let s = await makeService({
    freeViews: 1, pdfPaid: false, price: 5000, viewCount: 0, viewedAt: null,
  }).resolve('12345');
  check('A1 анх нээх ч шууд төлбөртэй (free-view механизм устсан)', [s.canView, s.canDownload, s.reason],
    [true, false, 'payment-required']);

  s = await makeService({
    freeViews: 5, pdfPaid: false, price: 5000, viewCount: 0, viewedAt: minutesAgo(0),
  }).resolve('12345');
  check('A2 freeViews өндөр байсан ч нөлөөгүй', [s.canView, s.canDownload, s.reason],
    [true, false, 'payment-required']);

  s = await makeService({
    freeViews: 1, pdfPaid: false, price: 5000, viewCount: 1, viewedAt: minutesAgo(G + 1),
  }).resolve('12345');
  check(`A3 хугацаа (${G + 1} мин) ч нөлөөгүй — ҮР ДҮН нээлттэй (№6)`, [s.canView, s.canDownload, s.reason],
    [true, false, 'payment-required']);

  s = await makeService({
    freeViews: 1, pdfPaid: false, price: 5000, viewCount: 1,
    viewedAt: minutesAgo(G + 1), purchased: true,
  }).resolve('12345');
  check('A4 төлбөр төлсний дараа', [s.canView, s.canDownload, s.reason],
    [true, true, 'purchased']);

  // --- Сценар B: reportPdfPaid=true ч А-тай ЯГ ИЖИЛ (хоёр горим нэгдсэн) ---
  console.log('\n— B: reportPdfPaid=true — А-тай ижил үр дүн');

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
  check('D2 байгууллагын худалдаж авсан тест дээр ОРОЛЦОГЧ төлнө (№4: organization-paid чөлөөлөлт хасагдсан)', [s.paywall, s.canDownload, s.reason],
    [true, false, 'payment-required']);

  s = await makeService({
    freeViews: 1, pdfPaid: true, price: 5000, viewCount: 5, viewedAt: minutesAgo(999),
    servicePrice: 20000, serviceStatus: PaymentStatus.SUCCESS,
  }).resolve('12345');
  check('D3 тестээ өөрөө төлж авсан', [s.paywall, s.reason], [false, 'test-purchased']);

  s = await makeService({
    freeViews: 1, pdfPaid: true, price: 0, viewCount: 5, viewedAt: minutesAgo(999),
  }).resolve('12345');
  check('D4 үнэ 0 → paywall унтраалттай', [s.paywall, s.canView], [false, true]);

  // --- Сценар E: registerView() одоо байнгын no-op (grace/freeViews тоолуур
  // механизм бүрэн устгагдсан тул ямар ч нөхцөлд reportViewCount нэмэгдэхгүй) ---
  console.log('\n— E: registerView (байнгын no-op)');

  {
    const svc: any = makeService({
      freeViews: 5, pdfPaid: false, price: 5000, viewCount: 0, viewedAt: null,
    });
    const st = await svc.resolve('12345');
    await svc.registerView('12345', st);
    check('E1 PDF нээхэд шууд төлбөртэй, тоолуур хөдлөхгүй',
      [st.canDownload, st.reason, svc.__exam.reportViewCount],
      [false, 'payment-required', 0]);
  }

  {
    const svc: any = makeService({
      freeViews: 5, pdfPaid: false, price: 0, viewCount: 0, viewedAt: null,
    });
    const st = await svc.resolve('12345');
    await svc.registerView('12345', st);
    check('E2 price=0 (paywall унтраалттай) үед ч тоолуур хөдлөхгүй',
      svc.__exam.reportViewCount, 0);
  }

  {
    const svc: any = makeService({
      freeViews: 5, pdfPaid: true, price: 5000, viewCount: 0, viewedAt: null,
    });
    const st = await svc.resolve('12345');
    await svc.registerView('12345', st);
    check('E3 pdfPaid=true горимд ч тоолохгүй', svc.__exam.reportViewCount, 0);
  }

  {
    const svc: any = makeService({
      freeViews: 1, pdfPaid: false, price: 5000, viewCount: 0, viewedAt: null,
    });
    const st = await svc.resolve('12345', { role: 40, id: 1 });
    await svc.registerView('12345', st);
    check('E4 админ дээр тоолуур хөдлөхгүй', svc.__exam.reportViewCount, 0);
  }


  // --- Сценар F: QPay callback ба polling ---
  // Callback нь public тул URL / query-д итгэхгүй: төлбөрийг ЗӨВХӨН мөрийн
  // өөрийн invoiceId-аар QPay-с дахин шалгана. Өөр нэхэмжлэхийн төлбөрөөр эрх
  // нээгдэхгүй, давхар дуудлага аюулгүй.
  console.log('\n— F: QPay callback / polling');
  const { PENDING, SUCCESS, FAILED } = PaymentStatus;

  {
    const h = makePaymentHarness([payRow(1, '111', 'INV-1')], { 'INV-1': 5000 });
    const r1: any = await h.svc.handleCallback(1, 'PAY-1');
    check(
      'F1 callback: төлөгдсөн → SUCCESS (QPay-г мөрийн өөрийн invoice-аар асууна)',
      [r1.paid, h.rows[0].status, h.calls.qpay],
      [true, SUCCESS, ['INV-1']],
    );
    const r2: any = await h.svc.handleCallback(1, 'PAY-1');
    check(
      'F2 callback давтагдвал: QPay-г дахин дуудахгүй, дахин тэмдэглэхгүй',
      [r2.paid, h.calls.qpay.length, h.calls.marked],
      [true, 1, [1]],
    );
  }

  {
    const h = makePaymentHarness([payRow(2, '222', 'INV-2')], {});
    const r: any = await h.svc.handleCallback(2);
    check(
      'F3 callback: төлөгдөөгүй → PENDING хэвээр',
      [r.paid, h.rows[0].status],
      [false, PENDING],
    );
  }

  {
    const h = makePaymentHarness([payRow(3, '333', 'INV-3')], { 'INV-3': 1000 });
    const r: any = await h.svc.handleCallback(3);
    check(
      'F4 callback: дутуу төлөлт (1000 < 5000) → эрх нээхгүй',
      [r.paid, h.rows[0].status],
      [false, PENDING],
    );
  }

  {
    const h = makePaymentHarness([payRow(4, '444', 'INV-4')], {});
    check(
      'F5 callback: олдохгүй id → 404',
      await errStatus(() => h.svc.handleCallback(999)),
      404,
    );
    const bad: any[] = [];
    for (const id of [0, -5, 1.5, 2147483648, NaN]) {
      bad.push(await errStatus(() => h.svc.handleCallback(id)));
    }
    check(
      'F6 callback: буруу / хэт том id → 404, QPay-г дуудахгүй',
      [bad, h.calls.qpay.length],
      [[404, 404, 404, 404, 404], 0],
    );
  }

  {
    // INV-6 төлөгдсөн, INV-5 төлөгдөөгүй. Хуурамч qpay_payment_id-аар #5-г нээж болохгүй.
    const h = makePaymentHarness(
      [payRow(5, '555', 'INV-5'), payRow(6, '666', 'INV-6')],
      { 'INV-6': 5000 },
    );
    const r: any = await h.svc.handleCallback(5, 'PAYMENT-OF-INV-6');
    check(
      'F7 callback: хуурамч payment id → өөрийн invoice-аар шалгаж, нээхгүй',
      [r.paid, h.rows[0].status, h.calls.qpay],
      [false, PENDING, ['INV-5']],
    );
  }

  {
    const h = makePaymentHarness(
      [payRow(7, '777', 'INV-7A'), payRow(8, '777', 'INV-7B')],
      { 'INV-7A': 5000 },
    );
    await h.svc.handleCallback(7);
    check(
      'F8 callback: нэг кодод 2 нэхэмжлэх — зөвхөн төлөгдсөн мөр SUCCESS',
      [h.rows[0].status, h.rows[1].status, h.calls.marked],
      [SUCCESS, PENDING, [7]],
    );
  }

  {
    const h = makePaymentHarness(
      [payRow(9, '999', 'INV-9', { status: FAILED })],
      { 'INV-9': 5000 },
    );
    const r: any = await h.svc.handleCallback(9);
    check(
      'F9 callback: FAILED мөр → эрх нээхгүй, QPay-г дуудахгүй',
      [r.paid, h.calls.qpay.length],
      [false, 0],
    );
  }

  {
    // Polling: URL-ийн invoiceId нь ЭНЭ кодынх байх ёстой (өмнө нь replay боломжтой байв).
    const h = makePaymentHarness([payRow(10, '1010', 'INV-10')], { 'INV-10': 5000 });
    check(
      'F10 polling: өөр кодын invoice → 400, QPay-г дуудахгүй, эрх нээгдэхгүй',
      [
        await errStatus(() => h.svc.checkPayment('2020', 'INV-10')),
        h.calls.qpay.length,
        h.rows[0].status,
      ],
      [400, 0, PENDING],
    );
    check(
      'F11 polling: олдохгүй invoice → 400',
      await errStatus(() => h.svc.checkPayment('1010', 'NOPE')),
      400,
    );
    const ok: any = await h.svc.checkPayment('1010', 'INV-10');
    check(
      'F12 polling: өөрийн invoice төлөгдсөн → эрх нээгдэнэ',
      [ok.paid, ok.access.purchased],
      [true, true],
    );
  }

  {
    const h = makePaymentHarness([payRow(11, '1111', 'INV-11')], {});
    const r: any = await h.svc.checkPayment('1111', 'INV-11');
    check(
      'F13 polling: төлөгдөөгүй → paid=false',
      [r.paid, r.access.purchased],
      [false, false],
    );
  }

  {
    const h = makePaymentHarness([payRow(12, '1212', 'INV-12')], { 'INV-12': 5000 });
    await h.svc.handleCallback(12);
    const r: any = await h.svc.checkPayment('1212', 'INV-12');
    check(
      'F14 callback-ийн дараа polling: paid=true, QPay зөвхөн 1 удаа',
      [r.paid, r.access.purchased, h.calls.qpay.length],
      [true, true, 1],
    );
  }

  // --- Сценар G: нэхэмжлэх үүсгэх spam хязгаар (POST :code/invoice) ---
  console.log('\n— G: invoice rate limit');

  {
    const h = makeInvoiceHarness({ recent: INVOICE_MAX_PER_CODE - 1 });
    const r: any = await h.svc.createInvoice('12345');
    check(
      'G1 хязгаарын дотор → нэхэмжлэх үүснэ, invoice_id мөрөнд холбогдоно',
      [r.alreadyPaid, r.invoice?.invoice_id, h.calls.created, h.calls.setInvoice],
      [false, 'INV-1', 1, 1],
    );
    check(
      'G2 DB-ийн тоог ЭНЭ code-оор асууна',
      h.calls.countArgs.map((a) => a[0]),
      ['12345'],
    );
  }

  {
    const h = makeInvoiceHarness({ recent: INVOICE_MAX_PER_CODE });
    check(
      'G3 кодын хязгаар дүүрсэн → 429, мөр / QPay нэхэмжлэх үүсгэхгүй',
      [
        await errStatus(() => h.svc.createInvoice('12345')),
        h.calls.created,
        h.calls.qpay,
      ],
      [429, 0, 0],
    );
  }

  {
    const h = makeInvoiceHarness({ purchased: true });
    const r: any = await h.svc.createInvoice('12345');
    check(
      'G4 аль хэдийн төлсөн → alreadyPaid, хязгаарт тоологдохгүй / DB-д хүрэхгүй',
      [r.alreadyPaid, h.calls.countArgs.length, h.calls.created],
      [true, 0, 0],
    );
  }

  {
    // Нийт (процессын) хязгаар: минутад INVOICE_GLOBAL_PER_MIN.
    const h = makeInvoiceHarness({ recent: 0 });
    let ok = 0;
    for (let i = 0; i < INVOICE_GLOBAL_PER_MIN; i++) {
      await h.svc.createInvoice(`c${i}`);
      ok++;
    }
    const over = await errStatus(() => h.svc.createInvoice('overflow'));
    check(
      `G5 минутад ${INVOICE_GLOBAL_PER_MIN} нэхэмжлэхээс хэтэрвэл → 429`,
      [ok, over, h.calls.created],
      [INVOICE_GLOBAL_PER_MIN, 429, INVOICE_GLOBAL_PER_MIN],
    );
  }


  // --- Сценар H (№4 + №6): (хэн) × (үнэ / горим) матриц ---
  console.log('\n— H: №4/№6 матриц — оролцогч төлнө, байгууллага / admin / tester үнэгүй, үр дүн ҮРГЭЛЖ нээлттэй');
  {
    type Who = { name: string; user?: any; ownerRole?: number; servicePrice?: number; serviceStatus?: number };
    const OK = PaymentStatus.SUCCESS;
    const whos: Who[] = [
      { name: 'байгууллагын урилга/QR-ийн оролцогч (client)', user: { role: 20, id: 7 }, ownerRole: 30, servicePrice: 20000, serviceStatus: OK },
      { name: 'public QR оролцогч (нэвтрээгүй / token-гүй)', user: undefined, ownerRole: 30, servicePrice: 20000, serviceStatus: OK },
      { name: 'өөрөө худалдаж авсан тестийн эзэн (client)', user: { role: 20, id: 9 }, ownerRole: 20, servicePrice: 20000, serviceStatus: OK },
      { name: 'үнэгүй тест (service.price 0) оролцогч', user: { role: 20, id: 7 }, ownerRole: 20, servicePrice: 0, serviceStatus: OK },
      { name: 'байгууллага (эзэмшигч, organization role)', user: { role: 30, id: 9 }, ownerRole: 30, servicePrice: 20000, serviceStatus: OK },
      { name: 'admin', user: { role: 40, id: 1 }, ownerRole: 30, servicePrice: 20000, serviceStatus: OK },
      { name: 'tester', user: { role: 50, id: 2 }, ownerRole: 30, servicePrice: 20000, serviceStatus: OK },
      { name: 'super_admin', user: { role: 10, id: 3 }, ownerRole: 30, servicePrice: 20000, serviceStatus: OK },
    ];
    // Хүлээгдэх: [paywall, canView, canDownload] — (price 0) | (price>0, pdfPaid=false) | (price>0, pdfPaid=true)
    // 2026-09-22 хялбарчлалын дараа сүүлийн хоёр багана ХАРИЛЦАН АДИЛ (pdfPaid
    // ямар ч байсан, price>0 бол non-exempt-д шууд төлбөртэй, free-view байхгүй).
    const payer: [boolean, boolean, boolean][] = [[false, true, true], [true, true, false], [true, true, false]];
    const free: [boolean, boolean, boolean][] = [[false, true, true], [false, true, true], [false, true, true]];
    const expectedByWho = [payer, payer, free /* test-purchased */, payer, free, free, free, free];
    const configs = [
      { label: 'reportPrice=0', price: 0, pdfPaid: true, freeViews: 0 },
      { label: 'price>0, pdfPaid=false, freeViews=0', price: 5000, pdfPaid: false, freeViews: 0 },
      { label: 'price>0, pdfPaid=true', price: 5000, pdfPaid: true, freeViews: 0 },
    ];
    for (let w = 0; w < whos.length; w++) {
      const row: any[] = [];
      for (const cfg of configs) {
        const st = await makeService({
          freeViews: cfg.freeViews, pdfPaid: cfg.pdfPaid, price: cfg.price, viewCount: 0, viewedAt: null,
          ownerRole: whos[w].ownerRole, servicePrice: whos[w].servicePrice, serviceStatus: whos[w].serviceStatus,
        }).resolve('12345', whos[w].user);
        row.push([st.paywall, st.canView, st.canDownload]);
      }
      check(`H${w + 1} ${whos[w].name}: [paywall, canView, canDownload] × [price 0 | pdfPaid=false | pdfPaid=true]`, row, expectedByWho[w]);
    }
    const st = await makeService({ freeViews: 0, pdfPaid: true, price: 5000, viewCount: 0, viewedAt: null, ownerRole: 30, servicePrice: 20000, serviceStatus: OK }).resolve('12345', { role: 20, id: 7 });
    check('H9 төлбөртэй оролцогчид ч үр дүн нээлттэй (locked-гүй), reason=payment-required', [st.canView, st.reason], [true, 'payment-required']);
    const paidSt = await makeService({ freeViews: 0, pdfPaid: true, price: 5000, viewCount: 0, viewedAt: null, ownerRole: 30, servicePrice: 20000, serviceStatus: OK, purchased: true }).resolve('12345', { role: 20, id: 7 });
    check('H10 оролцогч төлсний дараа PDF нээгдэнэ', [paidSt.purchased, paidSt.canDownload, paidSt.reason], [true, true, 'purchased']);
    const pend = await makeService({ freeViews: 0, pdfPaid: true, price: 5000, viewCount: 0, viewedAt: null, ownerRole: 30, servicePrice: 20000, serviceStatus: PaymentStatus.PENDING }).resolve('12345', { role: 20, id: 7 });
    check('H11 төлөгдөөгүй (PENDING) service нь оролцогчийг чөлөөлөхгүй', [pend.paywall, pend.canDownload], [true, false]);
    // №4: жишээ тайлангийн файл paywall төлөвт дагалдана (CTA-ны хажууд "Жишээ тайлан үзэх")
    const withEx = await makeService({ freeViews: 0, pdfPaid: true, price: 5000, viewCount: 0, viewedAt: null, ownerRole: 30, servicePrice: 20000, serviceStatus: OK, exampleReport: 'ex/sample.pdf' } as any).resolve('12345', { role: 20, id: 7 });
    check('H12 paywall төлөв exampleReport-ийг дамжуулна (байхгүй бол null)', [withEx.exampleReport, st.exampleReport], ['ex/sample.pdf', null]);
  }

  // --- Сценар I (№6): `GET exam/exam/:code` контроллер — үр дүн ҮРГЭЛЖ, харалт тоологдохгүй ---
  console.log('\n— I: getExamInfo контроллер (locked байхгүй)');
  {
    const svc: any = makeService({ freeViews: 1, pdfPaid: false, price: 5000, viewCount: 1, viewedAt: minutesAgo(G + 5) });
    const ctrl: any = Object.create(ExamController.prototype);
    ctrl.reportAccess = svc;
    ctrl.examService = { getExamInfoByCode: async () => ({ assessmentName: 'DISC', point: 42, assessment: { exampleReport: 'sample.pdf' } }) };
    const log = console.log; console.log = () => {};
    let r: any;
    try { r = await ctrl.getExamInfo('12345', { user: { role: 20, id: 7 } }); } finally { console.log = log; }
    check('I1 үнэгүй харалт дууссан ч үр дүн ирнэ (locked=false), PDF хаалттай',
      [r.locked, r.point, r.access.canView, r.access.canDownload, r.assessment.exampleReport], [false, 42, true, false, 'sample.pdf']);
    check('I2 үр дүн харах нь үнэгүй PDF эрхийг ЗАРЦУУЛААГҮЙ (тоолуур хөдлөхгүй)', [svc.__exam.reportViewCount], [1]);
  }

  console.log(failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`);
  process.exit(failed === 0 ? 0 : 1);
})();
