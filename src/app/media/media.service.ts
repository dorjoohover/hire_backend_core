import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { DataSource } from 'typeorm';
import { Readable } from 'stream';
import { isSafeMode } from 'src/utils/safe-mode';
import {
  createS3Client,
  isObjectStorageConfigured,
  objectStorageConfig,
} from 'src/utils/object-storage';
import {
  MEDIA_PURPOSES,
  MediaKind,
  MediaPurpose,
  buildMediaKey,
  checkPolicy,
  isMediaPurpose,
  isSafeMediaId,
  kindOfMime,
  newMediaId,
  sniffMime,
} from './media-policy';

export type MediaRow = {
  id: string;
  key: string;
  purpose: MediaPurpose;
  kind: MediaKind;
  visibility: 'public' | 'private';
  mime: string | null;
  bytes: number | null;
  status: 'pending' | 'ready';
  examCode: string | null;
  ownerId: number | null;
};
export type MediaUser = { id?: number; role?: number } | undefined;
export type MediaResolve =
  | { type: 'redirect'; url: string; cache: string }
  | { type: 'stream'; stream: Readable; mime: string; bytes?: number | null; cache: string }
  | { type: 'missing' } // media_object-д бий ч харуулахгүй (хувийн / pending)
  | null; // media_object-д байхгүй → хуучин (локал) зам

const ADMIN_ROLES = [10, 40, 50];
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 5000;
const envInt = (n: string, d: number) => {
  const v = Number(process.env[n]);
  return Number.isFinite(v) && v > 0 ? v : d;
};

/**
 * Медиа хадгалалт (R2/S3): зориулалт + төрлөөр ангилсан түлхүүр, нийтийн → CDN, хувийн →
 * хугацаатай холбоос. `MEDIA_STORAGE=r2` үед идэвхтэй (унтраалттай бол бүх зүйл хуучнаараа —
 * локал uploads/, rollback = flag-ийг унтраах). Бодлого/түлхүүр: media-policy.ts.
 *
 * Env: MEDIA_STORAGE=r2 · MEDIA_PUBLIC_BUCKET (нийтийн bucket, CDN домэйнтэй) · MEDIA_PUBLIC_URL
 * (https://cdn.hire.mn) · MEDIA_KEY_PREFIX (орчин тус бүрд, жиш. `test/`) · MEDIA_INLINE_MAX_MB (25)
 * · MEDIA_LOCAL_COPY (1 — inline upload-ыг локалд ч хуулж rollback-д бэлэн байлгах).
 * Хувийн bucket = тайлантай ижил storage тохиргоо (S3_* / CF_* / AWS_*).
 */
@Injectable()
export class MediaService {
  private s3?: AWS.S3;
  private readonly cache = new Map<string, { row: MediaRow | null; at: number }>();
  private tableMissing = false;

  constructor(private readonly ds: DataSource) {}

  private storage() {
    return objectStorageConfig();
  }
  private client(): AWS.S3 {
    if (!this.s3) this.s3 = createS3Client(this.storage());
    return this.s3;
  }
  /** R2-аас уншиж/бичих боломжтой (тохиргоо бүрэн, SAFE_MODE биш) ба MEDIA_STORAGE асаалттай. */
  enabled(): boolean {
    return (
      /^(r2|s3|on|1|true)$/i.test(process.env.MEDIA_STORAGE ?? '') &&
      isObjectStorageConfigured(this.storage()) &&
      !isSafeMode()
    );
  }
  privateBucket(): string {
    return this.storage().bucket!;
  }
  publicBucket(): string {
    return (process.env.MEDIA_PUBLIC_BUCKET || '').trim() || this.storage().bucket!;
  }
  bucketFor(row: Pick<MediaRow, 'visibility'>): string {
    return row.visibility === 'private' ? this.privateBucket() : this.publicBucket();
  }
  /** Нийтийн CDN URL (MEDIA_PUBLIC_URL байхгүй бол null → core урсгана). */
  publicUrl(key: string): string | null {
    const base = (process.env.MEDIA_PUBLIC_URL || '').trim().replace(/\/+$/, '');
    if (!base) return null;
    return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
  inlineMax(): number {
    return envInt('MEDIA_INLINE_MAX_MB', 25) * 1024 * 1024;
  }

  // ---- media_object ----
  async find(id: string): Promise<MediaRow | null> {
    if (this.tableMissing || !isSafeMediaId(id)) return null;
    const c = this.cache.get(id);
    if (c && Date.now() - c.at < (c.row ? CACHE_TTL_MS : 60_000)) return c.row;
    let row: MediaRow | null = null;
    try {
      const r = await this.ds.query(
        `SELECT id, key, purpose, kind, visibility, mime, bytes, status, "examCode", "ownerId"
         FROM media_object WHERE id = $1`,
        [id],
      );
      row = r[0] ? { ...r[0], bytes: r[0].bytes == null ? null : Number(r[0].bytes) } : null;
    } catch (e: any) {
      if (e?.code === '42P01') this.tableMissing = true; // bootstrap хараахан ажиллаагүй
      else throw e;
    }
    if (this.cache.size >= CACHE_MAX) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(id, { row, at: Date.now() });
    return row;
  }
  private forget(id: string) {
    this.cache.delete(id);
  }
  async insert(row: MediaRow & { migratedFrom?: string | null }) {
    await this.ds.query(
      `INSERT INTO media_object (id, key, purpose, kind, visibility, mime, bytes, status, "examCode", "ownerId", "migratedFrom")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET key = EXCLUDED.key, purpose = EXCLUDED.purpose, kind = EXCLUDED.kind,
         visibility = EXCLUDED.visibility, mime = EXCLUDED.mime, bytes = EXCLUDED.bytes, status = EXCLUDED.status,
         "examCode" = EXCLUDED."examCode", "ownerId" = EXCLUDED."ownerId", "updatedAt" = now()`,
      [row.id, row.key, row.purpose, row.kind, row.visibility, row.mime, row.bytes, row.status,
       row.examCode, row.ownerId, row.migratedFrom ?? null],
    );
    this.tableMissing = false;
    this.forget(row.id);
  }

  // ---- бичих ----
  /**
   * Сервер дамжуулан (≤ MEDIA_INLINE_MAX_MB) upload. MIME-ийг эхний байтаар таньж бодлогоор
   * шалгана. `id` өгвөл тэрийг (хуучин studio `ic_`/`pt_` түлхүүр, bundle import) хэрэглэнэ.
   */
  async putInline(input: {
    buffer: Buffer;
    originalName?: string;
    declaredMime?: string;
    purpose: MediaPurpose;
    id?: string;
    ownerId?: number | null;
    examCode?: string | null;
  }): Promise<MediaRow> {
    if (!this.enabled()) throw new ServiceUnavailableException('Медиа хадгалалт (MEDIA_STORAGE) идэвхгүй');
    const { buffer, purpose } = input;
    if (!isMediaPurpose(purpose)) throw new BadRequestException(`purpose буруу: ${purpose}`);
    if (!buffer?.length) throw new BadRequestException('Файл хоосон байна');
    if (buffer.length > this.inlineMax()) {
      throw new HttpException(
        `Файл ${Math.round(this.inlineMax() / 1048576)}MB-аас их — том бичлэгийг POST /media/presign-аар шууд R2 руу оруулна уу`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
    // Танигдаагүй төрөл: зөвхөн misc-д (admin /upload, bundle import-ийн хуучин зан төлөв) "other".
    const sniffed = sniffMime(buffer.subarray(0, 4096), input.declaredMime);
    const mime = sniffed ?? (purpose === 'misc' ? 'application/octet-stream' : '');
    const kind = sniffed ? kindOfMime(sniffed) : 'other';
    const err = !mime ? 'Файлын төрлийг таньсангүй (зураг / аудио / видео / PDF)' : checkPolicy(purpose, kind, buffer.length);
    if (err) throw new BadRequestException(err);
    const def = MEDIA_PURPOSES[purpose];
    const id = input.id ?? newMediaId(input.originalName, mime);
    if (!isSafeMediaId(id)) throw new BadRequestException('Файлын id буруу');
    const row: MediaRow = {
      id, key: buildMediaKey(purpose, kind, id), purpose, kind, visibility: def.visibility,
      mime, bytes: buffer.length, status: 'ready', examCode: input.examCode ?? null, ownerId: input.ownerId ?? null,
    };
    await this.client()
      .putObject({
        Bucket: this.bucketFor(row),
        Key: row.key,
        Body: buffer,
        ContentType: mime,
        ...(def.visibility === 'public' ? { CacheControl: 'public, max-age=31536000, immutable' } : {}),
      })
      .promise();
    await this.insert(row);
    return row;
  }

  private async assertExamAccess(examCode: string | undefined, user: MediaUser) {
    if (!examCode || !/^\d{6,20}$/.test(examCode)) throw new BadRequestException('examCode шаардлагатай');
    const r = await this.ds.query(
      `SELECT e."userId" AS "userId", s."userId" AS "orgId" FROM exam e
       LEFT JOIN "userService" s ON s.id = e."serviceId" WHERE e.code = $1`,
      [examCode],
    );
    if (!r[0]) throw new NotFoundException('Шалгалт олдсонгүй');
    const uid = Number(user?.id);
    const ok = ADMIN_ROLES.includes(Number(user?.role)) || (uid && (uid === Number(r[0].userId) || uid === Number(r[0].orgId)));
    if (!ok) throw new ForbiddenException('Энэ шалгалтын бичлэгт хандах эрхгүй');
  }

  /**
   * Том файл (видео, бичлэг): browser шууд R2 руу PUT хийх хугацаатай холбоос. Дараа нь
   * `complete()` бодит хэмжээ/төрлийг шалгаж `ready` болгоно. R2 bucket-д CORS (PUT) хэрэгтэй.
   */
  async presign(
    input: { purpose: string; mime: string; bytes: number; filename?: string; examCode?: string },
    user: MediaUser,
  ) {
    if (!this.enabled()) throw new ServiceUnavailableException('Медиа хадгалалт (MEDIA_STORAGE) идэвхгүй');
    if (!user?.id) throw new ForbiddenException('Нэвтэрнэ үү');
    const purpose = input?.purpose;
    if (!isMediaPurpose(purpose)) throw new BadRequestException(`purpose буруу: ${purpose}`);
    const mime = String(input?.mime ?? '').toLowerCase().split(';')[0].trim();
    const kind = kindOfMime(mime);
    const bytes = Number(input?.bytes);
    if (!Number.isFinite(bytes) || bytes <= 0) throw new BadRequestException('bytes шаардлагатай');
    const err = checkPolicy(purpose, kind, bytes);
    if (err) throw new BadRequestException(err);
    const def = MEDIA_PURPOSES[purpose];
    if (def.examBound) await this.assertExamAccess(input.examCode, user);
    const id = newMediaId(input.filename, mime);
    const row: MediaRow = {
      id, key: buildMediaKey(purpose, kind, id), purpose, kind, visibility: def.visibility, mime, bytes,
      status: 'pending', examCode: def.examBound ? input.examCode! : null, ownerId: Number(user.id),
    };
    await this.insert(row);
    const expiresIn = 15 * 60;
    const uploadUrl = await this.client().getSignedUrlPromise('putObject', {
      Bucket: this.bucketFor(row),
      Key: row.key,
      ContentType: mime,
      Expires: expiresIn,
      ...(def.visibility === 'public' ? { CacheControl: 'public, max-age=31536000, immutable' } : {}),
    });
    return {
      id, method: 'PUT', uploadUrl, expiresIn,
      headers: {
        'Content-Type': mime,
        ...(def.visibility === 'public' ? { 'Cache-Control': 'public, max-age=31536000, immutable' } : {}),
      },
    };
  }

  /** Presigned PUT дууссаны дараа: объект байгаа, хэмжээ ≤ зарласан, эхний байт нь зарласан төрөл. */
  async complete(id: string, user: MediaUser) {
    const row = await this.find(id);
    this.forget(id);
    if (!row) throw new NotFoundException('Ийм медиа алга');
    if (row.ownerId && Number(user?.id) !== Number(row.ownerId) && !ADMIN_ROLES.includes(Number(user?.role))) {
      throw new ForbiddenException('Эрхгүй');
    }
    if (row.status === 'ready') return { id, status: 'ready' };
    const Bucket = this.bucketFor(row);
    let head: AWS.S3.HeadObjectOutput;
    try {
      head = await this.client().headObject({ Bucket, Key: row.key }).promise();
    } catch {
      throw new BadRequestException('Файл R2 руу ороогүй байна (PUT амжилтгүй?)');
    }
    const bytes = Number(head.ContentLength ?? 0);
    const part = await this.client().getObject({ Bucket, Key: row.key, Range: 'bytes=0-4095' }).promise();
    const real = sniffMime(Buffer.from(part.Body as any), row.mime ?? undefined);
    const realKind = kindOfMime(real);
    const err = !real || realKind !== row.kind
      ? `Файлын бодит төрөл (${real ?? 'танигдаагүй'}) зарласантай (${row.mime}) таарсангүй`
      : bytes > Number(row.bytes)
        ? `Файл зарласнаас том (${bytes} > ${row.bytes})`
        : checkPolicy(row.purpose, realKind, bytes);
    if (err) {
      await this.client().deleteObject({ Bucket, Key: row.key }).promise().catch(() => undefined);
      await this.ds.query(`DELETE FROM media_object WHERE id = $1`, [id]);
      throw new BadRequestException(err);
    }
    await this.ds.query(
      `UPDATE media_object SET status = 'ready', bytes = $2, mime = $3, "updatedAt" = now() WHERE id = $1`,
      [id, bytes, real],
    );
    this.forget(id);
    return { id, status: 'ready', bytes, mime: real };
  }

  // ---- унших ----
  /** `GET /file/:id`, `GET pdf-template/image/:key` — media_object-д байвал CDN руу / R2-аас. */
  async resolve(id: string): Promise<MediaResolve> {
    if (!this.enabled()) return null;
    const row = await this.find(id);
    if (!row) return null;
    if (row.status !== 'ready' || row.visibility !== 'public') return { type: 'missing' };
    const url = this.publicUrl(row.key);
    if (url) return { type: 'redirect', url, cache: 'public, max-age=86400' };
    // CDN домэйн тохируулаагүй — core R2-аас урсгана.
    const stream = this.client().getObject({ Bucket: this.bucketFor(row), Key: row.key }).createReadStream();
    return { type: 'stream', stream, mime: row.mime || 'application/octet-stream', bytes: row.bytes, cache: 'public, max-age=86400' };
  }

  /** Хувийн бичлэгийн хугацаатай (5 мин) холбоос — эрх шалгана. Нийтийнх бол CDN URL. */
  async signedUrl(id: string, user: MediaUser) {
    if (!this.enabled()) throw new ServiceUnavailableException('Медиа хадгалалт идэвхгүй');
    const row = await this.find(id);
    if (!row || row.status !== 'ready') throw new NotFoundException('Ийм медиа алга');
    if (row.visibility === 'public') {
      return { id, url: this.publicUrl(row.key) ?? `file/${encodeURIComponent(id)}`, expiresIn: null };
    }
    if (row.examCode) await this.assertExamAccess(row.examCode, user);
    else if (Number(user?.id) !== Number(row.ownerId) && !ADMIN_ROLES.includes(Number(user?.role))) {
      throw new ForbiddenException('Эрхгүй');
    }
    const expiresIn = 300;
    const url = await this.client().getSignedUrlPromise('getObject', {
      Bucket: this.bucketFor(row), Key: row.key, Expires: expiresIn,
    });
    return { id, url, expiresIn };
  }

  /** Assessment bundle экспорт: bytes (байхгүй бол null). */
  async readBytes(id: string): Promise<Buffer | null> {
    if (!this.enabled()) return null;
    const row = await this.find(id);
    if (!row || row.status !== 'ready') return null;
    try {
      const o = await this.client().getObject({ Bucket: this.bucketFor(row), Key: row.key }).promise();
      return Buffer.from(o.Body as any);
    } catch {
      return null;
    }
  }

  // ---- устгах ----
  /** Шалгалт устахад (ops цэвэрлэгээ) — тэдгээрийн бичлэгүүдийг R2 + DB-ээс. Алдаатай code-ийг буцаана. */
  async countByExamCodes(codes: string[]): Promise<number> {
    if (!codes.length || this.tableMissing) return 0;
    try {
      const r = await this.ds.query(`SELECT count(*)::int AS n FROM media_object WHERE "examCode" = ANY($1::varchar[])`, [codes]);
      return Number(r[0]?.n ?? 0);
    } catch (e: any) {
      if (e?.code === '42P01') return 0;
      throw e;
    }
  }

  async deleteByExamCodes(codes: string[]): Promise<{ deleted: number; failed: Map<string, string> }> {
    const failed = new Map<string, string>();
    if (!codes.length) return { deleted: 0, failed };
    let rows: MediaRow[] = [];
    try {
      rows = await this.ds.query(
        `SELECT id, key, visibility, "examCode" FROM media_object WHERE "examCode" = ANY($1::varchar[])`,
        [codes],
      );
    } catch (e: any) {
      if (e?.code === '42P01') return { deleted: 0, failed };
      throw e;
    }
    if (!rows.length) return { deleted: 0, failed };
    if (!isObjectStorageConfigured(this.storage()) || isSafeMode()) {
      for (const r of rows) failed.set(r.examCode!, 'R2 тохиргоогүй — бичлэгийг устгаж чадсангүй');
      return { deleted: 0, failed };
    }
    const okIds: string[] = [];
    const byBucket = new Map<string, MediaRow[]>();
    for (const r of rows) {
      const b = this.bucketFor(r);
      if (!byBucket.has(b)) byBucket.set(b, []);
      byBucket.get(b)!.push(r);
    }
    for (const [Bucket, list] of byBucket) {
      for (let i = 0; i < list.length; i += 1000) {
        const chunk = list.slice(i, i + 1000);
        try {
          const out = await this.client()
            .deleteObjects({ Bucket, Delete: { Objects: chunk.map((r) => ({ Key: r.key })), Quiet: false } })
            .promise();
          const bad = new Map((out.Errors ?? []).map((e) => [e.Key!, `${e.Code}: ${e.Message}`]));
          for (const r of chunk) {
            const err = bad.get(r.key);
            if (err) failed.set(r.examCode!, `бичлэг ${r.id}: ${err}`);
            else okIds.push(r.id);
          }
        } catch (e: any) {
          for (const r of chunk) failed.set(r.examCode!, `бичлэг: ${e?.code ?? ''} ${e?.message ?? e}`.trim());
        }
      }
    }
    if (okIds.length) await this.ds.query(`DELETE FROM media_object WHERE id = ANY($1::varchar[])`, [okIds]);
    okIds.forEach((id) => this.forget(id));
    return { deleted: okIds.length, failed };
  }
}
