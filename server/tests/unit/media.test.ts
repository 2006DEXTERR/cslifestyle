import { describe, it, expect, afterAll } from 'vitest';
import sharp from 'sharp';
import { ALLOWED_MIME, hashBuffer, publicUrl, storeAndOptimize, deleteFiles } from '../../src/services/media/storage';
import { isAllowedMime } from '../../src/services/media/media.service';

const created: { storagePath: string; variants: { thumbnail: string | null; webp: string | null; sizes: { w: number; path: string }[] } }[] = [];
afterAll(async () => {
  for (const c of created) await deleteFiles(c.storagePath, c.variants);
});

describe('media storage helpers', () => {
  it('allows exactly jpg/jpeg/png/webp/avif/svg', () => {
    expect(Object.keys(ALLOWED_MIME).sort()).toEqual(['image/avif', 'image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp']);
    expect(isAllowedMime('image/png')).toBe(true);
    expect(isAllowedMime('image/avif')).toBe(true);
    expect(isAllowedMime('image/gif')).toBe(false);
    expect(isAllowedMime('application/pdf')).toBe(false);
  });

  it('hashes deterministically (duplicate detection)', () => {
    const a = Buffer.from('hello');
    expect(hashBuffer(a)).toBe(hashBuffer(Buffer.from('hello')));
    expect(hashBuffer(a)).not.toBe(hashBuffer(Buffer.from('world')));
    expect(hashBuffer(a)).toHaveLength(64);
  });

  it('builds same-origin public URLs', () => {
    expect(publicUrl('abc.png')).toBe('/uploads/abc.png');
    expect(publicUrl(null)).toBeNull();
  });
});

describe('image optimization (sharp)', () => {
  it('reads dimensions + generates webp, thumbnail and responsive variants', async () => {
    const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#abcdef' } }).png().toBuffer();
    const hash = hashBuffer(png);
    const result = await storeAndOptimize(png, 'image/png', hash);
    created.push({ storagePath: result.storagePath, variants: result.variants });

    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.storagePath).toBe(`${hash}.png`);
    expect(result.variants.webp).toBe(`${hash}.webp`);
    expect(result.variants.thumbnail).toBe(`${hash}_thumb.webp`);
    // 640 < 800 → generated; 1024/1600 ≥ 800 → skipped.
    expect(result.variants.sizes.map((s) => s.w)).toEqual([640]);
  });

  it('stores SVG as-is with no raster variants', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
    const hash = hashBuffer(svg);
    const result = await storeAndOptimize(svg, 'image/svg+xml', hash);
    created.push({ storagePath: result.storagePath, variants: result.variants });

    expect(result.storagePath).toBe(`${hash}.svg`);
    expect(result.variants.webp).toBeNull();
    expect(result.variants.sizes).toEqual([]);
  });
});
