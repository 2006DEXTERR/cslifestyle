import path from 'node:path';
import { ApiError } from '../../../lib/http';

/**
 * Blob-store provider abstraction for the Media Library.
 *
 * The seam is at the BLOB level (put/delete/url of a hash-based key) rather than a single
 * "upload one file" call, because one uploaded asset produces MANY objects (original +
 * webp + thumbnail + responsive variants) through the shared sharp pipeline. Keeping the
 * seam here means the optimization logic is written ONCE and works for every provider.
 *
 * Keys are always server-generated content-hash paths (e.g. "ab12cd.webp" or
 * "products/ab12cd.webp") — never user-controlled — so object names can't be poisoned.
 */
export type StorageProviderName = 'local' | 's3';

export interface BlobStore {
  readonly provider: StorageProviderName;
  /** Store bytes at a relative key. Creates any parent folders as needed. */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Delete the object at key. A missing object MUST NOT throw (idempotent cleanup). */
  delete(key: string): Promise<void>;
  /** Public URL for a stored key. */
  publicUrl(key: string): string;
}

/**
 * Reject any key that could escape the storage root or was not server-generated.
 * Allows nested folders ("products/ab12.webp") but no traversal, absolute paths, or NUL.
 */
export function assertSafeKey(key: string): string {
  if (
    !key ||
    key.includes('..') ||
    key.includes('\0') ||
    key.startsWith('/') ||
    key.startsWith('\\') ||
    path.isAbsolute(key) ||
    /^[a-zA-Z]:/.test(key) // Windows drive prefix
  ) {
    throw ApiError.badRequest('Invalid storage key');
  }
  return key;
}

/** Join a base URL and key with exactly one slash between them (no duplicate slashes). */
export function joinUrl(base: string, key: string): string {
  return `${base.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
}
