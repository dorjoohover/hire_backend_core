import * as AWS from 'aws-sdk';

/*
 * S3-compatible object storage тохиргоо (AWS S3 эсвэл Cloudflare R2) — v1.3.0.
 *
 * Шинэ хувьсагчид (давуу эрэмбэтэй):
 *   S3_ENDPOINT            R2: https://<ACCOUNT_ID>.r2.cloudflarestorage.com  (эсвэл R2_ACCOUNT_ID)
 *   R2_ACCOUNT_ID          S3_ENDPOINT-ийг үүнээс угсарна
 *   S3_BUCKET              bucket нэр
 *   S3_ACCESS_KEY_ID       R2 API token-ий Access Key ID
 *   S3_SECRET_ACCESS_KEY   R2 API token-ий Secret Access Key
 *   S3_REGION              R2 бол "auto" (default)
 * Хуучин AWS_* (AWS_ACCESS_KEY[_ID], AWS_SECRET_KEY / AWS_SECRET_ACCESS_KEY,
 * AWS_REGION, AWS_BUCKET_NAME) хэвээр ажиллана — S3_* тавигдаагүй үед.
 * Нууц утгыг ХЭЗЭЭ Ч лог руу хэвлэхгүй (describe() нь халхалсан мөр буцаана).
 */
export interface ObjectStorageConfig {
  provider: 'r2' | 's3' | 'custom';
  endpoint?: string;
  region: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export function objectStorageConfig(env: NodeJS.ProcessEnv = process.env): ObjectStorageConfig {
  const endpoint =
    env.S3_ENDPOINT?.trim() ||
    (env.R2_ACCOUNT_ID?.trim() ? `https://${env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com` : undefined);
  const provider: ObjectStorageConfig['provider'] = !endpoint
    ? 's3'
    : /\.r2\.cloudflarestorage\.com/i.test(endpoint)
      ? 'r2'
      : 'custom';
  return {
    provider,
    endpoint,
    region: env.S3_REGION?.trim() || (endpoint ? 'auto' : env.AWS_REGION?.trim() || 'us-east-1'),
    bucket: env.S3_BUCKET?.trim() || env.AWS_BUCKET_NAME?.trim() || undefined,
    accessKeyId:
      env.S3_ACCESS_KEY_ID?.trim() || env.AWS_ACCESS_KEY_ID?.trim() || env.AWS_ACCESS_KEY?.trim() || undefined,
    secretAccessKey:
      env.S3_SECRET_ACCESS_KEY?.trim() ||
      env.AWS_SECRET_ACCESS_KEY?.trim() ||
      env.AWS_SECRET_KEY?.trim() ||
      undefined,
  };
}

/** Bucket ба түлхүүр бүрэн тохируулагдсан эсэх (дутуу бол SDK EC2 metadata руу оролдож удахаас сэргийлнэ). */
export function isObjectStorageConfigured(cfg: ObjectStorageConfig = objectStorageConfig()): boolean {
  return !!cfg.bucket && !!cfg.accessKeyId && !!cfg.secretAccessKey;
}

export function createS3Client(cfg: ObjectStorageConfig = objectStorageConfig()): AWS.S3 {
  return new AWS.S3({
    ...(cfg.endpoint ? { endpoint: cfg.endpoint } : {}),
    region: cfg.region,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    signatureVersion: 'v4',
    // R2 нь path-style-ийг дэмждэг — bucket subdomain-ий DNS/TLS асуудлаас сэргийлнэ.
    s3ForcePathStyle: true,
    maxRetries: 3,
    httpOptions: { connectTimeout: 10_000, timeout: 120_000 },
  });
}

/** Лог-д зориулсан (нууцгүй) тайлбар. */
export function describeObjectStorage(cfg: ObjectStorageConfig = objectStorageConfig()): string {
  const host = cfg.endpoint ? new URL(cfg.endpoint).host.replace(/^[^.]{6}/, '******') : 'aws';
  return `provider=${cfg.provider} endpoint=${host} region=${cfg.region} bucket=${cfg.bucket ?? 'MISSING'} key=${
    cfg.accessKeyId ? 'set' : 'MISSING'
  } secret=${cfg.secretAccessKey ? 'set' : 'MISSING'}`;
}
