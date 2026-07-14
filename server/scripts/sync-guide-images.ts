/**
 * Sync buying-guide cover images to the canonical source (prisma/guide-images.ts).
 *
 * - Matches EXISTING guides by their unique `slug` (never creates/deletes a guide).
 * - Sets ONLY Guide.coverImage to the canonical URL — nothing else is touched.
 * - Preserves the EXACT canonical URL — never guesses or substitutes.
 * - Reports guides missing from the canonical map (left unchanged, not invented).
 * - Rebuilds the search index (guide cards in search carry coverImage) and invalidates
 *   the guide / homepage / category / search caches. Redis is opened explicitly first;
 *   if it is unavailable the DB change still stands and a clear TTL/restart warning prints.
 *
 * Usage (from server/):  npm run guides:sync-images   [-- --check]
 *   --check = dry run (report only, no writes, no cache/index changes)
 */
import { PrismaClient } from '@prisma/client';
import { GUIDE_IMAGES } from '../prisma/guide-images';
import { bust } from '../src/lib/cache';
import { connectRedis, closeRedis, redis } from '../src/lib/redis';
import { rebuildIndex } from '../src/services/discovery/index.service';

const STALE_HINTS = ['pexels.com', 'placeholder', 'via.placeholder', 'unsplash', 'example.com'];
const isStale = (url: string | null | undefined): boolean =>
  !url || STALE_HINTS.some((h) => url.toLowerCase().includes(h));

/**
 * Invalidate every cache group that can embed a guide cover image, after a DB change.
 * In a standalone script the shared Redis client is lazy + never connected, so bust()
 * would silently no-op; we connect + await first. If Redis is unavailable we warn and
 * return WITHOUT throwing — the guide rows were already updated and must not roll back.
 */
async function invalidateGuideCaches(): Promise<void> {
  try {
    await connectRedis();
  } catch {
    /* handled by the readiness check below */
  }
  if (redis.status !== 'ready') {
    console.log(
      '\n[cache] ⚠ Redis unavailable — PostgreSQL WAS updated, but cached API responses ' +
        '(guides list/detail, homepage, category guide sections, search) may remain STALE ' +
        'until each key’s TTL expires (guides ~180s, suggestions ~45s) or the backend restarts.',
    );
    return;
  }
  await bust.guides(); // guide:* (list + detail), sugg:* (search suggestions), admin:overview
  console.log('\n[cache] ✓ invalidated guide list/detail, search-suggestion and overview caches.');
}

async function main() {
  const dryRun = process.argv.includes('--check');
  const prisma = new PrismaClient();

  const guides = await prisma.guide.findMany({ orderBy: { slug: 'asc' }, select: { id: true, slug: true, coverImage: true } });

  let updated = 0;
  let already = 0;
  const missing: string[] = [];

  console.log(`\n=== Guide cover-image sync (${dryRun ? 'DRY RUN' : 'APPLY'}) — ${guides.length} guides ===`);

  for (const g of guides) {
    const canonical = GUIDE_IMAGES[g.slug];
    console.log(`\n--- ${g.slug} ---`);
    console.log(`  BEFORE  coverImage : ${g.coverImage ?? '(null)'}`);

    if (!canonical) {
      console.log(`  ⚠  NOT in guide-images.ts — left unchanged (no invented URL).`);
      missing.push(g.slug);
      continue;
    }

    if (g.coverImage === canonical) {
      console.log(`  ✓  already canonical — no change.`);
      already += 1;
      continue;
    }

    if (!dryRun) {
      await prisma.guide.update({ where: { id: g.id }, data: { coverImage: canonical } });
      const after = await prisma.guide.findUnique({ where: { id: g.id }, select: { coverImage: true } });
      console.log(`  AFTER   coverImage : ${after?.coverImage}`);
      console.log(`  ✓  UPDATED to canonical.`);
    } else {
      console.log(`  →  WOULD UPDATE to: ${canonical}`);
    }
    updated += 1;
  }

  if (!dryRun && updated > 0) {
    // Search results embed coverImage — refresh the persisted index, then bust caches.
    try {
      const { indexed } = await rebuildIndex();
      console.log(`\n[search] rebuilt discovery index (${indexed} entries) so search shows fresh guide covers.`);
    } catch (e) {
      console.log(`\n[search] index rebuild skipped: ${String(e)}`);
    }
    await invalidateGuideCaches();
  }

  // Verify no stale URLs remain for guides that HAVE a canonical entry.
  const post = await prisma.guide.findMany({ select: { slug: true, coverImage: true } });
  const stillStale = post.filter((g) => GUIDE_IMAGES[g.slug] && isStale(g.coverImage));

  console.log(`\n==== SUMMARY ====`);
  console.log(`  ${dryRun ? 'would update' : 'updated'} : ${updated}`);
  console.log(`  already canonical  : ${already}`);
  console.log(`  missing from canonical (unchanged) : ${missing.length}${missing.length ? ` -> ${missing.join(', ')}` : ''}`);
  console.log(`  guides with stale (pexels/placeholder) covers remaining (that have a canonical entry): ${stillStale.length}`);
  if (stillStale.length && !dryRun) {
    console.log(`  ✗ STALE REMAINING: ${stillStale.map((g) => g.slug).join(', ')}`);
    process.exitCode = 2;
  } else if (!dryRun) {
    console.log(`  ✓ No Pexels/placeholder/old covers remain for canonical guides.`);
  }

  await closeRedis();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('GUIDE_SYNC_ERR', e);
  process.exit(1);
});
