/**
 * users.password / users.forget (select:false) — нийтийн хариу, relation, JWT-д гарахгүй; нэвтрэх / OTP урсгал ажиллана.
 * Өмнө нь `assessment/all`, `blog/all`, `assessment/:id` нэвтрэлтгүйгээр bcrypt hash + сэргээх кодыг буцаадаг байв.
 */
import * as bcrypt from 'bcryptjs';
import { UserDao } from '../../src/app/user/user.dao';
import { UserService } from '../../src/app/user/user.service';
import { UserController } from '../../src/app/user/user.controller';
import { AuthService } from '../../src/auth/auth.service';
import { UserEntity } from '../../src/app/user/entities/user.entity';
import { BlogEntity } from '../../src/app/blog/entities/blog.entity';
import { check, finish, makeDs } from './harness';

const err = (p: Promise<any>) => p.then(() => 'OK', (e) => e?.message);
const leaks = (o: any) => /"(password|forget)"/.test(JSON.stringify(o ?? null));

(async () => {
  const ds = await makeDs();
  const repo = ds.getRepository(UserEntity);
  const hash = await bcrypt.hash('Old-pass1', 4);
  const u = await repo.save(repo.create({ email: 'org@t.mn', role: 30, wallet: 0, emailVerified: true, password: hash, forget: '123456', firstname: 'A' }));
  await ds.getRepository(BlogEntity).save({ title: 't', content: 'c', category: 1, user: { id: u.id } } as any);

  const dao = new UserDao(ds);
  const users = new UserService(dao, {} as any);
  const auth = new AuthService(users, { sign: (p: any) => JSON.stringify(p) } as any);
  const ctrl = new UserController(users, auth);

  check('U1 get / findByIds / getByEmail / getUser — password, forget алга', [
    leaks(await dao.get(u.id)), leaks(await dao.findByIds([u.id])), leaks(await dao.getByEmail('org@t.mn')), leaks(await users.getUser('ORG@t.mn')),
  ], [false, false, false, false]);
  const blogs = await ds.getRepository(BlogEntity).find({ relations: ['user'] });
  check('U2 relations: [user] (blog.service шиг) — хэрэглэгч ирнэ, нууц алга', [blogs[0]?.user?.email, leaks(blogs)], ['org@t.mn', false]);

  const s = await dao.getByEmail('org@t.mn', true);
  const sId = await dao.getByEmail(String(u.id), true);
  check('U3 getByEmail(…, true) — password + forget (email ба id-аар)', [!!s?.password, s?.forget, sId?.forget, s?.email], [true, '123456', '123456', 'org@t.mn']);

  check('U4 validateUser: зөв → нууцгүй хариу, буруу → 0, байхгүй → -1', [
    leaks(await auth.validateUser('org@t.mn', 'Old-pass1')), (await auth.validateUser('org@t.mn', 'Old-pass1'))?.email,
    await auth.validateUser('org@t.mn', 'wrong'), await auth.validateUser('none@t.mn', 'x'),
  ], [false, 'org@t.mn', 0, -1]);
  const fl = await auth.forceLogin('org@t.mn', '', '', '');
  check('U5 forceLogin: JWT payload ба user-д нууц алга', [leaks(JSON.parse(fl.token)), leaks(fl.user)], [false, false]);

  check('U6 verifyCode (controller): зөв / буруу / байхгүй хэрэглэгч (500 биш)', [
    await ctrl.verifyCode('123456', 'org@t.mn'), await ctrl.verifyCode('000000', 'org@t.mn'), await ctrl.verifyCode('123456', 'none@t.mn'),
  ], [true, false, false]);

  check('U7 reset: буруу код → алдаа', await err(users.resetPasswordWithOtp('org@t.mn', 'New-pass2', '999999')), 'Баталгаажуулах код буруу байна.');
  check('U8 reset: зөв код → true', await users.resetPasswordWithOtp('org@t.mn', 'New-pass2', '123456'), true);
  const after = await dao.getByEmail('org@t.mn', true);
  check('U9 шинэ нууц үг хадгалагдсан, код хүчингүй, шинээр нэвтэрнэ', [
    await bcrypt.compare('New-pass2', after.password), after.forget, (await auth.validateUser('org@t.mn', 'New-pass2'))?.email,
  ], [true, null, 'org@t.mn']);

  await new UserService(dao, { sendOtp: async () => undefined } as any).sendOtp('org@t.mn');
  const otp = await dao.getByEmail('org@t.mn', true);
  check('U10 sendOtp кодыг хадгална (select:false ч бичигдэнэ), энгийн уншилтад харагдахгүй', [/^\d{6}$/.test(`${otp?.forget}`), leaks(await dao.get(u.id))], [true, false]);

  // OTP таах: 4 буруу → код хүчинтэй хэвээр; 5 дахь буруу → шатна; шинэ код илгээхэд тоолуур тэглэгдэнэ.
  const mailer = new UserService(dao, { sendOtp: async () => undefined } as any);
  const code = `${(await dao.getByEmail('org@t.mn', true)).forget}`;
  const wrong = code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 4; i++) await mailer.verifyOtp('ORG@t.mn', wrong);
  check('U11 4 буруу оролдлогын дараа зөв код ажиллана', await mailer.verifyOtp('org@t.mn', code), true);
  for (let i = 0; i < 5; i++) await mailer.verifyOtp('org@t.mn', wrong);
  check('U12 5 буруу → код шатсан (зөв код ч ажиллахгүй, reset татгалзана)', [
    await mailer.verifyOtp('org@t.mn', code), (await dao.getByEmail('org@t.mn', true)).forget,
    await err(mailer.resetPasswordWithOtp('org@t.mn', 'X-pass3', code)),
  ], [false, null, 'Баталгаажуулах код буруу байна.']);
  for (let i = 0; i < 3; i++) await mailer.verifyOtp('org@t.mn', wrong); // код байхгүй үед тоологдохгүй
  await mailer.sendOtp('org@t.mn');
  const code2 = `${(await dao.getByEmail('org@t.mn', true)).forget}`;
  const wrong2 = code2 === '000000' ? '111111' : '000000';
  for (let i = 0; i < 4; i++) await mailer.verifyOtp('org@t.mn', wrong2);
  check('U13 шинэ код → тоолуур тэглэгдсэн (4 буруугийн дараа зөв нь ажиллана)', await mailer.verifyOtp('org@t.mn', code2), true);

  return finish(ds)();
})().catch((e) => {
  console.error('❌ user-secrets алдаа:', e);
  process.exit(1);
});
