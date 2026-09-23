/**
 * 0.4 (d) — и-мэйл баталгаажуулалт: гарын үсэгтэй, 24 цагийн token; хуучин
 * `email/confirm/:email` холбоос баталгаажуулахаа больсон (DB-гүй).
 *
 * Ажиллуулах:
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/email-confirm.spec-lite.ts
 */
import 'reflect-metadata';
import * as jwt from 'jsonwebtoken';
import { createHmac } from 'crypto';
import {
  EMAIL_CONFIRM_TTL_MS,
  signEmailToken,
  verifyEmailToken,
} from '../src/utils/email-token';
import { UserService } from '../src/app/user/user.service';
import { UserController } from '../src/app/user/user.controller';
import { EmailService } from '../src/app/email/email.service';
import { IS_PUBLIC_KEY } from '../src/auth/guards/jwt/jwt-auth-guard';
import { jwtConstants } from '../src/auth/constants';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_INTERCEPTOR, NestFactory } from '@nestjs/core';
import { PostInterceptor } from '../src/post.interceptor';
import { AuthService } from '../src/auth/auth.service';
import * as http from 'http';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`,
  );
};
const errStatus = async (fn: () => Promise<any>) => {
  try {
    await fn();
    return null;
  } catch (e: any) {
    return e?.getStatus ? e.getStatus() : `ERR:${e?.message}`;
  }
};
const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');

(async () => {
  console.log('— token (utils/email-token.ts)');
  const now = Date.now();
  const t = signEmailToken('Bat@Example.MN', EMAIL_CONFIRM_TTL_MS, now);
  check(
    'T1 sign → verify: и-мэйлийг (жижиг үсгээр) буцаана',
    verifyEmailToken(t, now + 1000),
    'bat@example.mn',
  );
  check(
    'T2 24 цаг хүртэл хүчинтэй, дараа нь дуусна',
    [
      verifyEmailToken(t, now + EMAIL_CONFIRM_TTL_MS - 2000),
      verifyEmailToken(t, now + EMAIL_CONFIRM_TTL_MS + 2000),
    ],
    ['bat@example.mn', null],
  );

  const [payload, sig] = t.split('.');
  const forgedPayload = b64({
    e: 'victim@example.mn',
    x: Math.floor((now + EMAIL_CONFIRM_TTL_MS) / 1000),
  });
  check(
    'T3 өөр и-мэйл рүү солиход (гарын үсэг хэвээр) татгалзана',
    [
      verifyEmailToken(`${forgedPayload}.${sig}`, now),
      verifyEmailToken(`${payload}.${sig.slice(0, -2)}AA`, now),
    ],
    [null, null],
  );
  check(
    'T4 гарын үсэггүй / хоосон / эвдэрсэн / хэт урт',
    [
      verifyEmailToken('', now),
      verifyEmailToken(undefined, now),
      verifyEmailToken(payload, now),
      verifyEmailToken(`${payload}.`, now),
      verifyEmailToken('a.b.c', now),
      verifyEmailToken('x'.repeat(3000), now),
      verifyEmailToken({ token: t } as any, now),
    ],
    [null, null, null, null, null, null, null],
  );
  // Өөр түлхүүрээр (жишээ нь JWT_SECRET-ээр шууд) гарын үсэг зурсан token хүчингүй.
  const wrongSig = createHmac('sha256', jwtConstants.secret)
    .update(payload)
    .digest('base64url');
  check(
    'T5 түлхүүр ялгаа: JWT_SECRET-ээр шууд зурсан гарын үсэг хүчингүй',
    verifyEmailToken(`${payload}.${wrongSig}`, now),
    null,
  );
  // Access token (JWT) баталгаажуулах token болж ОРОХГҮЙ.
  const accessJwt = jwt.sign(
    { email: 'bat@example.mn', role: 20 },
    jwtConstants.secret,
    { expiresIn: '1h' },
  );
  check(
    'T6 access JWT баталгаажуулах token болж хүчинтэй биш',
    verifyEmailToken(accessJwt),
    null,
  );
  {
    const saved = process.env.EMAIL_CONFIRM_SECRET;
    process.env.EMAIL_CONFIRM_SECRET = 'another-secret';
    const t2 = signEmailToken('a@b.mn', EMAIL_CONFIRM_TTL_MS, now);
    delete process.env.EMAIL_CONFIRM_SECRET;
    check(
      'T7 EMAIL_CONFIRM_SECRET-ээр зурсан token, тэр түлхүүргүйгээр хүчингүй',
      verifyEmailToken(t2, now),
      null,
    );
    if (saved !== undefined) process.env.EMAIL_CONFIRM_SECRET = saved;
  }

  console.log('\n— UserService.confirmEmail');
  const makeUserSvc = (existing: string[]) => {
    const verified: string[] = [];
    const dao: any = {
      verify: async (data: string, _isEmail: boolean, email: string) => {
        if (!existing.includes(email)) {
          const { HttpException } = await import('@nestjs/common');
          throw new HttpException('Бүртгэлгүй хэрэглэгч байна.', 401);
        }
        verified.push(email);
      },
    };
    return { svc: new (UserService as any)(dao, {} as any), verified };
  };
  {
    const h = makeUserSvc(['bat@example.mn']);
    const r = await h.svc.confirmEmail(signEmailToken('bat@example.mn'));
    check(
      'U1 зөв token → и-мэйл баталгаажна',
      [r, h.verified],
      [{ email: 'bat@example.mn' }, ['bat@example.mn']],
    );
  }
  {
    const h = makeUserSvc(['bat@example.mn', 'victim@example.mn']);
    const bad = [
      'victim@example.mn', // өмнөх (хуучин) хэлбэр: зөвхөн и-мэйл
      '',
      signEmailToken('victim@example.mn', -1000), // хугацаа дууссан
      `${b64({ e: 'victim@example.mn', x: 9999999999 })}.AAAA`,
    ];
    const res = await Promise.all(
      bad.map((tk) => errStatus(() => h.svc.confirmEmail(tk))),
    );
    check(
      'U2 и-мэйл ганцаараа / хугацаа дууссан / хуурамч → 400, баталгаажуулахгүй',
      [res, h.verified],
      [[400, 400, 400, 400], []],
    );
  }
  {
    const h = makeUserSvc([]);
    check(
      'U3 зөв token боловч хэрэглэгчгүй → 401 (өмнөх шигээ)',
      await errStatus(() =>
        h.svc.confirmEmail(signEmailToken('nobody@example.mn')),
      ),
      401,
    );
  }

  console.log('\n— UserController');
  {
    const post = (UserController.prototype as any).confirmEmail;
    check(
      'C1 POST email/confirm → @Public',
      Reflect.getMetadata(IS_PUBLIC_KEY, post),
      true,
    );

    let touched = 0;
    const userService: any = {
      verifyMail: () => touched++,
      confirmEmail: () => touched++,
    };
    const ctrl: any = new (UserController as any)(userService, {} as any);
    const redirects: string[] = [];
    process.env.WEB = 'https://hire.mn';
    ctrl.legacyConfirmLink({ redirect: (u: string) => redirects.push(u) });
    check(
      'C2 ХУУЧИН GET email/confirm/:email → баталгаажуулахгүй, signin руу чиглүүлнэ',
      [touched, redirects],
      [0, ['https://hire.mn/auth/signin?confirm=invalid']],
    );
  }

  console.log('\n— EmailService.sendVerification (мэйлийн холбоос)');
  {
    const sent: any[] = [];
    const svc: any = Object.create(EmailService.prototype);
    svc.logAndQueue = async (m: any) => void sent.push(m);
    process.env.WEB = 'https://hire.mn';
    await svc.sendVerification({ email: 'bat@example.mn' });
    const html: string = sent[0].html;
    const href = /href="(https:\/\/hire\.mn\/auth\/confirm\?token=[^"]+)"/.exec(
      html,
    )?.[1];
    const tokenInLink = href ? decodeURIComponent(href.split('token=')[1]) : '';
    check(
      'E1 холбоос = web /auth/confirm?token=…, token нь тухайн и-мэйлийг баталгаажуулна',
      [!!href, verifyEmailToken(tokenInLink)],
      [true, 'bat@example.mn'],
    );
    check(
      'E2 мэйлд API-ийн хуучин холбоос / и-мэйлтэй path алга',
      [
        html.includes('api.hire.mn'),
        html.includes('/user/email/confirm'),
        html.includes('confirm/bat@example.mn'),
      ],
      [false, false, false],
    );
  }

  console.log(
    '\n— HTTP: POST /user/email/confirm (жинхэнэ Nest + ValidationPipe + PostInterceptor)',
  );
  {
    const real = new (UserService as any)(
      { verify: async () => undefined },
      {} as any,
    );
    @Module({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: real },
        { provide: AuthService, useValue: {} },
        { provide: APP_INTERCEPTOR, useClass: PostInterceptor },
      ],
    })
    class HttpTestModule {}
    const app = await NestFactory.create(HttpTestModule, { logger: false });
    app.useGlobalPipes(new ValidationPipe());
    await app.listen(0, '127.0.0.1');
    const port = (app.getHttpServer().address() as any).port;
    const post = (body: any) =>
      new Promise<{ status: number; json: any }>((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request(
          {
            host: '127.0.0.1',
            port,
            method: 'POST',
            path: '/user/email/confirm',
            headers: {
              'content-type': 'application/json',
              'content-length': Buffer.byteLength(data),
            },
          },
          (res) => {
            let b = '';
            res.on('data', (c) => (b += c));
            res.on('end', () =>
              resolve({ status: res.statusCode!, json: JSON.parse(b || '{}') }),
            );
          },
        );
        req.on('error', reject);
        req.end(data);
      });
    const ok = await post({ token: signEmailToken('bat@example.mn') });
    check(
      'H1 зөв token → 200, web-ийн уншдаг хэлбэр { succeed, payload: { email } }',
      [ok.status, ok.json],
      [200, { succeed: true, payload: { email: 'bat@example.mn' } }],
    );
    const missing = await post({});
    const legacy = await post({ token: 'bat@example.mn' });
    const expired = await post({
      token: signEmailToken('bat@example.mn', -1000),
    });
    check(
      'H2 token байхгүй / и-мэйл ганцаараа / хугацаа дууссан → 400',
      [missing.status, legacy.status, expired.status],
      [400, 400, 400],
    );
    await app.close();
  }

  console.log(
    failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`,
  );
  process.exit(failed === 0 ? 0 : 1);
})();
