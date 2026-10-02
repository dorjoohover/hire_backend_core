/**
 * UserServiceService-ийн QPay төлбөрийн (callback / polling / create) тест
 * (DB-гүй, mock DAO + mock QPay).
 *
 * Ажиллуулах:
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/user-service-payment.spec-lite.ts
 *
 * Гол шалгах зүйл (0.3 d): төлбөрийг ЗӨВХӨН мөрийн өөрийн `qpayInvoiceId`-аар
 * QPay-с шалгадаг; callback-ийн URL / qpay_payment_id-д итгэдэггүй; дутуу төлбөрөөр
 * нээгддэггүй; callback + polling зэрэг ирсэн ч payment / transaction / e-barimt
 * ЗӨВХӨН ГАНЦ удаа бүртгэгддэг; polling нь зөвхөн эзэмшигчид ажилладаг; count
 * (сөрөг / 0 / бутархай) хүлээж авдаггүй.
 */
import { UserServiceService } from '../src/app/user.service/user.service.service';
import { PaymentStatus } from '../src/base/constants';

const { PENDING, SUCCESS } = PaymentStatus;
const ROLE_CLIENT = 20;
const ROLE_ORG = 30;
const ROLE_ADMIN = 40;

const mkRow = (id: number, ownerId: number, extra: any = {}) => ({
  id,
  price: 5000,
  count: 1,
  usedUserCount: 0,
  status: PENDING,
  qpayInvoiceId: `INV-${id}` as string | null,
  user: { id: ownerId, email: `u${ownerId}@x.mn` },
  assessment: { id: 1, name: 'DISC', price: 5000, classificationCode: '1' },
  ...extra,
});

function makeHarness(
  rows: any[],
  qpayPaid: Record<string, number> = {},
  opts: { assessment?: any; wallet?: number; createFails?: boolean } = {},
) {
  const calls = {
    qpay: [] as string[],
    payments: [] as any[],
    transactions: [] as any[],
    receipts: [] as any[],
    ebarimt: [] as any[],
    wallet: [] as any[],
    invoices: [] as any[],
    bound: [] as any[],
    debits: [] as any[],
  };
  const dao: any = {
    findForPayment: async (id: number) => rows.find((r) => r.id === id) ?? null,
    findByInvoice: async (inv: string) =>
      rows.find((r) => r.qpayInvoiceId === inv) ?? null,
    setInvoiceId: async (id: number, inv: string) => {
      const r = rows.find((x) => x.id === id);
      if (r) r.qpayInvoiceId = inv;
    },
    // Жинхэнэ DAO-ийн атомар `UPDATE ... WHERE status = PENDING`-ийг дуурайна.
    claimSuccess: async (id: number, inv?: string) => {
      const r = rows.find((x) => x.id === id);
      if (!r || r.status !== PENDING) return null;
      r.status = SUCCESS;
      if (inv) {
        calls.bound.push([id, inv]);
        r.qpayInvoiceId = inv;
      }
      return r;
    },
    create: async (dto: any, price: number) => {
      if (opts.createFails) throw new Error('db down');
      const row = mkRow(rows.length + 100, dto.user, {
        ...dto,
        price,
        qpayInvoiceId: null,
        status: price == 0 ? SUCCESS : PENDING,
      });
      rows.push(row);
      return row;
    },
    updateStatus: async (id: number, status: number) => {
      const r = rows.find((x) => x.id === id);
      r.status = status;
      return r;
    },
  };
  const qpay: any = {
    checkPayment: async (inv: string) => {
      calls.qpay.push(inv);
      await new Promise((r) => setTimeout(r, 5)); // зэрэгцээ дуудлагыг бодитой болгоно
      return { paid_amount: qpayPaid[inv] ?? 0 };
    },
    createInvoice: async (amount: number, id: number) => {
      calls.invoices.push([amount, id]);
      return { invoice_id: `QP-${id}` };
    },
  };
  const paymentDao: any = {
    create: async (d: any) => calls.payments.push(d),
  };
  const transactionDao: any = {
    create: async (d: any) => calls.transactions.push(d),
  };
  const barimt: any = {
    restReceipt: async (...a: any[]) => calls.receipts.push(a),
    getBarimt: async (id: number, email: string) => {
      calls.ebarimt.push([id, email]);
      return { ebarimt: id };
    },
  };
  const assessmentDao: any = {
    findOne: async () =>
      opts.assessment ?? { id: 1, name: 'DISC', price: 5000, audience: -1 },
  };
  let wallet = opts.wallet ?? 0;
  const userDao: any = {
    updateWallet: async (id: number, amt: number) => {
      calls.wallet.push([id, amt]);
      wallet += amt;
    },
    // Жинхэнэ `UPDATE … WHERE wallet >= amt`-ийг дуурайна (№8).
    debitWallet: async (id: number, amt: number) => {
      calls.debits.push([id, amt]);
      if (wallet < amt) return false;
      wallet -= amt;
      return true;
    },
  };
  const svc = new UserServiceService(
    dao,
    transactionDao,
    paymentDao,
    {} as any, // examService
    {} as any, // examDao
    userDao,
    assessmentDao,
    {} as any, // mailer
    qpay,
    {} as any, // result
    barimt,
    {} as any, // authService
  );
  return { svc, calls, rows, wallet: () => wallet };
}

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
  const log = console.log;
  // Service-ийн дотоод console.log-уудыг тестийн гаралтаас тусгаарлана.
  const quiet = async <T>(fn: () => Promise<T>) => {
    console.log = () => undefined;
    try {
      return await fn();
    } finally {
      console.log = log;
    }
  };

  log('— H: callback (public)');
  {
    const h = makeHarness([mkRow(1, 7)], { 'INV-1': 5000 });
    const r: any = await quiet(() => h.svc.checkCallback(7, 'PAY-1', 1));
    check(
      'H1 төлөгдсөн → SUCCESS, QPay-г мөрийн өөрийн invoice-аар асууна',
      [r.paid, h.rows[0].status, h.calls.qpay],
      [true, SUCCESS, ['INV-1']],
    );
    check(
      'H2 payment / transaction / e-barimt ганц удаа, эзэмшигчийн нэрээр',
      [
        h.calls.payments.length,
        h.calls.payments[0]?.user,
        h.calls.payments[0]?.totalPrice,
        h.calls.transactions.length,
        h.calls.receipts.length,
      ],
      [1, 7, 5000, 1, 1],
    );
    await quiet(() => h.svc.checkCallback(7, 'PAY-1', 1));
    check(
      'H3 callback давтагдвал: QPay / бүртгэл дахин ажиллахгүй',
      [
        h.calls.qpay.length,
        h.calls.payments.length,
        h.calls.transactions.length,
        h.calls.receipts.length,
      ],
      [1, 1, 1, 1],
    );
  }

  {
    // INV-B төлөгдсөн; #1 (INV-A) төлөгдөөгүй. Хуурамч payment id / user-ээр #1-г нээж болохгүй.
    const h = makeHarness(
      [
        mkRow(1, 7, { qpayInvoiceId: 'INV-A' }),
        mkRow(2, 8, { qpayInvoiceId: 'INV-B' }),
      ],
      { 'INV-B': 5000 },
    );
    const r: any = await quiet(() =>
      h.svc.checkCallback(8, 'PAYMENT-OF-INV-B', 1),
    );
    check(
      'H4 хуурамч payment id / user → өөрийн invoice-аар шалгаж, нээхгүй',
      [r.paid, h.rows[0].status, h.calls.qpay, h.calls.payments.length],
      [false, PENDING, ['INV-A'], 0],
    );
  }

  {
    const h = makeHarness([mkRow(1, 7)], { 'INV-1': 1000 });
    const r: any = await quiet(() => h.svc.checkCallback(7, 'P', 1));
    check(
      'H5 дутуу төлөлт (1000 < 5000) → нээхгүй, бүртгэл үүсэхгүй',
      [r.paid, h.rows[0].status, h.calls.payments.length],
      [false, PENDING, 0],
    );
  }

  {
    const h = makeHarness([mkRow(1, 7)], { 'INV-1': 5000 });
    const bad: any[] = [];
    for (const id of [0, -5, 1.5, 2147483648, NaN, 999]) {
      bad.push(await errStatus(() => h.svc.checkCallback(7, 'P', id)));
    }
    check(
      'H6 буруу / хэт том / олдохгүй id → 404, QPay-г дуудахгүй',
      [bad, h.calls.qpay.length],
      [[404, 404, 404, 404, 404, 404], 0],
    );
  }

  {
    // Хуучин мөр (invoice хадгалаагүй): public callback-д итгэхгүй.
    const h = makeHarness([mkRow(1, 7, { qpayInvoiceId: null })], {
      'INV-1': 5000,
    });
    const r: any = await quiet(() => h.svc.checkCallback(7, 'P', 1));
    check(
      'H7 хуучин мөр (invoice-гүй) → callback алгасна, QPay-г дуудахгүй',
      [r.paid, h.rows[0].status, h.calls.qpay.length],
      [false, PENDING, 0],
    );
  }

  {
    // callback + polling ЗЭРЭГ ирнэ — бүртгэл ганцхан удаа.
    const h = makeHarness([mkRow(1, 7)], { 'INV-1': 5000 });
    const [a, b]: any[] = await quiet(() =>
      Promise.all([
        h.svc.checkCallback(7, 'P', 1),
        h.svc.checkPayment(1, 'INV-1', 7, 'u7@x.mn', ROLE_CLIENT),
      ]),
    );
    check(
      'H8 callback + polling зэрэг → payment / transaction / e-barimt ГАНЦ удаа',
      [
        a.paid,
        b,
        h.calls.payments.length,
        h.calls.transactions.length,
        h.calls.receipts.length,
      ],
      [true, true, 1, 1, 1],
    );
  }

  log('\n— I: polling (нэвтэрсэн)');
  {
    const h = makeHarness([mkRow(1, 7), mkRow(2, 8)], { 'INV-1': 5000 });
    // Халдагч (user 8) өөрийн #2-оор #1-ийн төлөгдсөн invoice-г ашиглана.
    const r: any = await quiet(() =>
      h.svc.checkPayment(2, 'INV-1', 8, 'u8@x.mn', ROLE_CLIENT),
    );
    check(
      'I1 replay: өөр мөрийн төлөгдсөн invoice-аар #2 нээгдэхгүй (өөрийн INV-2-оор шалгана)',
      [r, h.rows[1].status, h.calls.qpay],
      [false, PENDING, ['INV-2']],
    );
    check(
      'I2 бусдын service дээр polling → 404, QPay-г дуудахгүй',
      [
        await errStatus(() =>
          h.svc.checkPayment(1, 'INV-1', 8, 'u8@x.mn', ROLE_CLIENT),
        ),
        h.rows[0].status,
        h.calls.qpay.length,
      ],
      [404, PENDING, 1],
    );
    const own: any = await quiet(() =>
      h.svc.checkPayment(1, 'INV-1', 7, 'u7@x.mn', ROLE_CLIENT),
    );
    check(
      'I3 эзэмшигч өөрийн төлөгдсөн invoice → true, бүртгэл 1',
      [own, h.rows[0].status, h.calls.payments.length],
      [true, SUCCESS, 1],
    );
    const again: any = await quiet(() =>
      h.svc.checkPayment(1, 'INV-1', 7, 'u7@x.mn', ROLE_CLIENT),
    );
    check(
      'I4 давтан polling → true, бүртгэл дахин үүсэхгүй',
      [again, h.calls.payments.length, h.calls.transactions.length],
      [true, 1, 1],
    );
  }

  {
    const h = makeHarness([mkRow(1, 7)], { 'INV-1': 5000 });
    const r: any = await quiet(() =>
      h.svc.checkPayment(1, 'INV-1', 99, 'admin@x.mn', ROLE_ADMIN),
    );
    check(
      'I5 админ дурын service-ийг шалгаж чадна',
      [r, h.rows[0].status],
      [true, SUCCESS],
    );
  }

  {
    const h = makeHarness([mkRow(1, 7)], {});
    check(
      'I6 NONE → зөвхөн эзэмшигчид e-barimt өгнө',
      [
        await errStatus(() =>
          h.svc.checkPayment(1, 'NONE', 8, 'u8@x.mn', ROLE_CLIENT),
        ),
        (await h.svc.checkPayment(1, 'NONE', 7, 'u7@x.mn', ROLE_CLIENT)) as any,
        h.calls.ebarimt,
      ],
      [404, { ebarimt: 1 }, [[1, 'u7@x.mn']]],
    );
    check(
      'I7 буруу service id → 404',
      [
        await errStatus(() => h.svc.checkPayment(0, 'X', 7, 'e', ROLE_CLIENT)),
        await errStatus(() =>
          h.svc.checkPayment(999, 'X', 7, 'e', ROLE_CLIENT),
        ),
      ],
      [404, 404],
    );
  }

  log('\n— J: хуучин мөр (qpayInvoiceId = null) — polling-ийн fallback');
  {
    const h = makeHarness(
      [
        mkRow(1, 7, { qpayInvoiceId: null }),
        mkRow(2, 7, { qpayInvoiceId: null }),
      ],
      { 'OLD-1': 5000, SHORT: 1000 },
    );
    const under: any = await quiet(() =>
      h.svc.checkPayment(1, 'SHORT', 7, 'e', ROLE_CLIENT),
    );
    check(
      'J1 дутуу төлсөн invoice → нээхгүй',
      [under, h.rows[0].status],
      [false, PENDING],
    );

    const ok: any = await quiet(() =>
      h.svc.checkPayment(1, 'OLD-1', 7, 'e', ROLE_CLIENT),
    );
    check(
      'J2 төлөгдсөн invoice → SUCCESS, invoice мөрөнд холбогдоно',
      [ok, h.rows[0].status, h.rows[0].qpayInvoiceId],
      [true, SUCCESS, 'OLD-1'],
    );
    const replay: any = await quiet(() =>
      h.svc.checkPayment(2, 'OLD-1', 7, 'e', ROLE_CLIENT),
    );
    check(
      'J3 холбогдсон invoice-г өөр хуучин мөрөнд дахин ашиглахгүй',
      [replay, h.rows[1].status, h.calls.payments.length],
      [false, PENDING, 1],
    );
  }

  log('\n— K: create() — count шалгалт ба invoice холболт');
  {
    const clientUser = { id: 7, role: ROLE_CLIENT };
    const h = makeHarness([]);
    const codes: any[] = [];
    for (const count of [-3, 0, 1.5, NaN, 'abc' as any]) {
      codes.push(
        await errStatus(() =>
          h.svc.create({ count, assessment: 1 } as any, clientUser),
        ),
      );
    }
    check(
      'K1 count = -3 / 0 / 1.5 / NaN / "abc" → 400, мөр үүсэхгүй',
      [codes, h.rows.length, h.calls.invoices.length],
      [[400, 400, 400, 400, 400], 0, 0],
    );

    const orgH = makeHarness([]);
    const orgErr = await errStatus(() =>
      orgH.svc.create({ count: -5, assessment: 1 } as any, {
        id: 9,
        role: ROLE_ORG,
        wallet: '1000',
      }),
    );
    check(
      'K2 байгууллага count=-5 → 400, wallet-д мөнгө НЭМЭГДЭХГҮЙ',
      [orgErr, orgH.calls.wallet.length, orgH.rows.length],
      [400, 0, 0],
    );

    const ok: any = await h.svc.create(
      { count: '2' as any, assessment: 1 } as any,
      clientUser,
    );
    check(
      'K3 хэвийн худалдан авалт: count тоо болж, invoice_id мөрөнд холбогдоно',
      [
        ok.data.count,
        ok.data.price,
        ok.data.status,
        ok.invoice?.invoice_id,
        ok.data.qpayInvoiceId,
        h.rows[0].qpayInvoiceId,
      ],
      [
        2,
        10000,
        PENDING,
        `QP-${ok.data.id}`,
        `QP-${ok.data.id}`,
        `QP-${ok.data.id}`,
      ],
    );
  }

  log('\n— L: байгууллагын wallet — АТОМАР хасалт (№8)');
  {
    // Токен дахь wallet ('999999') хуучирсан / хуурамч ч ЭХ СУРВАЛЖ нь DB (debitWallet).
    const org = { id: 9, role: ROLE_ORG, wallet: '999999' };
    const h = makeHarness([], {}, { wallet: 12000 });
    const okRes: any = await h.svc.create({ count: 2, assessment: 1 } as any, org);
    check(
      'L1 wallet 12000, 2×5000: DB-ээс 10000 хасагдана, service SUCCESS, үлдэгдэл 2000, invoice үгүй',
      [h.calls.debits, h.wallet(), okRes.data.status, okRes.invoice, h.calls.wallet.length],
      [[[9, 10000]], 2000, SUCCESS, null, 0],
    );
    const err2 = await errStatus(() => h.svc.create({ count: 1, assessment: 1 } as any, org));
    check(
      'L2 үлдэгдэл 2000 < 5000 → 402 (JWT-д 999999 гэж байсан ч), service үүсэхгүй, wallet хэвээр',
      [err2, h.rows.length, h.wallet()],
      [402, 1, 2000],
    );
    const hf = makeHarness([], {}, { wallet: 20000, createFails: true });
    const errF = await errStatus(() => hf.svc.create({ count: 1, assessment: 1 } as any, org));
    check(
      'L3 service үүсгэх унавал хассан мөнгө БУЦААГДАНА',
      [errF, hf.wallet(), hf.calls.wallet],
      ['ERR:db down', 20000, [[9, 5000]]],
    );
  }

  console.log(
    failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`,
  );
  process.exit(failed === 0 ? 0 : 1);
})();
