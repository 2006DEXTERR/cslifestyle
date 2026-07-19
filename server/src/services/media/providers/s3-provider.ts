import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../../../config/env';
import { assertSafeKey, joinUrl, type BlobStore } from './blob-store';

/** Immutable cache header — object keys are content-hash based, so bytes never change. */
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

/**
 * Standard public URL for an S3 key. Uses AWS_S3_PUBLIC_BASE_URL (bucket website / CDN /
 * custom domain) when provided, otherwise the virtual-hosted regional endpoint. Pure
 * string building — never instantiates a client — so presenters can call it cheaply and
 * it works even for assets whose bytes live under a non-active provider.
 */
export function s3PublicUrl(key: string): string {
  const safe = assertSafeKey(key);
  const base =
    env.AWS_S3_PUBLIC_BASE_URL && env.AWS_S3_PUBLIC_BASE_URL.trim()
      ? env.AWS_S3_PUBLIC_BASE_URL
      : `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com`;
  return joinUrl(base, safe);
}

/**
 * AWS S3 blob store (SDK v3). Credentials are backend-only. No ACLs are set — access is
 * controlled by the bucket policy / CDN, so the IAM user can be restricted to
 * put/delete on one bucket and the bucket needs no public-write.
 */
export class S3BlobStore implements BlobStore {
  readonly provider = 's3' as const;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    if (!env.AWS_REGION || !env.AWS_S3_BUCKET || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('S3 storage selected but AWS_REGION/AWS_S3_BUCKET/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY are not all set');
    }
    this.bucket = env.AWS_S3_BUCKET;
    this.client = new S3Client({
      region: env.AWS_REGION,
      credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: assertSafeKey(key),
        Body: body,
        ContentType: contentType,
        CacheControl: IMMUTABLE_CACHE,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    // S3 DeleteObject is idempotent (deleting a missing key succeeds). Deletion uses the
    // stored object key — never a parsed public URL.
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: assertSafeKey(key) }));
  }

  publicUrl(key: string): string {
    return s3PublicUrl(key);
  }
}
