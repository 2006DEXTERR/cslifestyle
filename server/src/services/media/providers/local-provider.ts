import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from '../../../config/env';
import { ApiError } from '../../../lib/http';
import { assertSafeKey, type BlobStore } from './blob-store';

/**
 * Absolute path of the local upload root (UPLOAD_DIR, resolved against cwd when relative).
 * Exported because Express mounts it as the static `/uploads` directory.
 */
export function uploadRoot(): string {
  return path.isAbsolute(env.UPLOAD_DIR) ? env.UPLOAD_DIR : path.resolve(process.cwd(), env.UPLOAD_DIR);
}

/** Public URL for a local key: `${MEDIA_BASE_URL}/uploads/${key}` (same-origin when base is ''). */
export function localPublicUrl(key: string): string {
  const base = env.MEDIA_BASE_URL.replace(/\/$/, '');
  return `${base}/uploads/${key.replace(/^\/+/, '')}`;
}

/** Local-disk blob store. Files live under {uploadRoot}/{key}, served at /uploads. */
export class LocalBlobStore implements BlobStore {
  readonly provider = 'local' as const;

  private resolve(key: string): string {
    const safe = assertSafeKey(key);
    const root = uploadRoot();
    const abs = path.resolve(root, safe);
    // Defence-in-depth: the resolved path must stay inside the upload root.
    if (abs !== root && !abs.startsWith(root + path.sep)) {
      throw ApiError.badRequest('Invalid storage key');
    }
    return abs;
  }

  async put(key: string, body: Buffer, _contentType: string): Promise<void> {
    const abs = this.resolve(key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, body);
  }

  async delete(key: string): Promise<void> {
    // force:true → deleting a missing file never throws (safe for cleanup workflows).
    await fs.rm(this.resolve(key), { force: true }).catch(() => undefined);
  }

  publicUrl(key: string): string {
    return localPublicUrl(assertSafeKey(key));
  }
}
