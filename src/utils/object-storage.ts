import * as AWS from 'aws-sdk';

/*
 * S3-compatible object storage тохиргоо (AWS S3 эсвэл Cloudflare R2) — v1.3.0.
 *
 * Гурван бүлгийн аль НЭГИЙГ (холихгүй) дараах эрэмбээр сонгоно:
 *   1) S3_*  : S3_ENDPOINT (эсвэл R2_ACCOUNT_ID), S3_BUCKET, S3_ACCESS_KEY_ID,
 *              S3_SECRET_ACCESS_KEY, S3_REGION
 *   2) CF_*  : CF_ENDPOINT (https://<ACCOUNT_ID>.r2.cloudflarestorage.com[/<bucket>]),
 *              CF_ACCESS_KEY_ID, CF_SECRET_ACCESS_KEY, CF_BUCKET (эсвэл R2_BUCKET,
 *              эсвэл CF_ENDPOINT-ийн path-д bucket)
 *   3) AWS_* : хуучин AWS_ACCESS_KEY[_ID], AWS_SECRET_KEY / AWS_SECRET_ACCESS_KEY,
 *              AWS_REGION, AWS_BUCKET_NAME
 * Бүлэг холихгүй тул R2 endpoint-д AWS-ийн bucket/түлхүүр санамсаргүй орохгүй.
 * Нууц утгыг ХЭЗЭЭ Ч лог руу хэвлэхгүй (describe() нь халхалсан мөр буцаана).
 */
export interface ObjectStorageConfig {
  provider: 'r2' | 's3' | 'custom';
  source: 'S3_*' | 'CF_*' | 'AWS_*';
  endpoint?: string;
  region: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

const val = (v?: string) => (v && v.trim() ? v.trim().replace(/^['"]|['"]$/g, '') : undefined);

/** https://acct.r2.cloudflarestorage.com/<bucket> → { endpoint (path-гүй), bucket } */
function splitEndpoint(raw?: string): { endpoint?: string; bucket?: string } {
  if (!raw) return {};
  try {
    const u = new URL(raw);
    const bucket = u.pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || undefined;
    return { endpoint: `${u.protocol}//${u.host}`, bucket };
  } catch {
    return { endpoint: raw };
  }
}

export function objectStorageConfig(env: NodeJS.ProcessEnv = process.env): ObjectStorageConfig {
  const make = (
    source: ObjectStorageConfig['source'],
    endpointRaw: string | undefined,
    bucket: string | undefined,
    accessKeyId: string | undefined,
    secretAccessKey: string | undefined,
    region: string | undefined,
  ): ObjectStorageConfig => {
    const { endpoint, bucket: pathBucket } = splitEndpoint(endpointRaw);
    const provider: ObjectStorageConfig['provider'] = !endpoint
      ? 's3'
      : /\.r2\.cloudflarestorage\.com$/i.test(new URL(endpoint).host)
        ? 'r2'
        : 'custom';
    return {
      provider,
      source,
      endpoint,
      region: region || (endpoint ? 'auto' : 'us-east-1'),
      bucket: bucket || pathBucket,
      accessKeyId,
      secretAccessKey,
    };
  };

  const r2Account = val(env.R2_ACCOUNT_ID);
  if (val(env.S3_ENDPOINT) || r2Account || val(env.S3_ACCESS_KEY_ID) || val(env.S3_BUCKET)) {
    return make(
      'S3_*',
      val(env.S3_ENDPOINT) || (r2Account ? `https://${r2Account}.r2.cloudflarestorage.com` : undefined),
      val(env.S3_BUCKET),
      val(env.S3_ACCESS_KEY_ID),
      val(env.S3_SECRET_ACCESS_KEY),
      val(env.S3_REGION),
    );
  }
  if (val(env.CF_ENDPOINT) || val(env.CF_ACCESS_KEY_ID)) {
    return make(
      'CF_*',
      val(env.CF_ENDPOINT),
      val(env.CF_BUCKET) || val(env.R2_BUCKET),
      val(env.CF_ACCESS_KEY_ID),
      val(env.CF_SECRET_ACCESS_KEY),
      val(env.CF_REGION),
    );
  }
  return make(
    'AWS_*',
    undefined,
    val(env.AWS_BUCKET_NAME),
    val(env.AWS_ACCESS_KEY_ID) || val(env.AWS_ACCESS_KEY),
    val(env.AWS_SECRET_ACCESS_KEY) || val(env.AWS_SECRET_KEY),
    val(env.AWS_REGION),
  );
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

/** Лог-д зориулсан (нууцгүй) тайлбар — account id, түлхүүр хэвлэхгүй. */
export function describeObjectStorage(cfg: ObjectStorageConfig = objectStorageConfig()): string {
  const host = cfg.endpoint ? new URL(cfg.endpoint).host.replace(/^[^.]+/, '<account>') : 'aws';
  return `source=${cfg.source} provider=${cfg.provider} endpoint=${host} region=${cfg.region} bucket=${
    cfg.bucket ?? 'MISSING'
  } key=${cfg.accessKeyId ? 'set' : 'MISSING'} secret=${cfg.secretAccessKey ? 'set' : 'MISSING'}`;
}
