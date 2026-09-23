/**
 * §2 (нөхцөлт алгасах дүрэм) — (1) `POST /userAnswer/finish` идемпотент дуусгалт,
 * (2)(3) дүрмийн шалгалт (SINGLE / MULTIPLE, өөртэйгөө, цикл, блокийн дараалал,
 * давхардал), PATCH / active, `show` хасагдсан, `GET question/rule` admin-д (DB / HTTP-гүй,
 * харин DTO шалгалтыг жинхэнэ Nest + ValidationPipe-аар).
 *
 * Ажиллуулах:
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/skip-rule.spec-lite.ts
 */
import 'reflect-metadata';
import * as http from 'http';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_INTERCEPTOR, NestFactory } from '@nestjs/core';
import { PostInterceptor } from '../src/post.interceptor';
import { QuestionRuleService } from '../src/app/question/question.rule.service';
import { QuestionRuleController } from '../src/app/question/question.rule.controller';
import { QuestionRuleDao } from '../src/app/question/dao/question.rule.dao';
import { QuestionRuleAction } from '../src/app/question/entities/question.rule.entity';
import { UserAnswerService } from '../src/app/user.answer/user.answer.service';
import { UserAnswerController } from '../src/app/user.answer/user.answer.controller';
import { IS_PUBLIC_KEY } from '../src/auth/guards/jwt/jwt-auth-guard';
import { ROLES_KEY } from '../src/auth/guards/role/role.decorator';
import { ADMIN, SUPER_ADMIN, TESTER } from '../src/base/constants';

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
    return 'OK';
  } catch (e: any) {
    return e?.status ?? `ERR:${e?.message}`;
  }
};

// ---------------- дүрмийн service: санах ойн dao ----------------
const SINGLE = 10;
const MULTIPLE = 20;
const MATRIX = 40;
// id → [type, categoryId, categoryOrder, assessmentId]
const QUESTIONS: Record<number, [number, number, number, number]> = {
  1: [SINGLE, 100, 1, 1], // 1-р блок
  2: [MULTIPLE, 100, 1, 1], // 1-р блок
  3: [SINGLE, 200, 2, 1], // 2-р блок
  4: [MATRIX, 100, 1, 1], // 1-р блок, MATRIX (нөхцөл болохгүй)
  5: [SINGLE, 300, 1, 2], // ӨӨР тест
  6: [SINGLE, 300, 3, 1], // 3-р блок
  7: [SINGLE, 100, 1, 1],
  8: [SINGLE, 100, 1, 1],
  9: [SINGLE, 100, 1, 1],
};
const ANSWER_OWNER: Record<number, number> = { 11: 1, 12: 1, 21: 2, 31: 3 };

const makeDao = (rules: any[] = []) => {
  const store = rules.map((r, i) => ({
    id: i + 1,
    action: 'skip',
    active: true,
    dependsOnAnswerId: null,
    ...r,
  }));
  const updates: any[] = [];
  const dao: any = {
    findQuestionMeta: async (ids: number[]) =>
      ids
        .filter((id) => QUESTIONS[id])
        .map((id) => ({
          id,
          type: QUESTIONS[id][0],
          categoryId: QUESTIONS[id][1],
          categoryOrder: QUESTIONS[id][2],
          assessmentId: QUESTIONS[id][3],
        })),
    findAnswerQuestionId: async (a: number) => ANSWER_OWNER[a] ?? null,
    findAll: async () => store,
    findOne: async (id: number) => store.find((r) => r.id === id) ?? null,
    updateOne: async (id: number, patch: any) => void updates.push([id, patch]),
    create: async (dto: any) => {
      store.push({ id: store.length + 1, ...dto });
      return store.length;
    },
  };
  return { dao, store, updates, svc: new QuestionRuleService(dao) };
};

(async () => {
  console.log('— QuestionRuleService.validate');
  {
    const h = makeDao();
    const ok = await h.svc.validate({
      targetQuestionId: 3,
      dependsOnQuestionId: 1,
      dependsOnAnswerId: 11,
    });
    check(
      'V1 зөв дүрэм (SINGLE нөхцөл, өмнөх блок, хариулт нь тухайн асуултынх) → цэвэрлэгдсэн дүрэм',
      ok,
      {
        targetQuestionId: 3,
        dependsOnQuestionId: 1,
        dependsOnAnswerId: 11,
        action: 'skip',
        active: true,
      },
    );
    check(
      'V1b MULTIPLE нөхцөл, ижил блок, хариулт null ("ямар нэг хариулт") → OK',
      (
        await h.svc.validate({
          targetQuestionId: 1,
          dependsOnQuestionId: 2,
          dependsOnAnswerId: null,
        })
      ).dependsOnAnswerId,
      null,
    );
  }
  {
    const h = makeDao();
    const st = (r: any) => errStatus(() => h.svc.validate(r));
    check(
      'V2 өөрөө өөр рүүгээ → 400',
      await st({ targetQuestionId: 1, dependsOnQuestionId: 1 }),
      400,
    );
    check(
      'V3 байхгүй асуулт (алгасах / нөхцөл) → 404',
      [
        await st({ targetQuestionId: 99, dependsOnQuestionId: 1 }),
        await st({ targetQuestionId: 3, dependsOnQuestionId: 99 }),
      ],
      [404, 404],
    );
    check(
      'V4 нөхцөл нь MATRIX → 400',
      await st({ targetQuestionId: 3, dependsOnQuestionId: 4 }),
      400,
    );
    check(
      'V5 хариулт нь өөр асуултынх / байхгүй → 400',
      [
        await st({
          targetQuestionId: 3,
          dependsOnQuestionId: 1,
          dependsOnAnswerId: 21,
        }),
        await st({
          targetQuestionId: 3,
          dependsOnQuestionId: 1,
          dependsOnAnswerId: 777,
        }),
      ],
      [400, 400],
    );
    check(
      'V6 нөхцөл асуулт ДАРААГИЙН блокт (2-р блок → 1-р блок руу) → 400',
      await st({ targetQuestionId: 1, dependsOnQuestionId: 3 }),
      400,
    );
    check(
      'V6b нөхцөл нь 3-р блок, алгасах нь 2-р блок → 400',
      await st({ targetQuestionId: 3, dependsOnQuestionId: 6 }),
      400,
    );
    check(
      'V7 өөр тестийн хоёр асуулт → 400',
      await st({ targetQuestionId: 5, dependsOnQuestionId: 1 }),
      400,
    );
    check(
      'V8 action "show" / мэдэхгүй → 400 (show хасагдсан)',
      [
        await st({
          targetQuestionId: 3,
          dependsOnQuestionId: 1,
          action: 'show',
        }),
        await st({ targetQuestionId: 3, dependsOnQuestionId: 1, action: 'x' }),
      ],
      [400, 400],
    );
    check(
      'V9 id нь тоо биш / сөрөг / 0 → 400',
      [
        await st({ targetQuestionId: 'abc', dependsOnQuestionId: 1 }),
        await st({ targetQuestionId: -3, dependsOnQuestionId: 1 }),
        await st({ targetQuestionId: 3, dependsOnQuestionId: 0 }),
        await st({ targetQuestionId: undefined, dependsOnQuestionId: 1 }),
      ],
      [400, 400, 400, 400],
    );
  }
  {
    const h = makeDao([
      { targetQuestionId: 3, dependsOnQuestionId: 1, dependsOnAnswerId: 11 },
    ]);
    const st = (r: any) => errStatus(() => h.svc.validate(r));
    check(
      'V10 давхардсан дүрэм → 400; өөр хариулт / хариулт null нь давхардал БИШ',
      [
        await st({
          targetQuestionId: 3,
          dependsOnQuestionId: 1,
          dependsOnAnswerId: 11,
        }),
        await st({
          targetQuestionId: 3,
          dependsOnQuestionId: 1,
          dependsOnAnswerId: 12,
        }),
        await st({ targetQuestionId: 3, dependsOnQuestionId: 1 }),
      ],
      [400, 'OK', 'OK'],
    );
  }
  {
    const h = makeDao([{ targetQuestionId: 2, dependsOnQuestionId: 1 }]);
    check(
      'V11 шууд цикл: 2 ← 1 байхад 1 ← 2 → 400',
      await errStatus(() =>
        h.svc.validate({ targetQuestionId: 1, dependsOnQuestionId: 2 }),
      ),
      400,
    );
    const h2 = makeDao([
      { targetQuestionId: 8, dependsOnQuestionId: 7 },
      { targetQuestionId: 9, dependsOnQuestionId: 8 },
    ]);
    check(
      'V12 шууд бус цикл: 8 ← 7, 9 ← 8 байхад 7 ← 9 → 400; гинжийг үргэлжлүүлэх (нэмэлт) нь OK',
      [
        await errStatus(() =>
          h2.svc.validate({ targetQuestionId: 7, dependsOnQuestionId: 9 }),
        ),
        await errStatus(() =>
          h2.svc.validate({ targetQuestionId: 3, dependsOnQuestionId: 9 }),
        ),
      ],
      [400, 'OK'],
    );
  }

  console.log('\n— QuestionRuleService.update (PATCH / active)');
  {
    // Хуучин, буруу дүрэм (MATRIX нөхцөл) — legacy.
    const h = makeDao([
      { targetQuestionId: 3, dependsOnQuestionId: 4 },
      { targetQuestionId: 3, dependsOnQuestionId: 1, dependsOnAnswerId: 11 },
    ]);
    check(
      'P1 { active:false } → шалгахгүй унтраана (хуучин буруу дүрмийг ч)',
      [await errStatus(() => h.svc.update(1, { active: false })), h.updates],
      ['OK', [[1, { active: false }]]],
    );
    check(
      'P2 буруу legacy дүрмийг дахин идэвхжүүлэх ({active:true}) → шалгана → 400',
      await errStatus(() => h.svc.update(1, { active: true })),
      400,
    );
    h.updates.length = 0;
    check(
      'P3 өөрийнхөө утгаар засах (ignoreId) → давхардал биш, OK; хариултыг солих → OK',
      [
        await errStatus(() =>
          h.svc.update(2, { dependsOnAnswerId: 11, active: true }),
        ),
        await errStatus(() => h.svc.update(2, { dependsOnAnswerId: 12 })),
        h.updates.map((u) => [u[0], u[1].dependsOnAnswerId]),
      ],
      [
        'OK',
        'OK',
        [
          [2, 11],
          [2, 12],
        ],
      ],
    );
    check(
      'P4 хариултыг null болгож болно; өөр асуултын хариулт → 400',
      [
        await errStatus(() => h.svc.update(2, { dependsOnAnswerId: null })),
        await errStatus(() => h.svc.update(2, { dependsOnAnswerId: 21 })),
      ],
      ['OK', 400],
    );
    check(
      'P5 олдохгүй дүрэм → 404; хоосон patch → 400',
      [
        await errStatus(() => h.svc.update(99, { active: false })),
        await errStatus(() => h.svc.update(2, {})),
      ],
      [404, 400],
    );
  }
  {
    const h = makeDao();
    const id = await h.svc.create({
      targetQuestionId: 3,
      dependsOnQuestionId: 1,
    });
    check(
      'P6 create → dao-д цэвэрлэгдсэн дүрэм, action skip, active true',
      [id, h.store[0].action, h.store[0].active, h.store[0].dependsOnAnswerId],
      [1, 'skip', true, null],
    );
    check('P7 enum-д SHOW байхгүй', Object.keys(QuestionRuleAction), ['SKIP']);
  }

  console.log('\n— Route metadata');
  {
    const q: any = QuestionRuleController.prototype;
    const roles = (n: string) => Reflect.getMetadata(ROLES_KEY, q[n]) ?? null;
    const pub = (n: string) =>
      Reflect.getMetadata(IS_PUBLIC_KEY, q[n]) === true;
    const adminRoles = [ADMIN, SUPER_ADMIN, TESTER].sort();
    const isAdminOnly = (n: string) =>
      JSON.stringify([...(roles(n) ?? [])].sort()) ===
        JSON.stringify(adminRoles) && !pub(n);
    check(
      'R1 create / findAll / findByQuestion / update / delete бүгд admin-д, @Public алга',
      ['create', 'findAll', 'findByQuestion', 'update', 'delete'].map(
        isAdminOnly,
      ),
      [true, true, true, true, true],
    );
    const u: any = UserAnswerController.prototype;
    check(
      'R2 POST userAnswer/finish → @Public БИШ (нэвтэрсэн), тусгай role шаардахгүй (create шиг)',
      [
        Reflect.getMetadata(IS_PUBLIC_KEY, u.finish) === true,
        Reflect.getMetadata(ROLES_KEY, u.finish) ?? null,
      ],
      [false, null],
    );
    check(
      'R3 finish нь POST /userAnswer/finish',
      [
        Reflect.getMetadata('path', u.finish),
        Reflect.getMetadata('method', u.finish),
      ],
      ['finish', 1 /* RequestMethod.POST */],
    );
  }

  console.log('\n— UserAnswerService.finish (идемпотент дуусгалт)');
  const makeAnswerSvc = (
    exams: Record<string, { visible: boolean; ended: boolean }>,
  ) => {
    const reports: string[] = [];
    let failReport = false;
    const examDao: any = {
      findByCodeOnly: async (code: string) =>
        exams[code] ? { id: 1, visible: exams[code].visible } : null,
      claimEnd: async (code: string) => {
        await new Promise((r) => setTimeout(r, 2));
        if (!exams[code] || exams[code].ended) return false;
        exams[code].ended = true;
        return true;
      },
    };
    const report: any = {
      createReport: async ({ code }: any) => {
        reports.push(code);
        if (failReport) throw new Error('report VPS унтарсан');
      },
    };
    const svc: any = new (UserAnswerService as any)(
      {}, // dao
      {}, // questionDao
      examDao,
      {}, // mailService
      {}, // questionAnswerDao
      report,
      {}, // matrixDao
      {}, // categoryDao
      {}, // resultDao
    );
    return { svc, reports, exams, fail: () => (failReport = true) };
  };
  {
    const h = makeAnswerSvc({ A: { visible: true, ended: false } });
    const res = await h.svc.finish('A');
    check(
      'F1 анх удаа дуусгахад тайлан 1 удаа үүснэ, userEndDate тавигдана',
      [res, h.reports, h.exams.A.ended],
      [{ visible: true, finished: true, alreadyFinished: false }, ['A'], true],
    );
    const again = await h.svc.finish('A');
    check(
      'F2 давтан дуудахад (refresh / retry) тайлан ДАХИН үүсэхгүй, идемпотент хариу',
      [again, h.reports],
      [{ visible: true, finished: true, alreadyFinished: true }, ['A']],
    );
  }
  {
    const h = makeAnswerSvc({ B: { visible: false, ended: false } });
    await Promise.all([
      h.svc.finish('B'),
      h.svc.finish('B'),
      h.svc.finish('B'),
    ]);
    check('F3 3 зэрэг дуудлага → яг 1 тайлан', h.reports, ['B']);
  }
  {
    // create(end:true)-ээр аль хэдийн дууссан → finish дахин тайлан үүсгэхгүй
    const h = makeAnswerSvc({ C: { visible: true, ended: true } });
    const res = await h.svc.finish('C');
    check(
      'F4 аль хэдийн дууссан тест → тайлан үүсгэхгүй, visible буцаана',
      [res.alreadyFinished, h.reports],
      [true, []],
    );
  }
  {
    const h = makeAnswerSvc({});
    check(
      'F5 олдохгүй тест / хоосон код / string биш → 400, тайлан үүсэхгүй',
      [
        await errStatus(() => h.svc.finish('NOPE')),
        await errStatus(() => h.svc.finish('')),
        await errStatus(() => h.svc.finish(undefined as any)),
        h.reports,
      ],
      [400, 400, 400, []],
    );
  }
  {
    const h = makeAnswerSvc({ D: { visible: true, ended: false } });
    h.fail();
    let unhandled = 0;
    const onUnhandled = () => unhandled++;
    process.on('unhandledRejection', onUnhandled);
    const origErr = console.error;
    console.error = () => undefined;
    const res = await h.svc.finish('D');
    await new Promise((r) => setTimeout(r, 20));
    console.error = origErr;
    process.off('unhandledRejection', onUnhandled);
    check(
      'F6 createReport унавал finish алдаагүй буцаана, unhandled rejection үүсэхгүй (createReport өөрөө FAILED мөр бичнэ)',
      [res.finished, unhandled],
      [true, 0],
    );
  }

  console.log('\n— HTTP: жинхэнэ Nest + ValidationPipe + PostInterceptor');
  {
    const h = makeDao();
    const answerSvc = makeAnswerSvc({ E: { visible: true, ended: false } });
    @Module({
      controllers: [QuestionRuleController, UserAnswerController],
      providers: [
        { provide: QuestionRuleDao, useValue: h.dao },
        { provide: QuestionRuleService, useValue: h.svc },
        { provide: UserAnswerService, useValue: answerSvc.svc },
        { provide: APP_INTERCEPTOR, useClass: PostInterceptor },
      ],
    })
    class HttpTestModule {}
    const app = await NestFactory.create(HttpTestModule, { logger: false });
    app.useGlobalPipes(new ValidationPipe());
    await app.listen(0, '127.0.0.1');
    const port = (app.getHttpServer().address() as any).port;
    const call = (method: string, path: string, body?: any) =>
      new Promise<{ status: number; json: any }>((resolve, reject) => {
        const data = body === undefined ? '' : JSON.stringify(body);
        const req = http.request(
          {
            host: '127.0.0.1',
            port,
            method,
            path,
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

    const fin = await call('POST', '/userAnswer/finish', { code: 'E' });
    check(
      'H1 POST /userAnswer/finish → 201/200 + web-ийн уншдаг { succeed, payload: { visible, … } }',
      [fin.status < 300, fin.json.succeed, fin.json.payload?.visible],
      [true, true, true],
    );
    const fin2 = await call('POST', '/userAnswer/finish', { code: 'E' });
    check(
      'H2 давтан → alreadyFinished, тайлан 1 хэвээр',
      [fin2.json.payload?.alreadyFinished, answerSvc.reports],
      [true, ['E']],
    );
    const finBad = await call('POST', '/userAnswer/finish', {});
    const finBad2 = await call('POST', '/userAnswer/finish', { code: 5 });
    check(
      'H3 code байхгүй / тоо → 400 (ValidationPipe)',
      [finBad.status, finBad2.status],
      [400, 400],
    );

    const okRule = await call('POST', '/question/rule', {
      targetQuestionId: 3,
      dependsOnQuestionId: 1,
      dependsOnAnswerId: null,
    });
    check(
      'H4 POST /question/rule (dependsOnAnswerId: null) → амжилттай',
      [okRule.status < 300, okRule.json.succeed],
      [true, true],
    );
    const badBody = await Promise.all([
      call('POST', '/question/rule', {}),
      call('POST', '/question/rule', {
        targetQuestionId: 'abc',
        dependsOnQuestionId: 1,
      }),
      call('POST', '/question/rule', {
        targetQuestionId: 3,
        dependsOnQuestionId: 1,
        action: 'show',
      }),
    ]);
    check(
      'H5 хоосон body / тоо биш id / action "show" → 400',
      badBody.map((r) => r.status),
      [400, 400, 400],
    );
    const badService = await call('POST', '/question/rule', {
      targetQuestionId: 3,
      dependsOnQuestionId: 3,
    });
    check(
      'H6 service-ийн шалгалт (өөрөө өөр рүүгээ) → 400 + монгол мессеж',
      [badService.status, typeof badService.json.message],
      [400, 'string'],
    );
    const patchBad = await call('PATCH', '/question/rule/abc', {
      active: false,
    });
    const patchOk = await call('PATCH', '/question/rule/1', { active: false });
    check(
      'H7 PATCH /question/rule/abc → 400 (ParseIntPipe); PATCH /question/rule/1 {active:false} → OK',
      [patchBad.status, patchOk.status < 300],
      [400, true],
    );
    await app.close();
  }

  console.log(
    failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`,
  );
  process.exit(failed === 0 ? 0 : 1);
})();
