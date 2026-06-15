import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

/**
 * Media storage + optimization (Phase 10). Files live on disk under UPLOAD_DIR (served
 * at `/uploads`). For raster images sharp generates a webp copy, a thumbnail, and
 * responsive sizes, and reads dimensions. SVGs are stored as-is (vector — no variants).
 * Content-hash (SHA-256) enables duplicate detection + stable filenames.
 */

export const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export const RESPONSIVE_WIDTHS = [640, 1024, 1600];
const THUMB_WIDTH = 320;

export interface OptimizeResult {
  width: number | null;
  height: number | null;
  storagePath: string;
  variants: { thumbnail: string | null; webp: string | null; sizes: { w: number; path: string }[] };
}

export function uploadRoot(): string {
  return path.isAbsolute(env.UPLOAD_DIR) ? env.UPLOAD_DIR : path.resolve(process.cwd(), env.UPLOAD_DIR);
}

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(uploadRoot(), { recursive: true });
}

export function hashBuffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

/** Public URL for a stored relative path. */
export function publicUrl(relPath: string | null): string | null {
  if (!relPath) return null;
  const base = env.MEDIA_BASE_URL.replace(/\/$/, '');
  return `${base}/uploads/${relPath}`;
}

const write = async (rel: string, buf: Buffer): Promise<void> => {
  await fs.writeFile(path.join(uploadRoot(), rel), buf);
};

/** Store an uploaded image + generate optimized variants. */
export async function storeAndOptimize(buffer: Buffer, mime: string, hash: string): Promise<OptimizeResult> {
  await ensureUploadDir();
  const ext = ALLOWED_MIME[mime] ?? 'bin';
  const storagePath = `${hash}.${ext}`;
  await write(storagePath, buffer);

  // SVG: vector — store as-is, no raster variants.
  if (ext === 'svg') {
    return { width: null, height: null, storagePath, variants: { thumbnail: null, webp: null, sizes: [] } };
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
    await write(webpRel, await sharp(buffer).webp({ quality: 82 }).toBuffer());
    variants.webp = webpRel;

    // Thumbnail (webp).
    const thumbRel = `${hash}_thumb.webp`;
    await write(thumbRel, await sharp(buffer).resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer());
    variants.thumbnail = thumbRel;

    // Responsive sizes ≤ original width.
    for (const w of RESPONSIVE_WIDTHS) {
      if (width && w >= width) continue;
      const rel = `${hash}_${w}.webp`;
      await write(rel, await sharp(buffer).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer());
      variants.sizes.push({ w, path: rel });
    }
  } catch (err) {
    logger.warn({ err, hash }, 'image optimization failed — original stored without variants');
  }

  return { width, height, storagePath, variants };
}

/** Delete an asset's original + all variant files (best-effort). */
export async function deleteFiles(storagePath: string, variants: OptimizeResult['variants'] | null): Promise<void> {
  const rels = [storagePath, variants?.thumbnail, variants?.webp, ...(variants?.sizes ?? []).map((s) => s.path)].filter(Boolean) as string[];
  await Promise.all(rels.map((rel) => fs.rm(path.join(uploadRoot(), rel), { force: true }).catch(() => undefined)));
}
