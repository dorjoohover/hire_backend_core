/**
 * 0.3(b) — paywall-ийн "нээлттэй хаалга"-ууд хаагдсан эсэхийг route metadata +
 * жинхэнэ RolesGuard / AiAgentGuard-аар шалгана (DB / HTTP-гүй).
 *
 * Ажиллуулах:
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/paywall-routes.spec-lite.ts
 */
import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { ExamController } from '../src/app/exam/exam.controller';
import { UserAnswerController } from '../src/app/user.answer/user.answer.controller';
import { RolesGuard } from '../src/auth/guards/role/role.guard';
import { ROLES_KEY } from '../src/auth/guards/role/role.decorator';
import { IS_PUBLIC_KEY } from '../src/auth/guards/jwt/jwt-auth-guard';
import { AiAgentGuard } from '../src/auth/guards/ai-agent/ai-agent.guard';
import { ADMIN, SUPER_ADMIN, TESTER } from '../src/base/constants';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`,
  );
};

const handler = (C: any, name: string) => C.prototype[name];
const isPublic = (h: any) => Reflect.getMetadata(IS_PUBLIC_KEY, h) === true;
const roles = (h: any) => Reflect.getMetadata(ROLES_KEY, h) ?? null;
const guards = (h: any): string[] =>
  (Reflect.getMetadata('__guards__', h) ?? []).map((g: any) => g.name);

const reflector = new Reflector();
const rolesGuard = new RolesGuard(reflector);
const ctx = (C: any, h: any, user: any): any => ({
  getHandler: () => h,
  getClass: () => C,
  switchToHttp: () => ({ getRequest: () => ({ user, headers: {} }) }),
});
const allowed = (C: any, name: string, user: any) => {
  try {
    return rolesGuard.canActivate(ctx(C, handler(C, name), user));
  } catch (e: any) {
    return `ERR:${e?.status ?? e?.message}`;
  }
};
const CLIENT = { id: 1, role: 20 };
const ORG = { id: 2, role: 30 };
const adminUser = { id: 3, role: ADMIN };
const tester = { id: 4, role: TESTER };
const superUser = { id: 5, role: SUPER_ADMIN };

console.log('— exam: recalculate / regenerate');
for (const n of ['recalculate', 'regenerate']) {
  const h = handler(ExamController, n);
  check(`L1 ${n}: @Public БИШ`, isPublic(h), false);
  check(`L2 ${n}: зөвхөн ADMIN / SUPER_ADMIN / TESTER`, roles(h), [
    ADMIN,
    SUPER_ADMIN,
    TESTER,
  ]);
  check(
    `L3 ${n}: нэвтрээгүй / client / org → хаалттай, админ / tester / super → нээлттэй`,
    [
      allowed(ExamController, n, null),
      allowed(ExamController, n, CLIENT),
      allowed(ExamController, n, ORG),
      allowed(ExamController, n, adminUser),
      allowed(ExamController, n, tester),
      allowed(ExamController, n, superUser),
    ],
    ['ERR:401', false, false, true, true, true],
  );
}

console.log('\n— userAnswer: GET /userAnswer (бүх хүснэгтийн dump)');
{
  const h = handler(UserAnswerController, 'findAll');
  check(
    'M1 findAll: @Public БИШ, зөвхөн SUPER_ADMIN',
    [isPublic(h), roles(h)],
    [false, [SUPER_ADMIN]],
  );
  check(
    'M2 нэвтрээгүй / client / org / admin → хаалттай, super → нээлттэй',
    [
      allowed(UserAnswerController, 'findAll', null),
      allowed(UserAnswerController, 'findAll', CLIENT),
      allowed(UserAnswerController, 'findAll', ORG),
      allowed(UserAnswerController, 'findAll', adminUser),
      allowed(UserAnswerController, 'findAll', superUser),
    ],
    ['ERR:401', false, false, false, true],
  );
}

console.log('\n— userAnswer: report/* + code/code/:code → AiAgentGuard');
for (const n of [
  'getReportPdfData',
  'getReportAnswers',
  'getAnswersByCategory',
  'getAnswerByQuestion',
  'findByCode',
]) {
  const h = handler(UserAnswerController, n);
  check(
    `N1 ${n}: @Public (JWT-г алгасна) + AiAgentGuard`,
    [isPublic(h), guards(h)],
    [true, ['AiAgentGuard']],
  );
}
{
  const h = handler(UserAnswerController, 'findOne');
  check(
    'N2 :code/:id (web ашигладаг) → нээлттэй хэвээр, guard-гүй',
    [isPublic(h), guards(h)],
    [true, []],
  );
}

console.log('\n— AiAgentGuard');
{
  const g = new AiAgentGuard();
  const run = (headers: any) => {
    try {
      return g.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ headers }) }),
      } as any);
    } catch (e: any) {
      return `ERR:${e?.status}`;
    }
  };
  const saved = process.env.AI_AGENT_KEY;
  delete process.env.AI_AGENT_KEY;
  check(
    'O1 AI_AGENT_KEY тохируулаагүй → бүгдийг хаана (fail closed)',
    [run({}), run({ authorization: 'Bearer x' })],
    ['ERR:401', 'ERR:401'],
  );
  process.env.AI_AGENT_KEY = 'secret-key';
  check(
    'O2 буруу / хоосон / зөв түлхүүр',
    [
      run({}),
      run({ authorization: 'Bearer wrong' }),
      run({ 'x-ai-agent-key': 'wrong' }),
      run({ authorization: 'Bearer secret-key' }),
      run({ 'x-ai-agent-key': 'secret-key' }),
    ],
    ['ERR:401', 'ERR:401', 'ERR:401', true, true],
  );
  if (saved === undefined) delete process.env.AI_AGENT_KEY;
  else process.env.AI_AGENT_KEY = saved;
}

console.log(
  failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`,
);
process.exit(failed === 0 ? 0 : 1);
