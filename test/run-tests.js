#!/usr/bin/env node
/**
 * Script-style тестүүдийг (`*.spec-lite.ts` = DB / HTTP-гүй, `*.int.ts` = жинхэнэ
 * Postgres) ts-node-оор зэрэг (concurrency 3) ажиллуулж, нэгтгэл хэвлэнэ.
 * Аль нэг нь exit ≠ 0 бол бүхэлдээ exit 1.
 *
 *   node test/run-tests.js lite            # test/*.spec-lite.ts
 *   node test/run-tests.js int             # test/int/*.int.ts  (TEST_DATABASE_URL хэрэгтэй)
 *   node test/run-tests.js lite ops skip   # нэрэнд "ops" / "skip" агуулсан файлууд
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const mode = process.argv[2] || 'lite';
const filters = process.argv.slice(3);
const dir = mode === 'int' ? path.join(__dirname, 'int') : __dirname;
const suffix = mode === 'int' ? '.int.ts' : '.spec-lite.ts';
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(suffix))
  .filter((f) => filters.length === 0 || filters.some((x) => f.includes(x)))
  .sort();

if (files.length === 0) {
  console.error(`тест олдсонгүй (${mode}, ${filters.join(',')})`);
  process.exit(1);
}

const CONCURRENCY = mode === 'int' ? 1 : 3; // int тест нэг DB-г хуваалцана
const root = path.join(__dirname, '..');
const results = [];

const runOne = (file) =>
  new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(
      process.execPath,
      [
        require.resolve('ts-node/dist/bin.js'),
        '-P',
        'tsconfig.json',
        '-r',
        'tsconfig-paths/register',
        path.join(dir, file),
      ],
      { cwd: root, env: { ...process.env, NODE_ENV: 'test' } },
    );
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    const timer = setTimeout(() => child.kill('SIGKILL'), 5 * 60 * 1000);
    child.on('close', (code) => {
      clearTimeout(timer);
      const ok = code === 0;
      const lines = out.split('\n');
      const checks = lines.filter((l) => /^(✅|❌)/.test(l));
      results.push({ file, ok, code, ms: Date.now() - started, out, checks });
      resolve();
    });
  });

(async () => {
  const queue = [...files];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await runOne(queue.shift());
  });
  await Promise.all(workers);

  results.sort((a, b) => a.file.localeCompare(b.file));
  for (const r of results.filter((x) => !x.ok)) {
    console.log(`\n───── ${r.file} (exit ${r.code}) ─────`);
    console.log(r.out.split('\n').slice(-60).join('\n'));
  }
  console.log('\n══ Нэгтгэл ══');
  let total = 0;
  for (const r of results) {
    const pass = r.checks.filter((l) => l.startsWith('✅')).length;
    // exit code нь үнэн; тестийн доторх service-ийн `❌ … алдаа` лог мөрийг унасан шалгалтад тоолохгүй
    const fail = r.ok ? 0 : r.checks.filter((l) => l.startsWith('❌')).length;
    total += pass + fail;
    console.log(
      `${r.ok ? '✅' : '❌'} ${r.file.padEnd(38)} ${String(pass).padStart(3)} шалгалт${fail ? `, ${fail} унасан` : ''}  (${(r.ms / 1000).toFixed(1)}s)`,
    );
  }
  const bad = results.filter((r) => !r.ok).length;
  console.log(bad ? `\n❌ ${bad} файл унасан (${total} шалгалт)` : `\n✅ БҮГД АМЖИЛТТАЙ — ${results.length} файл, ${total} шалгалт`);
  process.exit(bad ? 1 : 0);
})();
