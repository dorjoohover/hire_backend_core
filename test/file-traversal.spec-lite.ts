/**
 * 0.4 (a) — файл уншихад path traversal хаагдсан эсэх (бодит Nest HTTP сервер +
 * жинхэнэ FileService + түр хавтас; DB / S3-гүй).
 *
 * Ажиллуулах:
 *   npx ts-node -P tsconfig.json -r tsconfig-paths/register test/file-traversal.spec-lite.ts
 *
 * Express нь route param дахь `%2F`-ийг `/` болгож decode хийдэг тул
 * `..%2F..%2Fsecret.txt` нь өмнө нь `uploads/`-с гадуурх файлыг уншуулдаг байв.
 */
import 'reflect-metadata';
import { Controller, Get, Module, Param } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { join } from 'path';
import { FileService } from '../src/file.service';
import { resolveInside } from '../src/utils/safe-path';

@Controller()
class FileTestController {
  constructor(private readonly fileService: FileService) {}
  // AppController.getFile() / PdfTemplateController.getImage()-тэй ижил дуудлага.
  @Get('file/:file')
  get(@Param('file') f: string) {
    return this.fileService.getFile(f);
  }
}
@Module({ controllers: [FileTestController], providers: [FileService] })
class TestModule {}

let failed = 0;
const check = (name: string, actual: any, expected: any) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(
    `${ok ? '✅' : '❌'} ${name}  →  ${JSON.stringify(actual)}${ok ? '' : `  (хүлээсэн: ${JSON.stringify(expected)})`}`,
  );
};

/** node http: замыг ХУВЬ ХЭВЭЭР (normalize хийлгүй) илгээнэ. */
const get = (port: number, rawPath: string) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path: rawPath }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode!, body }));
      })
      .on('error', reject);
  });

const errStatus = async (fn: () => Promise<any>) => {
  try {
    await fn();
    return null;
  } catch (e: any) {
    return e?.getStatus ? e.getStatus() : `ERR:${e?.message}`;
  }
};

// multer нь UTF-8 нэрийг latin1-ээр уншдаг тул бодит `originalname` нь ийм харагдана.
const MN_NAME = `1700_${Buffer.from('Монгол', 'utf8').toString('latin1')} 1.txt`;

(async () => {
  // cwd/uploads/ + cwd/secret.txt (uploads-с ГАДУУР) + cwd/.env
  const tmp = fs.mkdtempSync(join(os.tmpdir(), 'trav-'));
  fs.mkdirSync(join(tmp, 'uploads'));
  fs.writeFileSync(join(tmp, 'uploads', 'ok.txt'), 'OK-CONTENT');
  fs.writeFileSync(join(tmp, 'uploads', MN_NAME), 'MN-CONTENT');
  fs.writeFileSync(join(tmp, 'secret.txt'), 'TOP-SECRET');
  fs.writeFileSync(join(tmp, '.env'), 'JWT_SECRET=leak');
  process.chdir(tmp);

  // Хяналт: хуучин `join('./uploads', name)` нь үнэхээр uploads-с гарч байсныг харуулна.
  check(
    'T0 (хяналт) хуучин join нь uploads-с ГАДУУРХ файлыг зааж байсан',
    fs.existsSync(join('./uploads', '../secret.txt')),
    true,
  );

  const logs = console.log;
  console.log = () => undefined; // FileService constructor-ийн env лог
  const app = await NestFactory.create(TestModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  console.log = logs;
  const port = (app.getHttpServer().address() as any).port;

  const cases: [string, string, number, string?][] = [
    ['H1 хэвийн файл', '/file/ok.txt', 200, 'OK-CONTENT'],
    [
      'H2 multer-ийн (latin1) нэр + зай, encode-той',
      `/file/${encodeURIComponent(MN_NAME)}`,
      200,
      'MN-CONTENT',
    ],
    ['H3 ..%2Fsecret.txt', '/file/..%2Fsecret.txt', 400],
    [
      'H4 ..%2F..%2F..%2Fetc%2Fpasswd',
      '/file/..%2F..%2F..%2Fetc%2Fpasswd',
      400,
    ],
    ['H5 .env (uploads-с гадуур, ..%2F.env)', '/file/..%2F.env', 400],
    ['H6 %2Fetc%2Fpasswd (абсолют)', '/file/%2Fetc%2Fpasswd', 400],
    ['H7 ok.txt/../../secret.txt', '/file/ok.txt%2F..%2F..%2Fsecret.txt', 400],
    ['H8 ..%5Csecret.txt (backslash)', '/file/..%5Csecret.txt', 400],
    ['H9 NUL байт', '/file/ok.txt%00.png', 400],
    ['H10 ".." ганцаараа', '/file/..', 400],
    ['H11 %2E%2E', '/file/%2E%2E', 400],
    ['H12 олдохгүй файл', '/file/nope.txt', 404],
  ];
  for (const [name, p, status, body] of cases) {
    const r = await get(port, p);
    const leaked = r.body.includes('TOP-SECRET') || r.body.includes('leak');
    check(
      `${name} → ${status}`,
      [r.status, leaked, body ? r.body : undefined],
      [status, false, body],
    );
  }

  console.log('\n— FileService шууд + resolveInside');
  const fsvc = new FileService();
  check(
    'S1 getFileBuf(../secret.txt) → 400',
    await errStatus(() => fsvc.getFileBuf('../secret.txt')),
    400,
  );
  check(
    'S2 getFileBuf(ok.txt) → path + size',
    await fsvc.getFileBuf('ok.txt').then((r) => [r.path, r.size]),
    [join('./uploads', 'ok.txt'), 10],
  );
  const origLog = console.log;
  console.log = () => undefined; // FileService.upload-ийн S3 / local лог
  const origErr = console.error;
  console.error = () => undefined;
  await fsvc.upload('../pwned.txt', 'text/plain', Buffer.from('x'));
  await fsvc.upload('1700_new.txt', 'text/plain', Buffer.from('new'));
  console.log = origLog;
  console.error = origErr;
  check(
    'S3 upload(key="../pwned.txt") uploads-с гадуур бичихгүй',
    fs.existsSync(join(tmp, 'pwned.txt')),
    false,
  );
  check(
    'S4 upload(хэвийн key) local-д бичнэ',
    fs.existsSync(join(tmp, 'uploads', '1700_new.txt')),
    true,
  );
  const bad = [
    '',
    '.',
    '..',
    'a/b',
    'a\\b',
    'x\0y',
    '../x',
    '/abs',
    'a'.repeat(256),
  ];
  check(
    'R1 resolveInside: аюултай нэрс бүгд 400',
    await Promise.all(
      bad.map((n) => errStatus(async () => resolveInside('./uploads', n))),
    ),
    bad.map(() => 400),
  );
  check(
    'R2 resolveInside: хүчинтэй нэр хуучин join-той ижил',
    resolveInside('./uploads', 'a b_Монгол.png'),
    path.join('./uploads', 'a b_Монгол.png'),
  );

  await app.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(
    failed === 0 ? '\n✅ БҮГД АМЖИЛТТАЙ' : `\n❌ ${failed} тест унасан`,
  );
  process.exit(failed === 0 ? 0 : 1);
})();
