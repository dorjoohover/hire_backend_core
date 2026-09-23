/**
 * SAFE_MODE (prod data → local / rehearsal) — гадагш дуудлага 0, guard ажиллана.
 *
 * Ажиллуулах:
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/safe-mode.spec-lite.ts
 *
 * Шалгах зүйл: (S1–S4) toggle + host guard (нууц үг алдагдахгүй); (S5–S8) Resend /
 * QPay / e-barimt / S3 нь SAFE_MODE-д сүлжээ рүү ХЭЗЭЭ Ч гарахгүй, SAFE_MODE
 * биш үед бодитоор дууддаг (mutation-check); (S9) mock invoice → report-access
 * төлбөр бүрэн урсгалаар автоматаар төлөгдөнө.
 */
import 'reflect-metadata';
import { mkdtempSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import axios from 'axios';
import {
  isSafeMode,
  hostOfUrl,
  assertSafeModeTargets,
  enforceSafeModeOrExit,
} from '../src/utils/safe-mode';
import { ResendService } from '../src/app/email/resend.service';
import { QpayService } from '../src/app/payment/qpay.service';
import { BarimtService } from '../src/app/barimt/barimt.service';
import { FileService } from '../src/file.service';
import { ReportAccessService } from '../src/app/report-access/report-access.service';
import { PaymentStatus } from '../src/base/constants';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`,
  );
};
const throws = (fn: () => any): string | null => {
  try {
    fn();
    return null;
  } catch (e: any) {
    return `${e?.message ?? e}`;
  }
};

const ENV_KEYS = [
  'SAFE_MODE',
  'SAFE_MODE_ALLOWED_HOSTS',
  'DATABASE_URL',
  'REDIS_HOST',
  'REPORT',
  'CORE',
  'RESEND_API_KEY',
  'BARIMT_URL',
];
const saved: Record<string, string | undefined> = {};
ENV_KEYS.forEach((k) => (saved[k] = process.env[k]));
const resetEnv = (over: Record<string, string> = {}) => {
  ENV_KEYS.forEach((k) => delete process.env[k]);
  Object.assign(process.env, over);
};

// Тестийн үед console дүүрэхгүй
const realLog = console.log;
const quiet = async <T>(fn: () => Promise<T> | T): Promise<T> => {
  const lines: string[] = [];
  console.log = (...a: any[]) => void lines.push(a.join(' '));
  try {
    return await fn();
  } finally {
    console.log = realLog;
    (quiet as any).last = lines;
  }
};

(async () => {
  console.log('— S1 toggle');
  const tab: [string | undefined, boolean][] = [
    ['1', true],
    ['true', true],
    ['YES', true],
    ['on', true],
    ['0', false],
    ['false', false],
    ['', false],
    [undefined, false],
    ['2', false],
  ];
  check(
    'S1 SAFE_MODE утгууд',
    tab.map(([v]) => isSafeMode({ SAFE_MODE: v } as any)),
    tab.map(([, e]) => e),
  );

  console.log('— S2 hostOfUrl');
  check(
    'S2 host задлах (нууц үг гарахгүй)',
    [
      hostOfUrl('postgres://u:p%40ss@localhost:5432/hp'),
      hostOfUrl('postgres://u:x@10.0.0.5:5432/hire'),
      hostOfUrl('postgres://u:x@[::1]:5432/hp'),
      hostOfUrl('postgres:///hp?host=/var/run/postgresql'),
      hostOfUrl('http://LOCALHOST:4001/api/v1/'),
      hostOfUrl('not a url'),
    ],
    ['localhost', '10.0.0.5', '::1', 'localhost', 'localhost', null],
  );

  console.log('— S3 assertSafeModeTargets');
  const LOCAL = {
    SAFE_MODE: '1',
    DATABASE_URL: 'postgres://dorjoo:secretpw@localhost:5432/hp_prod',
    REDIS_HOST: 'localhost',
    REPORT: 'http://localhost:4001/api/v1/',
  } as any;
  check('S3a local бүгд → OK', throws(() => assertSafeModeTargets(LOCAL)), null);
  const badDb = throws(() =>
    assertSafeModeTargets({
      ...LOCAL,
      DATABASE_URL: 'postgres://hire:SuperSecret123@db.hire.mn:5432/hire',
    }),
  );
  check(
    'S3b prod DB host → throw, host гарна, НУУЦ ҮГ ГАРАХГҮЙ',
    [
      /DATABASE_URL → db\.hire\.mn/.test(badDb ?? ''),
      /SuperSecret123/.test(badDb ?? ''),
      /hire:/.test(badDb ?? ''),
    ],
    [true, false, false],
  );
  check(
    'S3c prod Redis → throw',
    /REDIS_HOST → 10\.1\.2\.3/.test(
      throws(() => assertSafeModeTargets({ ...LOCAL, REDIS_HOST: '10.1.2.3' })) ?? '',
    ),
    true,
  );
  check(
    'S3d prod REPORT / CORE → throw',
    [
      /REPORT → api\.hire\.mn/.test(
        throws(() =>
          assertSafeModeTargets({ ...LOCAL, REPORT: 'https://api.hire.mn/api/v1/' }),
        ) ?? '',
      ),
      /CORE → core\.hire\.mn/.test(
        throws(() =>
          assertSafeModeTargets({ ...LOCAL, CORE: 'https://core.hire.mn/' }),
        ) ?? '',
      ),
    ],
    [true, true],
  );
  check(
    'S3e SAFE_MODE_ALLOWED_HOSTS (rehearsal docker: db, redis) → OK',
    throws(() =>
      assertSafeModeTargets({
        ...LOCAL,
        DATABASE_URL: 'postgres://u:p@db:5432/hp',
        REDIS_HOST: 'redis',
        SAFE_MODE_ALLOWED_HOSTS: 'db, redis',
      }),
    ),
    null,
  );
  check(
    'S3f SAFE_MODE биш бол prod host байсан ч шалгахгүй (prod-д нөлөөгүй)',
    throws(() =>
      assertSafeModeTargets({
        DATABASE_URL: 'postgres://u:p@db.hire.mn/hire',
        REDIS_HOST: 'redis.hire.mn',
      } as any),
    ),
    null,
  );
  check(
    'S3g DATABASE_URL задлагдахгүй → throw (fail closed)',
    /задлагдсангүй/.test(
      throws(() => assertSafeModeTargets({ ...LOCAL, DATABASE_URL: 'garbage' })) ?? '',
    ),
    true,
  );

  console.log('— S4 enforceSafeModeOrExit');
  const exits: number[] = [];
  const fakeExit: any = (c: number) => void exits.push(c);
  const realErr = console.error;
  console.error = () => undefined;
  await quiet(() => enforceSafeModeOrExit(LOCAL, fakeExit));
  enforceSafeModeOrExit(
    { ...LOCAL, DATABASE_URL: 'postgres://u:p@prod-db.example.com/x' },
    fakeExit,
  );
  enforceSafeModeOrExit({ DATABASE_URL: 'postgres://u:p@prod-db.example.com/x' } as any, fakeExit);
  console.error = realErr;
  check('S4 exit(1) зөвхөн (SAFE_MODE + prod host)-д', exits, [1]);

  // ---------------------------------------------------------------- S5 Resend
  console.log('— S5 Resend');
  resetEnv({ SAFE_MODE: '1' }); // RESEND_API_KEY ТОХИРУУЛААГҮЙ
  {
    let svc: ResendService | null = null;
    const err = throws(() => (svc = new ResendService()));
    check('S5a SAFE_MODE + түлхүүргүй → constructor унахгүй, клиент null', [err, (svc as any)?.resend], [null, null]);
    const res: any = await quiet(() =>
      svc!.sendMail({
        to: 'a@example.mn',
        subject: 'Урилга',
        html: '<a href="https://hire.mn/exam/XYZ">эхлэх</a><a href="mailto:x@y.z">m</a>',
      }),
    );
    const logged = ((quiet as any).last as string[]).join('\n');
    check('S5b sendMail → {error:null}, лог-д линк, mailto-г оруулаагүй', [res.error, /https:\/\/hire\.mn\/exam\/XYZ/.test(logged), /mailto/.test(logged)], [null, true, false]);
  }
  resetEnv({ RESEND_API_KEY: 're_dummy' }); // SAFE_MODE БАЙХГҮЙ → жинхэнэ клиент
  check('S5c SAFE_MODE биш → жинхэнэ Resend клиент үүснэ (mutation-check)', (new ResendService() as any).resend !== null, true);

  // ------------------------------------------------------------------ S6 QPay
  console.log('— S6 QPay');
  const httpCalls: string[] = [];
  const http: any = {
    post: () => (httpCalls.push('post'), { toPromise: undefined, subscribe: undefined }),
    request: () => (httpCalls.push('request'), { toPromise: undefined }),
  };
  resetEnv({ SAFE_MODE: '1' });
  {
    const q = new QpayService(http);
    const inv: any = await quiet(() => q.createInvoice(5000, 42, 7));
    const paid: any = await quiet(() => q.checkPayment(inv.invoice_id));
    const other: any = await quiet(() => q.checkPayment('QP-REAL-PROD-INVOICE'));
    const gi = await q.getInvoice(inv.invoice_id);
    check(
      'S6a mock invoice / төлөгдсөн / prod invoice төлөгдөөгүй / getInvoice; HTTP дуудлага 0',
      [
        /^SAFE-5000-42-\d+$/.test(inv.invoice_id),
        paid.paid_amount,
        other.paid_amount,
        gi,
        httpCalls.length,
      ],
      [true, 5000, 0, { status: 'PAID', amount: 5000 }, 0],
    );
  }
  resetEnv({});
  {
    // SAFE_MODE биш: HttpService рүү ЖИНХЭЭР дуудна (mutation-check)
    const q = new QpayService(http);
    await quiet(async () => {
      try {
        await q.createInvoice(5000, 42, 7);
      } catch {
        /* stub */
      }
    });
    check('S6b SAFE_MODE биш → HttpService дуудагдана (mutation-check)', httpCalls.length > 0, true);
  }

  // -------------------------------------------------------------- S7 e-barimt
  console.log('— S7 e-barimt');
  const axiosCalls: string[] = [];
  const realAxios = { post: axios.post, get: axios.get, delete: axios.delete };
  (axios as any).post = async (u: string) => (axiosCalls.push(`POST ${u}`), { data: { accessToken: 't', expiredIn: 60, status: 'SUCCESS' } });
  (axios as any).get = async (u: string) => (axiosCalls.push(`GET ${u}`), { data: {} });
  (axios as any).delete = async (u: string) => (axiosCalls.push(`DELETE ${u}`), { data: { data: {} } });
  const mails: string[] = [];
  const mailer: any = { sendEBarimtMail: async () => void mails.push('mail') };
  resetEnv({ SAFE_MODE: '1', BARIMT_URL: 'https://ebarimt.example/' });
  {
    const b = new BarimtService(mailer);
    const dto: any = { billIdSuffix: '9', receipts: [{ items: [{ name: 'x', qty: 1, unitPrice: 5000 }] }], payments: [] };
    const r: any = await quiet(async () => {
      const a = await b.restReceipt(dto, { email: 'a@example.mn' } as any, 5000, 9);
      await b.getBarimt(1, 'a@example.mn');
      await b.sendData();
      await b.getinformation();
      await b.deleteReceipt(1);
      await b.loginEbarimt();
      return a;
    });
    check('S7a SAFE_MODE: e-barimt 5 метод + login → axios 0, и-мэйл 0, mock SUCCESS', [axiosCalls.length, mails.length, r?.status], [0, 0, 'SUCCESS']);
  }
  resetEnv({ BARIMT_URL: 'https://ebarimt.example/' });
  {
    const b = new BarimtService(mailer);
    await quiet(() => b.getBarimt(1, 'a@example.mn'));
    check('S7b SAFE_MODE биш → axios дуудагдана (mutation-check)', axiosCalls.length > 0, true);
  }
  Object.assign(axios, realAxios);

  // --------------------------------------------------------------------- S8 S3
  console.log('— S8 S3 (core FileService)');
  const cwd0 = process.cwd();
  const tmp = mkdtempSync(join(tmpdir(), 'safe-mode-'));
  process.chdir(tmp);
  const s3Calls: string[] = [];
  const s3Stub: any = new Proxy(
    {},
    {
      get: (_t, prop: string) => () => ({
        promise: async () => (s3Calls.push(prop), { Contents: [] }),
      }),
    },
  );
  resetEnv({ SAFE_MODE: '1' });
  {
    const f: any = await quiet(() => new FileService());
    f.s3 = s3Stub;
    const key = 'safe-mode-test.png';
    const url = await quiet(() => f.upload(key, 'image/png', Buffer.from('x')));
    const ren = await quiet(() => f.massRenameWithReportPrefix());
    const dry = await quiet(() => f.dryRunRenameWithReportPrefix());
    const dl = await quiet(() => f.downloadFromS3('k'));
    check(
      'S8a SAFE_MODE: upload local-д бичнэ, S3 0 дуудлага; rename / dry-run / download алгасна',
      [url, existsSync(join(tmp, 'uploads', key)), s3Calls.length, (ren as any).success, (dry as any).success, dl],
      [key, true, 0, false, false, null],
    );
  }
  resetEnv({});
  {
    const f: any = await quiet(() => new FileService());
    f.s3 = s3Stub;
    await quiet(() => f.upload('m.png', 'image/png', Buffer.from('x')));
    check('S8b SAFE_MODE биш → S3 upload дуудагдана (mutation-check)', s3Calls.includes('upload'), true);
  }
  process.chdir(cwd0);

  // ----------------------------------------- S9 mock invoice → report-access
  console.log('— S9 report-access: mock invoice автоматаар төлөгдөнө');
  resetEnv({ SAFE_MODE: '1' });
  {
    const rows: any[] = [];
    const dao: any = {
      findPaidByCode: async (code: string) =>
        rows.find((r) => r.code === `${code}` && r.status === PaymentStatus.SUCCESS) ?? null,
      countRecentByCode: async () => 0,
      create: async (d: any) => {
        const r = { id: rows.length + 1, ...d };
        rows.push(r);
        return r;
      },
      setInvoice: async (id: number, invoiceId: string) => {
        rows.find((r) => r.id === id).invoiceId = invoiceId;
      },
      findByInvoice: async (i: string) => rows.find((r) => r.invoiceId === i) ?? null,
      findById: async (id: number) => rows.find((r) => r.id === id) ?? null,
      markPaid: async (id: number) => {
        const r = rows.find((x) => x.id === id);
        if (r?.status === PaymentStatus.PENDING) r.status = PaymentStatus.SUCCESS;
      },
    };
    const examDao: any = {
      findByCode: async (code: string) => ({
        code,
        reportViewCount: 0,
        reportViewedAt: null,
        assessment: { id: 1, reportFreeViews: 0, reportPdfPaid: true, reportPrice: 5000 },
        service: { price: 0, status: 0, user: { id: 9, role: 20 } },
        user: { id: 7 },
      }),
    };
    const q = new QpayService(http);
    const svc = new ReportAccessService(dao, examDao, q);
    const inv: any = await quiet(() => svc.createInvoice('CODE1', { id: 7, role: 20 }));
    const before = rows[0]?.status;
    const res: any = await quiet(() => svc.checkPayment('CODE1', inv.invoice.invoice_id, { id: 7, role: 20 }));
    check(
      'S9 createInvoice → mock invoice, checkPayment → paid=true, мөр SUCCESS болно',
      [before, res.paid, rows[0].status === PaymentStatus.SUCCESS],
      [PaymentStatus.PENDING, true, true],
    );
  }

  ENV_KEYS.forEach((k) => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  });
  console.log(failed ? `\n❌ ${failed} ШАЛГАЛТ УНАЛАА` : '\n✅ БҮГД АМЖИЛТТАЙ');
  process.exit(failed ? 1 : 0);
})();
