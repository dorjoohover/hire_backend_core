/**
 * №8 + №6 — жинхэнэ Postgres дээр: суудал (квот) АТОМАР захиалга, wallet-ийн атомар хасалт, "Эрх нэмэх" (topup),
 * service-ийн showResult. Зэрэг (Promise.all) хүсэлтээр квот / wallet хэтрэхгүй эсэх.
 * (PGlite нэг холболттой тул хүсэлтүүд дараалагдана — нөхцөлт UPDATE-ийн ЛОГИК л шалгагдана; бодит зэрэгцээг CI-ийн
 * Postgres дээр шалгана.)
 *
 *   TEST_DATABASE_URL=… npx ts-node -P tsconfig.json -r tsconfig-paths/register test/int/quota.int.ts
 */
import { PERF_BOOTSTRAP_STATEMENTS } from '../../src/database/sql/perf-bootstrap';
import { UserServiceDao } from '../../src/app/user.service/user.service.dao';
import { UserDao } from '../../src/app/user/user.dao';
import { UserServiceService } from '../../src/app/user.service/user.service.service';
import { TransactionDao } from '../../src/app/payment/dao/transaction.dao';
import { PaymentDao } from '../../src/app/payment/dao/payment.dao';
import { effectiveShowResult } from '../../src/app/user.service/show-result';
import { check, finish, makeDs } from './harness';

const st = async (fn: () => Promise<any>) => {
  try { await fn(); return 'ok'; } catch (e: any) { return e?.getStatus ? e.getStatus() : `ERR:${e?.message}`; }
};

(async () => {
  const ds = await makeDs();
  for (const s of PERF_BOOTSTRAP_STATEMENTS) await ds.query(s);
  await ds.query(`SET session_replication_role = replica`);

  const dao = new UserServiceDao(ds);
  const userDao = new UserDao(ds);
  const payDao = new PaymentDao(ds);
  const txDao = new TransactionDao(ds, payDao);
  const svc: any = new (UserServiceService as any)(dao, txDao, payDao, null, null, userDao, null, null, null, null, null, null);

  const mkUser = async (id: number, role: number, wallet: number) =>
    ds.query(`INSERT INTO users (id, email, role, wallet, "emailVerified") VALUES ($1, $2, $3, $4, true)`, [id, `u${id}@t.mn`, role, wallet]);
  const mkAssessment = async (id: number, price: number) =>
    ds.query(`INSERT INTO assessment (id, name, description, usage, measure, price, duration, "questionCount", type, "createdUser") VALUES ($1, 'DISC', 'd', 'u', 'm', $2, 0, 0, 10, 1)`, [id, price]);
  const mkService = async (id: number, o: { count: number; used?: number; price?: number; status?: number; user?: number; assessment?: number }) =>
    ds.query(`INSERT INTO "userService" (id, price, count, "usedUserCount", status, "userId", "assessmentId") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, o.price ?? 20000, o.count, o.used ?? 0, o.status ?? 20, o.user ?? 9, o.assessment ?? 1]);
  const row = async (id: number) => (await ds.query(`SELECT count, "usedUserCount" AS used, price, "showResult" AS sr FROM "userService" WHERE id=$1`, [id]))[0];
  const wallet = async (id: number) => Number((await ds.query(`SELECT wallet FROM users WHERE id=$1`, [id]))[0].wallet);

  await mkUser(9, 30, 100000);     // байгууллага (эзэмшигч)
  await mkUser(10, 30, 100000);    // өөр байгууллага
  await mkUser(1, 40, 0);          // admin
  await mkAssessment(1, 5000);

  // ---------------- S: суудал (квот) ----------------
  await mkService(1, { count: 10 });
  const results = await Promise.all(Array.from({ length: 50 }, () => dao.reserveSeats(1, 1, true)));
  check('S1 зэрэг 50 бүртгэл, квот 10 → ЯГ 10 амжилттай, usedUserCount=10 (хэтрэлт үгүй)', [results.filter(Boolean).length, (await row(1)).used], [10, 10]);

  await mkService(2, { count: 10, used: 7 });
  check('S2 үлдсэн 3 байхад 5 захиалбал → татгалзана, өөрчлөлтгүй', [await dao.reserveSeats(2, 5, true), (await row(2)).used], [false, 7]);
  check('S3 үлдсэн 3-аас 3 захиалбал → амжилттай (used 10)', [await dao.reserveSeats(2, 3, true), (await row(2)).used], [true, 10]);

  await mkService(3, { count: 2, used: 2, price: 0 });
  check('S4 enforce=false (үнэгүй service-ийн public QR): квот дүүрсэн ч тоолно', [await dao.reserveSeats(3, 1, false), (await row(3)).used], [true, 3]);

  await dao.releaseSeats(3, 1);
  await dao.releaseSeats(3, 99);
  check('S5 releaseSeats: 0-с доош орохгүй', (await row(3)).used, 0);
  check('S6 байхгүй service → reserveSeats false', await dao.reserveSeats(999, 1, true), false);

  await mkService(4, { count: 5, used: 1 });
  await dao.updateCount(4, 2, 1);
  const r4 = await row(4);
  check('S7 updateCount атомар (count +2, used +1)', [r4.count, r4.used], [7, 2]);

  // ---------------- W: wallet ----------------
  await mkUser(20, 30, 100);
  const debits = await Promise.all(Array.from({ length: 5 }, () => userDao.debitWallet(20, 40)));
  check('W1 wallet=100, зэрэг 5×40 хасалт → ЯГ 2 амжилттай, үлдэгдэл 20 (сөрөг болохгүй)', [debits.filter(Boolean).length, await wallet(20)], [2, 20]);
  check('W2 хүрэлцэхгүй → false, өөрчлөлтгүй; 0 → true; сөрөг → false', [await userDao.debitWallet(20, 21), await wallet(20), await userDao.debitWallet(20, 0), await userDao.debitWallet(20, -5)], [false, 20, true, false]);

  // ---------------- T: topup ----------------
  await mkService(10, { count: 10, used: 4, price: 50000, user: 9 });
  const ok: any = await svc.topUp(10, 3, { id: 9, role: 30 });
  const r10 = await row(10);
  check('T1 байгууллага (эзэмшигч) 3 эрх: wallet −15000, count 13, service.price +15000', [ok.charged, ok.wallet, ok.count, ok.remaining, await wallet(9), r10.count, r10.price], [15000, 85000, 13, 9, 85000, 13, 65000]);
  const pay = await ds.query(`SELECT "totalPrice" AS p, method FROM payment WHERE "userId" = 9`);
  check('T2 wallet-ийн зарцуулалт payment (COST, сөрөг) мөрөөр аудитлагдана', pay.map((p: any) => Number(p.p)), [-15000]);

  check('T3 эзэмшигч БИШ байгууллага → 403, өөрчлөлтгүй', [await st(() => svc.topUp(10, 1, { id: 10, role: 30 })), (await row(10)).count, await wallet(10)], [403, 13, 100000]);

  await mkUser(30, 30, 4000);
  await mkService(11, { count: 1, used: 1, price: 5000, user: 30 });
  check('T4 wallet хүрэлцэхгүй → 402, count / price / wallet ХЭВЭЭР (транзакц буцаагдана)', [await st(() => svc.topUp(11, 1, { id: 30, role: 30 })), (await row(11)).count, (await row(11)).price, await wallet(30)], [402, 1, 5000, 4000]);

  await mkUser(31, 30, 5000);
  await mkService(12, { count: 1, used: 0, price: 5000, user: 31 });
  const two = await Promise.all([1, 2].map(() => st(() => svc.topUp(12, 1, { id: 31, role: 30 }))));
  check('T5 wallet зөвхөн 1 эрхэд хүрэх үед зэрэг 2 topup → нэг нь л амжилттай (нэг л удаа хасна)', [two.filter((x) => x === 'ok').length, two.filter((x) => x === 402).length, await wallet(31), (await row(12)).count], [1, 1, 0, 2]);

  const adm: any = await svc.topUp(10, 5, { id: 1, role: 40 });
  const tx = await ds.query(`SELECT price, count FROM transaction WHERE "serviceId" = 10 AND "createdUser" = 1`);
  check('T6 admin гараар нэмнэ: ҮНЭГҮЙ (wallet хөдлөхгүй, price өөрчлөгдөхгүй), transaction аудит (үнэ 0, count 5)', [adm.manual, adm.charged, await wallet(9), (await row(10)).price, tx.map((t: any) => [Number(t.price), Number(t.count)])], [true, 0, 85000, 65000, [[0, 5]]]);

  await mkService(13, { count: 1, status: 10, user: 9 });
  check('T7 төлбөр баталгаажаагүй (PENDING) service → 400', await st(() => svc.topUp(13, 1, { id: 9, role: 30 })), 400);
  check('T8 count буруу (0, -1, 1.5, "abc", 1001) → 400', await Promise.all([0, -1, 1.5, 'abc', 1001].map((c) => st(() => svc.topUp(10, c, { id: 9, role: 30 })))), [400, 400, 400, 400, 400]);
  check('T9 байхгүй service → 404; client role → 403', [await st(() => svc.topUp(999, 1, { id: 9, role: 30 })), await st(() => svc.topUp(10, 1, { id: 7, role: 20 }))], [404, 403]);

  const w9 = await wallet(9);
  check('T10 wallet хасагдсаны ДАРАА service олдохгүй бол → транзакц буцаагдаж wallet хэвээр', [await st(() => dao.topUpAtomic(999, 1, 1000, 9)), await wallet(9) === w9], [404, true]);

  // ---------------- R: showResult ----------------
  check('R1 effectiveShowResult: service > assessment > default(true)', [
    effectiveShowResult({ showResult: false }, { showResultOnComplete: true }),
    effectiveShowResult({ showResult: null }, { showResultOnComplete: false }),
    effectiveShowResult({}, undefined),
    effectiveShowResult(null, { showResultOnComplete: true }),
  ], [false, false, true, true]);
  const own = await svc.setShowResult(10, false, { id: 9, role: 30 });
  check('R2 setShowResult(false): service мөрөнд хадгалагдана, ЭЗЭМШИГЧ л', [own.showResult, (await row(10)).sr, await st(() => svc.setShowResult(10, true, { id: 10, role: 30 }))], [false, false, 403]);
  await svc.setShowResult(10, null, { id: 1, role: 40 });
  check('R3 admin null болгож (assessment default руу) буцаана; boolean биш → 400', [(await row(10)).sr, await st(() => svc.setShowResult(10, 'yes', { id: 1, role: 40 }))], [null, 400]);

  await finish(ds)();
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
