/**
 * 0.4 (b), (c) — ReportController-ийн дотоод endpoint-ууд, sendMail-ийн атомар
 * COMPLETED → SENT, QpayController устсан эсэх (DB / HTTP-гүй).
 *
 * Ажиллуулах:
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/report-internal.spec-lite.ts
 */
import 'reflect-metadata';
import { ReportController } from '../src/app/report/report.controller';
import { ReportService } from '../src/app/report/report.service';
import { PaymentModule } from '../src/app/payment/payment.module';
import {
  InternalKeyGuard,
  InternalKeyGuardLenient,
} from '../src/auth/guards/internal/internal-key.guard';
import { IS_PUBLIC_KEY } from '../src/auth/guards/jwt/jwt-auth-guard';
import { REPORT_STATUS } from '../src/base/constants';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`,
  );
};

const handler = (name: string) => (ReportController.prototype as any)[name];
const isPublic = (h: any) => Reflect.getMetadata(IS_PUBLIC_KEY, h) === true;
const guards = (h: any): string[] =>
  (Reflect.getMetadata('__guards__', h) ?? []).map((g: any) => g.name);

(async () => {
  console.log('— ReportController route metadata');
  check(
    'R1 class-level @Public() БАЙХГҮЙ',
    Reflect.getMetadata(IS_PUBLIC_KEY, ReportController) ?? null,
    null,
  );
  check(
    'R2 POST /report → @Public (JWT-г алгасна) + InternalKeyGuard',
    [isPublic(handler('create')), guards(handler('create'))],
    [true, ['InternalKeyGuard']],
  );
  check(
    'R3 GET /report/mail/:code → @Public + InternalKeyGuardLenient (rollout: түлхүүр тохируулаагүй үед л нээлттэй)',
    [isPublic(handler('sendMail')), guards(handler('sendMail'))],
    [true, ['InternalKeyGuardLenient']],
  );
  check(
    'R4 GET /report/:id/status → нээлттэй хэвээр, guard-гүй',
    [isPublic(handler('status')), guards(handler('status'))],
    [true, []],
  );

  console.log('\n— InternalKeyGuard');
  {
    const g = new InternalKeyGuard();
    const run = (headers: any) => {
      try {
        return g.canActivate({
          switchToHttp: () => ({ getRequest: () => ({ headers }) }),
        } as any);
      } catch (e: any) {
        return `ERR:${e?.status}`;
      }
    };
    const saved = process.env.INTERNAL_API_KEY;
    delete process.env.INTERNAL_API_KEY;
    check(
      'G1 INTERNAL_API_KEY тохируулаагүй → бүгдийг хаана (fail closed)',
      [run({}), run({ 'x-internal-key': 'x' }), run({ 'x-internal-key': '' })],
      ['ERR:401', 'ERR:401', 'ERR:401'],
    );
    process.env.INTERNAL_API_KEY = 'internal-secret';
    check(
      'G2 header байхгүй / буруу / богино / урт / массив → 401',
      [
        run({}),
        run({ 'x-internal-key': 'wrong' }),
        run({ 'x-internal-key': 'internal-secre' }),
        run({ 'x-internal-key': 'internal-secret-and-more' }),
        run({ 'x-internal-key': ['internal-secret'] }),
        run({ authorization: 'Bearer internal-secret' }),
      ],
      ['ERR:401', 'ERR:401', 'ERR:401', 'ERR:401', 'ERR:401', 'ERR:401'],
    );
    check(
      'G3 зөв түлхүүр → нэвтэрнэ',
      run({ 'x-internal-key': 'internal-secret' }),
      true,
    );
    // Lenient: зөвхөн rollout-ын үед (core → report → түлхүүр тохируулах дараалал).
    const lenient = new InternalKeyGuardLenient();
    const runL = (headers: any) => {
      try {
        return lenient.canActivate({
          switchToHttp: () => ({ getRequest: () => ({ headers }) }),
        } as any);
      } catch (e: any) {
        return `ERR:${e?.status}`;
      }
    };
    delete process.env.INTERNAL_API_KEY;
    check(
      'G4 Lenient: түлхүүр тохируулаагүй → нэвтэрнэ (rollout хугацаанд 401 цонх үүсгэхгүй)',
      [runL({}), runL({ 'x-internal-key': 'x' })],
      [true, true],
    );
    check(
      'G5 Strict guard түлхүүргүй үед fail-closed хэвээр (Lenient нь strict-д нөлөөлөхгүй)',
      run({ 'x-internal-key': 'x' }),
      'ERR:401',
    );
    process.env.INTERNAL_API_KEY = 'internal-secret';
    check(
      'G6 Lenient: түлхүүр тохируулсан бол header байхгүй / буруу → 401, зөв → нэвтэрнэ',
      [
        runL({}),
        runL({ 'x-internal-key': 'wrong' }),
        runL({ 'x-internal-key': ['internal-secret'] }),
        runL({ 'x-internal-key': 'internal-secret' }),
      ],
      ['ERR:401', 'ERR:401', 'ERR:401', true],
    );
    if (saved === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = saved;
  }

  console.log('\n— ReportService.sendMail (атомар COMPLETED → SENT)');
  const makeSvc = (rows: { code: string; status: string }[]) => {
    const emails: string[] = [];
    const dao: any = {
      // Жинхэнэ DAO-ийн `UPDATE … WHERE code = ? AND status = COMPLETED`-ийг дуурайна.
      claimSent: async (code: string) => {
        await new Promise((r) => setTimeout(r, 2)); // зэрэгцээ дуудлагыг бодитой болгоно
        let hit = false;
        for (const r of rows) {
          if (r.code === code && r.status === REPORT_STATUS.COMPLETED) {
            r.status = REPORT_STATUS.SENT;
            hit = true;
          }
        }
        return hit;
      },
    };
    const svc: any = new (ReportService as any)({} as any, dao);
    svc.userAnswer = { sendEmail: async (c: string) => void emails.push(c) };
    return { svc, emails, rows };
  };
  {
    const h = makeSvc([{ code: 'A', status: REPORT_STATUS.COMPLETED }]);
    await h.svc.sendMail('A');
    check(
      'M1 COMPLETED → SENT болж 1 мэйл',
      [h.rows[0].status, h.emails],
      [REPORT_STATUS.SENT, ['A']],
    );
    await h.svc.sendMail('A');
    check('M2 давтан дуудахад мэйл дахин явахгүй', h.emails, ['A']);
  }
  {
    const h = makeSvc([{ code: 'B', status: REPORT_STATUS.COMPLETED }]);
    await Promise.all([
      h.svc.sendMail('B'),
      h.svc.sendMail('B'),
      h.svc.sendMail('B'),
    ]);
    check('M3 3 зэрэг дуудлага (hire_report + polling) → яг 1 мэйл', h.emails, [
      'B',
    ]);
  }
  {
    const st = [
      REPORT_STATUS.WRITING,
      REPORT_STATUS.CALCULATING,
      REPORT_STATUS.PENDING,
      REPORT_STATUS.FAILED,
    ];
    const rows = st.map((s, i) => ({ code: `X${i}`, status: s as string }));
    const h = makeSvc(rows);
    for (const r of rows) await h.svc.sendMail(r.code);
    check(
      'M4 COMPLETED БИШ төлөвт SENT болгохгүй, мэйл явуулахгүй (WRITING / CALCULATING / PENDING / FAILED)',
      [rows.map((r) => r.status), h.emails],
      [st, []],
    );
    await h.svc.sendMail('NOPE');
    check('M5 олдохгүй код → юу ч болохгүй', h.emails, []);
  }

  console.log('\n— QpayController (0.4 c)');
  {
    const ctrls: string[] = (
      Reflect.getMetadata('controllers', PaymentModule) ?? []
    ).map((c: any) => c.name);
    check('Q1 PaymentModule-д QpayController байхгүй', ctrls, [
      'PaymentController',
    ]);
  }

  console.log(
    failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`,
  );
  process.exit(failed === 0 ? 0 : 1);
})();
