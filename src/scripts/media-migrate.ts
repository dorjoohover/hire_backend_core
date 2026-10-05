/**
 * Хуучин файлуудыг (core-ийн локал `uploads/`) Cloudflare R2 руу ЗОРИУЛАЛТ + ТӨРЛӨӨР ангилж зөөнө.
 *
 *   DB дэх утга (файлын id) ӨӨРЧЛӨГДӨХГҮЙ — `media_object`-д id → R2 түлхүүр бүртгэгдэж,
 *   `GET /file/<id>` (MEDIA_STORAGE=r2 үед) CDN руу 302 болно. Локал файл устгагдахгүй (rollback).
 *   Зориулалтыг DB-ийн лавлагаагаар тогтооно (question.file, "questionAnswer".file, blog, assessment,
 *   users.profile, studio_icon, pdf_template, HTML доторх /api/file/<id>); олдоогүй → misc.
 *
 * Ажиллуулах (core VPS, container дотор — R2 + DB env-тэй):
 *   docker compose exec core node dist/scripts/media-migrate.js                 # DRY-RUN (юу ч бичихгүй)
 *   docker compose exec core node dist/scripts/media-migrate.js --apply         # R2 руу хуулж бүртгэнэ
 *   сонголт: --dir ./uploads  --limit 100  --only question  --concurrency 4  --skip-unreferenced
 * Локал (dev): npx ts-node -r tsconfig-paths/register src/scripts/media-migrate.ts [...]
 * Давтан ажиллуулж болно (бүртгэгдсэнийг алгасна).
 */
import 'reflect-metadata';
import { createReadStream, promises as fsp } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import * as mimeTypes from 'mime-types';
import { PERF_BOOTSTRAP_STATEMENTS } from '../database/sql/perf-bootstrap';
import { createS3Client, describeObjectStorage, isObjectStorageConfigured, objectStorageConfig } from '../utils/object-storage';
import {
  MEDIA_PURPOSES,
  MediaKind,
  MediaPurpose,
  buildMediaKey,
  isMediaPurpose,
  isSafeMediaId,
  kindOfMime,
  purposeFromLegacyKey,
  sniffMime,
} from '../app/media/media-policy';

type Opts = { apply: boolean; dir: string; limit: number; only?: string; concurrency: number; skipUnreferenced: boolean };

export function parseArgs(argv: string[]): Opts {
  const o: Opts = { apply: false, dir: process.env.UPLOADS_DIR || './uploads', limit: 0, concurrency: 4, skipUnreferenced: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = () => argv[++i];
    if (a === '--apply') o.apply = true;
    else if (a === '--dir') o.dir = v();
    else if (a === '--limit') o.limit = Number(v()) || 0;
    else if (a === '--only') o.only = v();
    else if (a === '--concurrency') o.concurrency = Math.max(1, Math.min(16, Number(v()) || 4));
    else if (a === '--skip-unreferenced') o.skipUnreferenced = true;
    else throw new Error(`үл мэдэх сонголт: ${a}`);
  }
  if (o.only && !isMediaPurpose(o.only)) throw new Error(`--only буруу: ${o.only}`);
  return o;
}

/** Утга (id, бүтэн URL, HTML) доторх файлын id-ууд. */
const URL_RE = /(?:\/api\/v1\/file\/|\/api\/file\/|pdf-template\/image\/|\/api\/templates\/image\/)([^"'\s<>)?#]+)/g;
export function extractIds(value: any, exact: boolean): string[] {
  if (value == null) return [];
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  const out = new Set<string>();
  for (const m of s.matchAll(URL_RE)) {
    try { out.add(decodeURIComponent(m[1])); } catch { out.add(m[1]); }
  }
  if (exact && typeof value === 'string' && !out.size && isSafeMediaId(value.trim())) out.add(value.trim());
  return [...out];
}

/** Хүснэгт → зориулалт (HTML/JSON доторх лавлагаа). Тодорхой багана (exact) нь id-г шууд агуулна. */
const EXACT: [string, string, MediaPurpose][] = [
  ['question', 'file', 'question'],
  ['questionAnswer', 'file', 'answer-option'],
  ['assessment', 'icons', 'assessment'],
  ['assessment', 'exampleReport', 'assessment'],
  ['blog', 'image', 'blog'],
  ['blog', 'video', 'blog'],
  ['users', 'profile', 'avatar'],
  ['studio_icon', 'key', 'studio-icon'],
];
const SCAN_TABLES: [string, MediaPurpose][] = [
  ['question', 'question'], ['questionAnswer', 'answer-option'], ['questionCategory', 'question'],
  ['assessment', 'assessment'], ['blog', 'blog'], ['pdf_template', 'studio-image'],
];

export async function classify(ds: DataSource): Promise<Map<string, MediaPurpose>> {
  const map = new Map<string, MediaPurpose>();
  const put = (id: string, p: MediaPurpose) => {
    const legacy = purposeFromLegacyKey(id);
    if (!map.has(id)) map.set(id, legacy ?? p);
  };
  const cols = async (table: string) =>
    (await ds.query(
      `SELECT column_name AS c, data_type AS t FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND data_type IN ('text','character varying','json','jsonb')`,
      [table],
    )) as { c: string; t: string }[];
  for (const [table, col, purpose] of EXACT) {
    if (!(await cols(table)).some((x) => x.c === col)) continue;
    const rows = await ds.query(`SELECT DISTINCT "${col}" AS v FROM "${table}" WHERE "${col}" IS NOT NULL AND "${col}"::text <> ''`);
    for (const r of rows) for (const id of extractIds(r.v, true)) put(id, purpose);
  }
  for (const [table, purpose] of SCAN_TABLES) {
    for (const { c } of await cols(table)) {
      const rows = await ds.query(
        `SELECT "${c}" AS v FROM "${table}" WHERE "${c}"::text LIKE '%file/%' OR "${c}"::text LIKE '%image/%'`,
      );
      for (const r of rows) for (const id of extractIds(r.v, false)) put(id, purpose);
    }
  }
  return map;
}

async function pool<T>(items: T[], n: number, fn: (t: T, i: number) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k], k); }
  }));
}

export async function migrate(ds: DataSource, o: Opts, log = console.log) {
  const cfg = objectStorageConfig();
  if (!isObjectStorageConfigured(cfg)) throw new Error(`R2/S3 тохиргоо дутуу: ${describeObjectStorage(cfg)}`);
  const s3 = createS3Client(cfg);
  const publicBucket = (process.env.MEDIA_PUBLIC_BUCKET || '').trim() || cfg.bucket!;
  log(`storage: ${describeObjectStorage(cfg)} · нийтийн bucket=${publicBucket} · prefix="${process.env.MEDIA_KEY_PREFIX ?? ''}" · ${o.apply ? 'APPLY' : 'DRY-RUN'}`);
  for (const s of PERF_BOOTSTRAP_STATEMENTS.filter((x) => x.includes('media_object'))) await ds.query(s);

  const names = (await fsp.readdir(o.dir, { withFileTypes: true }))
    .filter((d) => d.isFile())
    .map((d) => d.name);
  const skipped = { report: 0, tmp: 0, unsafe: 0, done: 0, unreferenced: 0 };
  let ids = names.filter((n) => {
    if (/^report-.*\.pdf(\..*)?$/i.test(n)) return (skipped.report++, false);
    if (/\.(tmp|part)$|^\./.test(n) || /\.bak-/.test(n)) return (skipped.tmp++, false);
    if (!isSafeMediaId(n)) return (skipped.unsafe++, false);
    return true;
  });
  const done = new Set<string>(
    (await ds.query(`SELECT id FROM media_object WHERE status = 'ready' AND id = ANY($1::varchar[])`, [ids])).map((r: any) => r.id),
  );
  skipped.done = done.size;
  ids = ids.filter((n) => !done.has(n));

  const refs = await classify(ds);
  const nameSet = new Set(names);
  const missingRefs = [...refs.keys()].filter((id) => !nameSet.has(id) && !done.has(id));
  const plan: { id: string; purpose: MediaPurpose; referenced: boolean }[] = [];
  for (const id of ids) {
    const p = refs.get(id) ?? purposeFromLegacyKey(id);
    if (!p && o.skipUnreferenced) { skipped.unreferenced++; continue; }
    const purpose = p ?? 'misc';
    if (o.only && purpose !== o.only) continue;
    plan.push({ id, purpose, referenced: !!p });
  }
  const todo = o.limit ? plan.slice(0, o.limit) : plan;

  const stats = new Map<string, { n: number; bytes: number }>();
  const errors: { id: string; error: string }[] = [];
  const samples: string[] = [];
  await pool(todo, o.concurrency, async (t) => {
    const file = join(o.dir, t.id);
    try {
      const st = await fsp.stat(file);
      const fh = await fsp.open(file, 'r');
      const head = Buffer.alloc(4096);
      const { bytesRead } = await fh.read(head, 0, 4096, 0);
      await fh.close();
      const declared = (mimeTypes.lookup(t.id) || '') as string;
      const mime = sniffMime(head.subarray(0, bytesRead), declared) ?? (declared || 'application/octet-stream');
      let kind: MediaKind = kindOfMime(mime);
      let purpose = t.purpose;
      if (!MEDIA_PURPOSES[purpose].kinds.includes(kind)) purpose = 'misc'; // зориулалтад тохирохгүй хэлбэр
      if (!MEDIA_PURPOSES.misc.kinds.includes(kind)) kind = 'other';
      const key = buildMediaKey(purpose, kind, t.id, st.mtime);
      const vis = MEDIA_PURPOSES[purpose].visibility;
      const bucket = vis === 'private' ? cfg.bucket! : publicBucket;
      const k = `${purpose}/${kind}`;
      const cur = stats.get(k) ?? { n: 0, bytes: 0 };
      stats.set(k, { n: cur.n + 1, bytes: cur.bytes + st.size });
      if (samples.length < 8) samples.push(`${t.id} → ${key}`);
      if (!o.apply) return;
      await s3.upload({
        Bucket: bucket, Key: key, Body: createReadStream(file), ContentType: mime,
        ...(vis === 'public' ? { CacheControl: 'public, max-age=31536000, immutable' } : {}),
      }, { partSize: 8 * 1024 * 1024, queueSize: 2 }).promise();
      const head2 = await s3.headObject({ Bucket: bucket, Key: key }).promise();
      if (Number(head2.ContentLength) !== st.size) throw new Error(`хэмжээ таарсангүй (${head2.ContentLength} ≠ ${st.size})`);
      await ds.query(
        `INSERT INTO media_object (id, key, purpose, kind, visibility, mime, bytes, status, "migratedFrom", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,'ready','local',$8)
         ON CONFLICT (id) DO UPDATE SET key = EXCLUDED.key, purpose = EXCLUDED.purpose, kind = EXCLUDED.kind,
           visibility = EXCLUDED.visibility, mime = EXCLUDED.mime, bytes = EXCLUDED.bytes, status = 'ready',
           "migratedFrom" = 'local', "updatedAt" = now()`,
        [t.id, key, purpose, kind, vis, mime, st.size, st.mtime],
      );
    } catch (e: any) {
      errors.push({ id: t.id, error: e?.message ?? String(e) });
    }
  });

  log(`\nФайл: ${names.length} · зөөх: ${todo.length}${o.limit ? ` (--limit ${o.limit}, нийт ${plan.length})` : ''} · ` +
      `алгассан: тайлан ${skipped.report}, tmp ${skipped.tmp}, нэр буруу ${skipped.unsafe}, өмнө нь зөөсөн ${skipped.done}` +
      (o.skipUnreferenced ? `, лавлагаагүй ${skipped.unreferenced}` : ''));
  log(`Лавлагаагүй (→ misc): ${plan.filter((p) => !p.referenced).length}`);
  log('\nЗориулалт/төрөл              тоо        MB');
  for (const [k, v] of [...stats].sort()) log(`  ${k.padEnd(26)} ${String(v.n).padStart(6)} ${(v.bytes / 1048576).toFixed(1).padStart(9)}`);
  if (samples.length) log('\nЖишээ:\n  ' + samples.join('\n  '));
  if (missingRefs.length) {
    log(`\n⚠️ DB-д лавлагаатай боловч ${o.dir}-д байхгүй: ${missingRefs.length} (эхний 10): ${missingRefs.slice(0, 10).join(', ')}`);
  }
  if (errors.length) log(`\n❌ Алдаа ${errors.length}:\n  ` + errors.slice(0, 20).map((e) => `${e.id}: ${e.error}`).join('\n  '));
  log(o.apply ? `\n✅ APPLY дууслаа (${todo.length - errors.length} зөөсөн)` : '\nDRY-RUN — юу ч бичээгүй. Бодитоор: --apply');
  return { stats, errors, todo: todo.length, missingRefs, skipped };
}

if (require.main === module) {
  (async () => {
    const o = parseArgs(process.argv.slice(2));
    const ds = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL, synchronize: false, extra: { max: 4 } });
    await ds.initialize();
    try {
      const r = await migrate(ds, o);
      process.exitCode = r.errors.length ? 1 : 0;
    } finally {
      await ds.destroy();
    }
  })().catch((e) => {
    console.error('❌', e?.message ?? e);
    process.exit(1);
  });
}
