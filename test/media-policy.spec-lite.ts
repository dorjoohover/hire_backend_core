// npx ts-node -P tsconfig.json -r tsconfig-paths/register test/media-policy.spec-lite.ts
// Медиа бодлого: MIME таних (Content-Type-д итгэхгүй), R2 түлхүүр (зориулалт + төрөл), нэр цэвэрлэх.
import {
  MEDIA_PURPOSES, buildMediaKey, checkPolicy, isSafeMediaId, kindOfMime, newMediaId, purposeFromLegacyKey,
  safeBaseName, sniffMime,
} from '../src/app/media/media-policy';

let failed = 0;
const check = (name: string, got: any, want: any) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${name} → ${JSON.stringify(got)}${ok ? '' : ` (хүлээсэн ${JSON.stringify(want)})`}`);
};
const H = (hex: string, tail = '') => Buffer.concat([Buffer.from(hex.replace(/\s/g, ''), 'hex'), Buffer.from(tail, 'latin1'), Buffer.alloc(32)]);
const ftyp = (brand: string) => Buffer.concat([Buffer.from('00000018', 'hex'), Buffer.from('ftyp' + brand), Buffer.alloc(32)]);

check('P1 зураг: jpeg/png/gif/webp/avif/heic/svg', [
  sniffMime(H('ffd8ffe0')), sniffMime(H('89504e47')), sniffMime(Buffer.from('GIF89a......')), sniffMime(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')),
  sniffMime(ftyp('avif')), sniffMime(ftyp('heic')), sniffMime(Buffer.from('<?xml version="1.0"?><svg xmlns="x"></svg>')),
], ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/heic', 'image/svg+xml']);
check('P2 видео/аудио: mp4/mov/webm/ogg/mp3/wav/flac/m4a', [
  sniffMime(ftyp('isom')), sniffMime(ftyp('qt  ')), sniffMime(H('1a45dfa3')), sniffMime(H('1a45dfa3'), 'audio/webm'),
  sniffMime(Buffer.from('OggS\0')), sniffMime(Buffer.from('ID3\x04')), sniffMime(Buffer.from('RIFF\0\0\0\0WAVEfmt ')), sniffMime(Buffer.from('fLaC')),
  sniffMime(ftyp('M4A ')),
], ['video/mp4', 'video/quicktime', 'video/webm', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/mp4']);
check('P3 PDF; HTML/скрипт/танигдахгүй → null (Content-Type-д итгэхгүй)', [
  sniffMime(Buffer.from('%PDF-1.7')), sniffMime(Buffer.from('<html><script>alert(1)</script>'), 'image/png'), sniffMime(Buffer.alloc(40, 7), 'video/mp4'),
], ['application/pdf', null, null]);
check('P4 kindOfMime', ['image/png', 'video/webm', 'audio/mpeg', 'application/pdf', 'text/html'].map(kindOfMime), ['image', 'video', 'audio', 'document', 'other']);
const at = new Date(Date.UTC(2026, 9, 6));
process.env.MEDIA_KEY_PREFIX = '';
check('P5 түлхүүр: нийтийн → media/, хувийн → private/', [
  buildMediaKey('question', 'image', 'a.png', at), buildMediaKey('exam-recording', 'video', 'b.webm', at),
], ['media/question/image/2026/10/a.png', 'private/exam-recording/video/2026/10/b.webm']);
process.env.MEDIA_KEY_PREFIX = 'test';
check('P5b MEDIA_KEY_PREFIX=test → test/media/... (орчин тусгаарлах)', buildMediaKey('blog', 'video', 'c.mp4', at), 'test/media/blog/video/2026/10/c.mp4');
process.env.MEDIA_KEY_PREFIX = '';
check('P6 нэр цэвэрлэх: latin1 болсон UTF-8 засна, зай/тэмдэгт → -, өргөтгөл хасна', [
  safeBaseName(Buffer.from('Хариулт 1.PNG', 'utf8').toString('latin1')), safeBaseName('../../etc/passwd'), safeBaseName('a b?c#.jpg'), safeBaseName(''), safeBaseName('caf\u00e9.png'),
], ['Хариулт-1', 'etc-passwd', 'a-b-c', 'file', 'caf\u00e9']);
const id = newMediaId('Зураг 1.jpg', 'image/png');
check('P7 шинэ id: <ms>_<8hex>_<нэр>.<бодит өргөтгөл>, "/" байхгүй', [/^\d{13}_[0-9a-f]{8}_Зураг-1\.png$/.test(id), isSafeMediaId(id)], [true, true]);
check('P8 isSafeMediaId: "/", "..", хоосон, урт → false', [isSafeMediaId('a/b'), isSafeMediaId('..'), isSafeMediaId(''), isSafeMediaId('x'.repeat(256)), isSafeMediaId('1_ok.png')], [false, false, false, false, true]);
check('P9 бодлого: avatar видео ✗, question 11MB зураг ✗, question 900MB видео ✓, хувийн бичлэг ✓', [
  !!checkPolicy('avatar', 'video', 10), !!checkPolicy('question', 'image', 11 * 1048576), checkPolicy('question', 'video', 900 * 1048576), checkPolicy('exam-recording', 'video', 1024 * 1048576),
], [true, true, null, null]);
check('P10 хувийн зориулалт = зөвхөн бичлэгүүд', Object.entries(MEDIA_PURPOSES).filter(([, d]) => d.visibility === 'private').map(([k]) => k), ['exam-recording', 'answer-recording']);
check('P11 хуучин studio түлхүүр', [purposeFromLegacyKey('ic_1_a.png'), purposeFromLegacyKey('pt_1_a.png'), purposeFromLegacyKey('1_a.png')], ['studio-icon', 'studio-image', null]);

console.log(failed ? `\n❌ ${failed} алдаа` : '\n✅ БҮГД АМЖИЛТТАЙ');
process.exit(failed ? 1 : 0);
