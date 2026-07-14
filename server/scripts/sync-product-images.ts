/**
 * Sync product images to the canonical source (prisma/product-images.ts).
 *
 * - Matches EXISTING products by their unique `slug` (never creates duplicates).
 * - Sets Product.image + gallery to the canonical URL and rebuilds ProductImage so
 *   there is exactly ONE row with the canonical URL at sortOrder 0 (the primary).
 * - Deletes stale Pexels / placeholder / old ProductImage rows.
 * - Preserves the EXACT canonical URL — never guesses or substitutes.
 * - Reports products missing from the canonical map (left unchanged, not invented).
 * - Invalidates Redis product/comparison caches (no-op when Redis is not connected).
 *
 * Usage (from server/):  npm run products:sync-images   [-- --check]
 *   --check = dry run (report only, no writes)
 */
import { PrismaClient } from '@prisma/client';
import { PRODUCT_IMAGES } from '../prisma/product-images';
import { bust } from '../src/lib/cache';
import { connectRedis, closeRedis, redis } from '../src/lib/redis';

/**
 * Invalidate every product-image-bearing cache group after a successful DB sync.
 *
 * In the running backend Redis is opened at startup; in a standalone script the shared
 * client is lazy and NEVER connected, so bust() would silently no-op and the backend
 * would keep serving stale cached images until TTL/restart. We therefore explicitly
 * connect + await Redis first. If Redis is genuinely unavailable we warn clearly and
 * return WITHOUT throwing — the PostgreSQL sync has already committed and must not be
 * rolled back just because the cache could not be cleared.
 */
async function invalidateImageCaches(): Promise<void> {
  try {
    await connectRedis();
  } catch {
    /* handled by the readiness check below */
  }
  if (redis.status !== 'ready') {
    console.log(
      '\n[cache] ⚠ Redis unavailable — PostgreSQL WAS updated, but cached API responses ' +
        '(product list/detail, homepage, category, brand, search, comparisons, guides) may ' +
        'remain STALE until each key’s TTL expires or the backend is restarted.',
    );
    return;
  }
  await bust.productImages();
  console.log(
    '\n[cache] ✓ invalidated product list/detail, category, brand, search, comparison and guide caches.',
  );
}

const STALE_HINTS = ['pexels.com', 'placeholder', 'via.placeholder', 'example.com', '/brands/'];
const isStale = (url: string | null | undefined): boolean =>
  !url || STALE_HINTS.some((h) => url.toLowerCase().includes(h));

const rows = (imgs: { sortOrder: number; imageUrl: string }[]): string =>
  imgs.length ? imgs.map((i) => `[${i.sortOrder}] ${i.imageUrl}`).join(' | ') : '(none)';

async function main() {
  const dryRun = process.argv.includes('--check');
  const prisma = new PrismaClient();

  const products = await prisma.product.findMany({
    include: { images: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { slug: 'asc' },
  });

  let updated = 0;
  let already = 0;
  const missing: string[] = [];

  console.log(`\n=== Product image sync (${dryRun ? 'DRY RUN' : 'APPLY'}) — ${products.length} products ===`);

  for (const p of products) {
    const canonical = PRODUCT_IMAGES[p.slug];
    console.log(`\n--- ${p.slug}  (asin=${p.asin}) ---`);
    console.log(`  BEFORE  Product.image : ${p.image ?? '(null)'}`);
    console.log(`  BEFORE  ProductImage  : ${rows(p.images)}`);

    if (!canonical) {
      console.log(`  ⚠  NOT in product-images.ts — left unchanged (no invented URL).`);
      missing.push(p.slug);
      continue;
    }

    const alreadyCanonical =
      p.image === canonical &&
      p.images.length === 1 &&
      p.images[0].imageUrl === canonical &&
      p.images[0].sortOrder === 0;

    if (alreadyCanonical) {
      console.log(`  ✓  already canonical — no change.`);
      already += 1;
      continue;
    }

    if (!dryRun) {
      await prisma.$transaction([
        prisma.product.update({ where: { id: p.id }, data: { image: canonical, gallery: [canonical] } }),
        prisma.productImage.deleteMany({ where: { productId: p.id } }),
        prisma.productImage.create({ data: { productId: p.id, imageUrl: canonical, sortOrder: 0 } }),
      ]);
      const after = await prisma.productImage.findMany({ where: { productId: p.id }, orderBy: { sortOrder: 'asc' } });
      const afterP = await prisma.product.findUnique({ where: { id: p.id }, select: { image: true } });
      console.log(`  AFTER   Product.image : ${afterP?.image}`);
      console.log(`  AFTER   ProductImage  : ${rows(after)}`);
      console.log(`  ✓  UPDATED to canonical (primary = sortOrder 0).`);
    } else {
      console.log(`  →  WOULD UPDATE to: ${canonical}`);
    }
    updated += 1;
  }

  if (!dryRun && updated > 0) {
    await invalidateImageCaches();
  }

  // Verify no stale URLs remain for products that HAVE a canonical entry.
  const post = await prisma.product.findMany({ include: { images: true } });
  const stillStale = post.filter(
    (p) => PRODUCT_IMAGES[p.slug] && (isStale(p.image) || p.images.some((i) => isStale(i.imageUrl))),
  );

  console.log(`\n==== SUMMARY ====`);
  console.log(`  ${dryRun ? 'would update' : 'updated'} : ${updated}`);
  console.log(`  already canonical  : ${already}`);
  console.log(`  missing from canonical (unchanged) : ${missing.length}${missing.length ? ` -> ${missing.join(', ')}` : ''}`);
  console.log(`  products with stale (pexels/placeholder) URLs remaining (that have a canonical entry): ${stillStale.length}`);
  if (stillStale.length && !dryRun) {
    console.log(`  ✗ STALE REMAINING: ${stillStale.map((p) => p.slug).join(', ')}`);
    process.exitCode = 2;
  } else if (!dryRun) {
    console.log(`  ✓ No Pexels/placeholder/old URLs remain for canonical products.`);
  }

  // Close both connections cleanly so the standalone process exits without hanging.
  // (--check never connects Redis, so this is a safe no-op there.)
  await closeRedis();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('SYNC_ERR', e);
  process.exit(1);
});
