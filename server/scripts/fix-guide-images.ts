/**
 * Set the cover image for the four guides whose seeded stock images were broken
 * (404) or wrong-subject. Safe + non-destructive + idempotent:
 *
 *   - Updates ONLY `Guide.coverImage`, matched by `slug`.
 *   - Never creates/deletes any row; never touches products; never seeds.
 *   - Re-running is a no-op once values are already set (reports "already set").
 *
 *   npm run guides:fix-images
 */
import { PrismaClient } from '@prisma/client';
import { GUIDE_IMAGES } from '../prisma/guide-images';

const prisma = new PrismaClient();

/**
 * slug → cover image URL. Sourced from the single canonical map (prisma/guide-images.ts)
 * so this legacy command can never drift from `guides:sync-images` or the seed.
 * For full sync (search reindex + cache invalidation) prefer `npm run guides:sync-images`.
 */
const GUIDE_COVERS: Record<string, string> = GUIDE_IMAGES;

async function main(): Promise<void> {
  let updated = 0,
    unchanged = 0,
    missing = 0;

  for (const [slug, coverImage] of Object.entries(GUIDE_COVERS)) {
    const guide = await prisma.guide.findUnique({ where: { slug }, select: { id: true, coverImage: true } });
    if (!guide) {
      missing++;
      console.log(`  ✗ ${slug} — no guide with this slug (skipped)`);
      continue;
    }
    if (guide.coverImage === coverImage) {
      unchanged++;
      console.log(`  · ${slug} — already set (no change)`);
      continue;
    }
    // Scoped to exactly this guide's coverImage — nothing else is touched.
    await prisma.guide.update({ where: { id: guide.id }, data: { coverImage } });
    updated++;
    console.log(`  ✓ ${slug} — coverImage updated`);
  }

  console.log(`\nSummary: ${updated} updated, ${unchanged} already set, ${missing} missing of ${Object.keys(GUIDE_COVERS).length}.`);
}

main()
  .catch((err) => { console.error('❌ fix-guide-images failed:', err); process.exit(1); })
  .finally(() => void prisma.$disconnect());
