/**
 * POST userService/exam (createExam) — зөвхөн үйлчилгээний эзэн (эсвэл admin) код гаргана; бусдынхаас суудал зарцуулахгүй.
 *
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/create-exam-owner.spec-lite.ts
 */
import { UserServiceService } from '../src/app/user.service/user.service.service';
import { Role } from '../src/auth/guards/role/role.enum';

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`);
};
const err = (fn: () => Promise<any>) => fn().then(() => 'OK', (e) => e?.message);

const service = { id: 1, count: 10, usedUserCount: 0, user: { id: 7 }, assessment: { id: 4 } };
let seq = 0;
const dao: any = {
  findOne: async (id: number) => (id === 1 ? service : null),
  reserveSeats: async (_: number, n: number) => ((service.usedUserCount += n), true),
  releaseSeats: async (_: number, n: number) => (service.usedUserCount -= n),
};
const svc = new UserServiceService(
  dao, {} as any, {} as any, { create: async () => `C${++seq}` } as any,
  {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
);
const dto = (over: any = {}) => ({ service: 1, count: 2, ...over }) as any;

(async () => {
  check('E1 эзэн байгууллага → 2 код, 2 суудал', [await svc.createExam(dto(), 7, Role.organization), service.usedUserCount], [['C1', 'C2'], 2]);
  check('E2 өөр байгууллага → олдсонгүй, суудал зарцуулахгүй', [await err(() => svc.createExam(dto(), 8, Role.organization)), service.usedUserCount], ['Худалдан авалт олдсонгүй', 2]);
  check('E3 өөр client → олдсонгүй', await err(() => svc.createExam(dto(), 8, Role.client)), 'Худалдан авалт олдсонгүй');
  check('E4 admin → бусдынхаас ч гаргана', [(await svc.createExam(dto({ count: 1 }), 99, Role.admin)).length, service.usedUserCount], [1, 3]);
  check('E5 байхгүй үйлчилгээ', await err(() => svc.createExam(dto({ service: 5 }), 7, Role.organization)), 'Худалдан авалт олдсонгүй');

  console.log(failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`);
  process.exit(failed === 0 ? 0 : 1);
})();
