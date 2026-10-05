/**
 * FileService.getReport — hire_report-оос PDF татахдаа "файл байхгүй" (404) ба
 * "түр алдаа" (сүлжээ / 5xx)-г ялгах тест (DB-гүй, локал fake hire_report).
 *
 * Өмнө нь бүх алдаа `null` → requestPdf "File not found" 404 → web дээр
 * "404 Тайлан олдсонгүй" (файл байсан ч). Одоо missing=false үед 503.
 *
 * Ажиллуулах:
 *   npx ts-node --transpile-only -r tsconfig-paths/register test/report-file-fetch.spec-lite.ts
 */
import * as http from 'http';
import { AddressInfo } from 'net';
import { FileService } from '../src/file.service';

let failures = 0;
const check = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
};

async function main() {
  const hits: Record<string, number> = {};
  const server = http.createServer((req, res) => {
    const name = (req.url || '').replace('/file/', '');
    hits[name] = (hits[name] || 0) + 1;
    if (name === 'ok.pdf') {
      res.writeHead(200, { 'content-type': 'application/pdf' });
      return res.end('%PDF-1.4 ok');
    }
    if (name === 'missing.pdf') {
      res.writeHead(404);
      return res.end();
    }
    if (name === 'flaky.pdf') {
      // 1-р оролдлого 503 (Traefik: replica restart), 2-р нь амжилттай
      if (hits[name] === 1) {
        res.writeHead(503);
        return res.end();
      }
      res.writeHead(200, { 'content-type': 'application/pdf' });
      return res.end('%PDF-1.4 flaky');
    }
    res.writeHead(500);
    res.end();
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const port = (server.address() as AddressInfo).port;
  process.env.REPORT = `http://127.0.0.1:${port}/`;
  const svc = new FileService();

  const ok = await svc.getReport('ok.pdf');
  check('200 → response', !!ok.response && ok.missing === false);
  ok.response?.data?.destroy?.();

  const missing = await svc.getReport('missing.pdf');
  check('404 → missing=true (жинхэнэ 404)', !missing.response && missing.missing === true);
  check('404-ийг дахин оролдохгүй', hits['missing.pdf'] === 1, `hits=${hits['missing.pdf']}`);

  const flaky = await svc.getReport('flaky.pdf');
  check('503 → 1 удаа дахин оролдож амжилттай', !!flaky.response && hits['flaky.pdf'] === 2, `hits=${hits['flaky.pdf']}`);
  flaky.response?.data?.destroy?.();

  const boom = await svc.getReport('boom.pdf');
  check('500 давтагдвал → missing=false (503 болно)', !boom.response && boom.missing === false && hits['boom.pdf'] === 2, `hits=${hits['boom.pdf']}`);

  server.close();
  // Унтраалттай сервер (ECONNREFUSED) — deploy/restart үеийн байдал
  process.env.REPORT = `http://127.0.0.1:${port}/`;
  const refused = await svc.getReport('ok.pdf');
  check('ECONNREFUSED → missing=false (503 болно)', !refused.response && refused.missing === false);

  console.log(failures ? `\n❌ ${failures} алдаа` : '\n✅ БҮГД АМЖИЛТТАЙ');
  process.exit(failures ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
