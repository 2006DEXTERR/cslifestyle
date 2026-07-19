import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { logger } from '../../lib/logger';
import { blobStore, blobStoreFor, activeProvider, publicUrlFor, type StorageProviderName } from './providers';
import { uploadRoot } from './providers/local-provider';

/**
 * Media storage + optimization (Phase 10). The BINARY operations (put/delete/url) are
 * delegated to the active storage provider (local disk or AWS S3, chosen by STORAGE_DRIVER)
 * — see ./providers. The sharp pipeline below (webp copy, thumbnail, responsive sizes) is
 * provider-agnostic and runs once for every backend. Content-hash (SHA-256) gives stable,
 * non-user-controlled keys and duplicate detection.
 */

// Re-exported so Express can mount the local upload dir as static `/uploads`.
export { uploadRoot };

export const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

export const RESPONSIVE_WIDTHS = [640, 1024, 1600];
const THUMB_WIDTH = 320;

export interface OptimizeResult {
  provider: StorageProviderName;
  width: number | null;
  height: number | null;
  storagePath: string;
  variants: { thumbnail: string | null; webp: string | null; sizes: { w: number; path: string }[] };
}

export function hashBuffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Public URL for a stored key under the given provider. Defaults to `local` so legacy
 * rows (created before storageProvider existed) resolve to their `/uploads/...` URL.
 */
export function publicUrl(relPath: string | null, provider: StorageProviderName = 'local'): string | null {
  return publicUrlFor(provider, relPath);
}

/** Store an uploaded image + generate optimized variants via the active provider. */
export async function storeAndOptimize(buffer: Buffer, mime: string, hash: string): Promise<OptimizeResult> {
  const store = blobStore();
  const provider = activeProvider();
  const ext = ALLOWED_MIME[mime] ?? 'bin';
  const storagePath = `${hash}.${ext}`;
  await store.put(storagePath, buffer, mime);

  // SVG: vector — store as-is, no raster variants.
  if (ext === 'svg') {
    return { provider, width: null, height: null, storagePath, variants: { thumbnail: null, webp: null, sizes: [] } };
  }

  let width: number | null = null;
  let height: number | null = null;
  const variants: OptimizeResult['variants'] = { thumbnail: null, webp: null, sizes: [] };

  try {
    const img = sharp(buffer, { failOn: 'none' });
    const meta = await img.metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;

    // Full-size webp.
    const webpRel = `${hash}.webp`;
    await store.put(webpRel, await sharp(buffer).webp({ quality: 82 }).toBuffer(), 'image/webp');
    variants.webp = webpRel;

    // Thumbnail (webp).
    const thumbRel = `${hash}_thumb.webp`;
    await store.put(thumbRel, await sharp(buffer).resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), 'image/webp');
    variants.thumbnail = thumbRel;

    // Responsive sizes ≤ original width.
    for (const w of RESPONSIVE_WIDTHS) {
      if (width && w >= width) continue;
      const rel = `${hash}_${w}.webp`;
      await store.put(rel, await sharp(buffer).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), 'image/webp');
      variants.sizes.push({ w, path: rel });
    }
  } catch (err) {
    logger.warn({ err, hash }, 'image optimization failed — original stored without variants');
  }

  return { provider, width, height, storagePath, variants };
}

/**
 * Delete an asset's original + all variant objects (best-effort) from the provider that
 * actually holds them. A cleanup failure is logged, never thrown, so it can't corrupt the
 * primary DB operation.
 */
export async function deleteFiles(
  storagePath: string,
  variants: OptimizeResult['variants'] | null,
  provider: StorageProviderName = 'local',
): Promise<void> {
  const rels = [storagePath, variants?.thumbnail, variants?.webp, ...(variants?.sizes ?? []).map((s) => s.path)].filter(Boolean) as string[];
  const store = blobStoreFor(provider);
  await Promise.all(
    rels.map((rel) => store.delete(rel).catch((err) => logger.warn({ err, rel, provider }, 'media cleanup: object delete failed'))),
  );
}
