/**
 * Медиа (зураг, бичлэг) → R2: зориулалт + төрлөөр ангилах, CDN redirect, хувийн бичлэг (presign,
 * эрх), шалгалт устахад бичлэг устах, хуучин файлыг зөөх (media-migrate). Жинхэнэ Postgres + S3-compatible
 * (moto) сервер.
 *   TEST_DATABASE_URL=… TEST_S3_ENDPOINT=http://127.0.0.1:5055 npx ts-node -P tsconfig.json -r tsconfig-paths/register test/int/media.int.ts
 */
import * as http from 'http';
import { AddressInfo } from 'net';
import { mkdtempSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as os from 'os';
import express from 'express';
import { PERF_BOOTSTRAP_STATEMENTS } from '../../src/database/sql/perf-bootstrap';
import { check, finish, makeDs, say } from './harness';

const S3 = process.env.TEST_S3_ENDPOINT;
Object.assign(process.env, {
  S3_ENDPOINT: S3, S3_BUCKET: 'hire-private', S3_ACCESS_KEY_ID: 'test', S3_SECRET_ACCESS_KEY: 'test', S3_REGION: 'us-east-1',
  MEDIA_STORAGE: 'r2', MEDIA_PUBLIC_BUCKET: 'hire-public', MEDIA_PUBLIC_URL: 'https://cdn.test/', MEDIA_KEY_PREFIX: '',
});
// env-ийн дараа import (object-storage нь process.env-ээс уншдаг)
/* eslint-disable @typescript-eslint/no-var-requires */
const { MediaService } = require('../../src/app/media/media.service');
const { FileService } = require('../../src/file.service');
const { createS3Client, objectStorageConfig } = require('../../src/utils/object-storage');
const { sendResolvedFile } = require('../../src/utils/send-resolved-file');
const { OpsService } = require('../../src/app/ops/ops.service');
const { OpsCleanupService } = require('../../src/app/ops/ops-cleanup.service');
const { migrate } = require('../../src/scripts/media-migrate');

const PNG = Buffer.concat([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), Buffer.alloc(64, 1)]);
const JPG = Buffer.concat([Buffer.from('ffd8ffe000104a464946', 'hex'), Buffer.alloc(64, 2)]);
const MP4 = Buffer.concat([Buffer.from('00000018', 'hex'), Buffer.from('ftypisom'), Buffer.alloc(64, 3)]);
const WEBM = Buffer.concat([Buffer.from('1a45dfa3', 'hex'), Buffer.alloc(64, 4)]);
const PDF = Buffer.from('%PDF-1.4\n' + 'x'.repeat(300) + '\n%%EOF');
const now = new Date();
const ym = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
const err = async (fn: () => Promise<any>) => { try { await fn(); return 'ok'; } catch (e: any) { return e?.status ?? e?.message; } };

(async () => {
  if (!S3) { say('⚠️ TEST_S3_ENDPOINT байхгүй — алгасав'); check('M0 алгасав', true, true); return finish()(); }
  const ds = await makeDs();
  for (const s of PERF_BOOTSTRAP_STATEMENTS) await ds.query(s);
  const s3 = createS3Client(objectStorageConfig());
  for (const b of ['hire-private', 'hire-public']) await s3.createBucket({ Bucket: b }).promise().catch(() => undefined);
  const obj = (Bucket: string, Key: string) => s3.headObject({ Bucket, Key }).promise().then((h: any) => h, () => null);
  const tmp = mkdtempSync(join(os.tmpdir(), 'media-')); process.chdir(tmp); mkdirSync('uploads');

  const media = new MediaService(ds);
  const files = new FileService(media);

  // ---- M1–M2 нийтийн зураг → зориулалт/төрөл түлхүүр, CDN redirect
  const id1 = await files.upload('1700000000000_ab12cd34_logo.png', 'image/png', PNG, { purpose: 'question' });
  const row1 = await media.find(id1);
  check('M1 question зураг → media/question/image/YYYY/MM/<id>, нийтийн bucket, бүртгэл', [row1.key, row1.visibility, row1.kind, row1.mime],
    [`media/question/image/${ym}/${id1}`, 'public', 'image', 'image/png']);
  const h1 = await obj('hire-public', row1.key);
  check('M1b R2 объект: Content-Type, Cache-Control immutable; хувийн bucket-д байхгүй', [h1?.ContentType, h1?.CacheControl, !!(await obj('hire-private', row1.key))],
    ['image/png', 'public, max-age=31536000, immutable', false]);
  const app = express();
  app.get('/file/:id', (req, res) => sendResolvedFile(files, req.params.id, res));
  const srv = http.createServer(app);
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', () => r()));
  const base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
  const g = (id: string) => fetch(`${base}/file/${encodeURIComponent(id)}`, { redirect: 'manual' });
  const r1 = await g(id1);
  check('M2 GET /file/<id> → 302 CDN (Location, Cache-Control)', [r1.status, r1.headers.get('location'), r1.headers.get('cache-control')],
    [302, `https://cdn.test/media/question/image/${ym}/${encodeURIComponent(id1)}`, 'public, max-age=86400']);

  // ---- M3 бодлого
  check('M3 avatar-д видео → 400', await err(() => files.upload('1_a.mp4', 'video/mp4', MP4, { purpose: 'avatar' })), 400);
  check('M3b question-д танигдахгүй байт → 400', await err(() => files.upload('1_b.bin', 'image/png', Buffer.alloc(80, 7), { purpose: 'question' })), 400);
  const idOther = await files.upload('1_c.docx', 'application/vnd.openxmlformats', Buffer.alloc(80, 7), { purpose: 'misc' });
  check('M3c misc-д танигдахгүй → other (хуучин /upload-ийн зан төлөв)', (await media.find(idOther)).key, `media/misc/other/${ym}/${idOther}`);
  check('M3d Content-Type-д итгэхгүй (PNG байтыг image/jpeg гэж зарласан ч png)', (await media.find(await files.upload('1_d.jpg', 'image/jpeg', PNG, { purpose: 'blog' }))).mime, 'image/png');

  // ---- M4–M5 /upload (processMultipleImages) + studio түлхүүр
  const ids = await files.processMultipleImages([
    { originalname: 'Зураг 1.JPG', mimetype: 'image/jpeg', buffer: JPG },
    { originalname: 'clip.webm', mimetype: 'video/webm', buffer: WEBM },
  ] as any, undefined, undefined, undefined, { purpose: 'blog', ownerId: 9 });
  const rows4 = await Promise.all(ids.map((i: string) => media.find(i)));
  check('M4 /upload purpose=blog → blog/image, blog/video; id-д "/" байхгүй, нэр цэвэрлэгдсэн', [
    rows4.map((r: any) => r.key.split('/').slice(0, 3).join('/')), ids.every((i: string) => !i.includes('/')), /_Зураг-1\.jpg$/.test(ids[0]), rows4[0].ownerId,
  ], [['media/blog/image', 'media/blog/video'], true, true, 9]);
  const ic = await files.upload('ic_1700_star.png', 'image/png', PNG);
  check('M5 studio ic_ түлхүүр → studio-icon (purpose өгөөгүй ч)', (await media.find(ic)).key, `media/studio-icon/image/${ym}/ic_1700_star.png`);
  check('M5b readBytes (bundle экспорт) R2-аас', (await files.readBytes(ic))?.equals(PNG), true);

  // ---- M6–M9 хувийн бичлэг (presign)
  await ds.query(`SET session_replication_role = replica`);
  await ds.query(`INSERT INTO users (id, email, role, wallet, "emailVerified") VALUES (50,'taker@t.mn',20,0,true),(51,'other@t.mn',20,0,true),(9,'org@t.mn',30,0,true),(1,'su@t.mn',10,0,true)`);
  await ds.query(`INSERT INTO "userService" (id, price, count, "usedUserCount", status, "userId", "assessmentId") VALUES (700,0,1,1,20,9,1)`);
  await ds.query(`INSERT INTO exam (id, code, "assessmentName", "serviceId", "userId") VALUES (1,'1000000001','DISC',700,50),(2,'1000000002','DISC',700,51)`);
  await ds.query(`SET session_replication_role = DEFAULT`);
  const taker = { id: 50, role: 20 }, other = { id: 51, role: 20 }, org = { id: 9, role: 30 }, su = { id: 1, role: 10 };
  const p = await media.presign({ purpose: 'exam-recording', mime: 'video/webm', bytes: WEBM.length, filename: 'cam.webm', examCode: '1000000001' }, taker);
  const put = await fetch(p.uploadUrl, { method: 'PUT', headers: p.headers, body: WEBM });
  const c = await media.complete(p.id, taker);
  const row6 = await media.find(p.id);
  check('M6 presign → PUT → complete: ready, private/exam-recording/video, хувийн bucket', [put.status, c.status, row6.key, row6.visibility, !!(await obj('hire-private', row6.key)), !!(await obj('hire-public', row6.key))],
    [200, 'ready', `private/exam-recording/video/${ym}/${p.id}`, 'private', true, false]);
  const r6 = await g(p.id);
  check('M6b GET /file/<хувийн id> → 404 (CDN-д ил гарахгүй)', r6.status, 404);
  const su6 = await media.signedUrl(p.id, su);
  const dl = await fetch(su6.url);
  check('M6c signedUrl: шалгуулагч / байгууллага / super → OK (5 мин), татахад байт таарна; өөр хэрэглэгч → 403', [
    await err(() => media.signedUrl(p.id, taker)), await err(() => media.signedUrl(p.id, org)), su6.expiresIn,
    Buffer.from(await dl.arrayBuffer()).equals(WEBM), await err(() => media.signedUrl(p.id, other)),
  ], ['ok', 'ok', 300, true, 403]);
  check('M7 өөрийн биш шалгалтад presign → 403; examCode-гүй → 400', [
    await err(() => media.presign({ purpose: 'exam-recording', mime: 'video/webm', bytes: 10, examCode: '1000000002' }, taker)),
    await err(() => media.presign({ purpose: 'answer-recording', mime: 'audio/webm', bytes: 10 }, taker)),
  ], [403, 400]);
  const p8 = await media.presign({ purpose: 'question', mime: 'video/mp4', bytes: 500, filename: 'q.mp4' }, su);
  await fetch(p8.uploadUrl, { method: 'PUT', headers: p8.headers, body: PNG });
  check('M8 зарласан видео биш (PNG) → complete 400, объект + бүртгэл устсан', [await err(() => media.complete(p8.id, su)), await media.find(p8.id), !!(await obj('hire-public', `media/question/video/${ym}/${p8.id}`))], [400, null, false]);
  const p9 = await media.presign({ purpose: 'question', mime: 'video/mp4', bytes: 20, filename: 'q.mp4' }, su);
  await fetch(p9.uploadUrl, { method: 'PUT', headers: p9.headers, body: MP4 });
  check('M9 зарласнаас том → 400', await err(() => media.complete(p9.id, su)), 400);
  check('M9b avatar-д 1GB видео presign → 400 (бодлого)', await err(() => media.presign({ purpose: 'avatar', mime: 'video/mp4', bytes: 1e9 }, su)), 400);

  // ---- M10 хуучин локал файл (media_object-д байхгүй) → урсгал; MEDIA_STORAGE унтраавал R2-ийг үл тооно
  writeFileSync('uploads/1600000000000_old.png', PNG);
  const r10 = await g('1600000000000_old.png');
  check('M10 бүртгэлгүй хуучин файл → локалаас 200', [r10.status, Buffer.from(await r10.arrayBuffer()).equals(PNG)], [200, true]);
  process.env.MEDIA_STORAGE = '';
  const r10b = await g(id1);
  check('M10b MEDIA_STORAGE унтраалттай → локал хуулбараас (rollback) 200', r10b.status, 200);
  process.env.MEDIA_STORAGE = 'r2';
  check('M10c байхгүй файл → 404', (await g('nope.png')).status, 404);

  // ---- M11 шалгалт устгахад бичлэг хамт
  const fake = http.createServer((req, res) => {
    let b = ''; req.on('data', (x) => (b += x));
    req.on('end', () => { const codes = JSON.parse(b).codes; res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ remote: { enabled: true }, results: codes.map((code: string) => ({ code, local: 'deleted', remote: 'deleted' })) })); });
  });
  await new Promise<void>((r) => fake.listen(0, '127.0.0.1', () => r()));
  process.env.REPORT = `http://127.0.0.1:${(fake.address() as AddressInfo).port}/`;
  process.env.INTERNAL_API_KEY = 'k';
  await ds.query(`UPDATE exam SET "userEndDate" = now(), "userStartDate" = now() - interval '1 hour' WHERE code = '1000000001'`);
  const cleanup = new OpsCleanupService(ds, new OpsService(ds, undefined, undefined), media);
  const pl = await cleanup.preview({ id: 1 }, { codes: ['1000000001'] });
  check('M11 preview: media=1', pl.counts.media, 1);
  const ap = await cleanup.apply({ id: 1 }, { codes: ['1000000001'], token: pl.token });
  check('M11b apply: бичлэг R2 + бүртгэлээс устсан, шалгалт устсан', [ap.deleted.media, await media.find(p.id), !!(await obj('hire-private', row6.key)),
    Number((await ds.query(`SELECT count(*)::int n FROM exam WHERE code='1000000001'`))[0].n)], [1, null, false, 0]);
  fake.close();

  // ---- M12 хуучин файлыг зөөх (media-migrate)
  const up = join(tmp, 'legacy'); mkdirSync(up);
  const W = (n: string, b: Buffer) => writeFileSync(join(up, n), b);
  W('1690000000000_q.png', PNG); W('1690000000001_a.png', PNG); W('1690000000002_b.jpg', JPG); W('pt_1690_x.png', PNG);
  W('ic_1690_y.png', PNG); W('1690000000003_u.png', PNG); W('report-1000000001.pdf', PDF); W('x.pdf.123.tmp', PDF);
  W('1690000000004_v.mp4', MP4); W('1690000000005_d.pdf', PDF); W('1690000000006_c.png', PNG);
  await ds.query(`SET session_replication_role = replica`);
  const ins = async (table: string, vals: Record<string, any>) => {
    const cols = await ds.query(`SELECT column_name c, data_type t FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND is_nullable='NO' AND column_default IS NULL`, [table]);
    const v: Record<string, any> = {};
    for (const { c, t } of cols) v[c] = /int|numeric|double|real/.test(t) ? 0 : /bool/.test(t) ? false : /time|date/.test(t) ? now : /json/.test(t) ? '[]' : 'x';
    Object.assign(v, vals);
    const k = Object.keys(v);
    await ds.query(`INSERT INTO "${table}" (${k.map((x) => `"${x}"`).join(',')}) VALUES (${k.map((_, i) => `$${i + 1}`).join(',')})`, k.map((x) => v[x]));
  };
  await ins('question', { id: 1, file: '1690000000000_q.png' });
  await ins('question', { id: 2, file: '1690000000004_v.mp4' });
  await ins('questionAnswer', { id: 1, file: 'https://api.hire.mn/api/v1/file/1690000000001_a.png' });
  await ins('blog', { id: 1, content: '<p><img src="/api/file/1690000000002_b.jpg"></p>' });
  await ins('assessment', { id: 5, exampleReport: '1690000000005_d.pdf', icons: '1690000000006_c.png' });
  await ins('pdf_template', { id: 1, pages: JSON.stringify([{ blocks: [{ imageUrl: 'http://localhost:5050/api/v1/pdf-template/image/pt_1690_x.png' }] }]) });
  await ins('studio_icon', { id: 1, key: 'ic_1690_y.png' });
  await ds.query(`SET session_replication_role = DEFAULT`);
  const logs: string[] = [];
  const dry = await migrate(ds, { apply: false, dir: up, limit: 0, concurrency: 2, skipUnreferenced: false }, (m: string) => logs.push(m));
  check('M12 dry-run: 9 файл зөөхөөр (тайлан, tmp алгассан), R2/DB-д юу ч бичээгүй', [dry.todo, dry.skipped.report, dry.skipped.tmp,
    Number((await ds.query(`SELECT count(*)::int n FROM media_object WHERE "migratedFrom"='local'`))[0].n)], [9, 1, 1, 0]);
  const ap12 = await migrate(ds, { apply: true, dir: up, limit: 0, concurrency: 2, skipUnreferenced: false }, (m: string) => logs.push(m));
  const got = Object.fromEntries((await ds.query(`SELECT id, key FROM media_object WHERE "migratedFrom"='local' ORDER BY id`)).map((r: any) => [r.id, r.key.replace(/\/\d{4}\/\d{2}\//, '/…/')]));
  check('M12b apply: зориулалт + төрлөөр ангилагдсан (лавлагаагаар), алдаагүй', [ap12.errors.length, got], [0, {
    '1690000000000_q.png': 'media/question/image/…/1690000000000_q.png',
    '1690000000001_a.png': 'media/answer-option/image/…/1690000000001_a.png',
    '1690000000002_b.jpg': 'media/blog/image/…/1690000000002_b.jpg',
    '1690000000003_u.png': 'media/misc/image/…/1690000000003_u.png',
    '1690000000004_v.mp4': 'media/question/video/…/1690000000004_v.mp4',
    '1690000000005_d.pdf': 'media/assessment/document/…/1690000000005_d.pdf',
    '1690000000006_c.png': 'media/assessment/image/…/1690000000006_c.png',
    'ic_1690_y.png': 'media/studio-icon/image/…/ic_1690_y.png',
    'pt_1690_x.png': 'media/studio-image/image/…/pt_1690_x.png',
  }]);
  const k0 = (await media.find('1690000000000_q.png')).key;
  check('M12c объект R2-д, хэмжээ таарна; /file/<хуучин id> → CDN 302', [Number((await obj('hire-public', k0))?.ContentLength), (await g('1690000000000_q.png')).status], [PNG.length, 302]);
  const again = await migrate(ds, { apply: true, dir: up, limit: 0, concurrency: 2, skipUnreferenced: false }, () => undefined);
  check('M12d дахин ажиллуулахад 0 (идемпотент)', [again.todo, again.skipped.done], [0, 9]);

  srv.close();
  return finish(ds)();
})().catch((e) => { console.error('❌ media.int алдаа:', e); process.exit(1); });
