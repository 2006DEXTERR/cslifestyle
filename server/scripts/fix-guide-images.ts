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

const prisma = new PrismaClient();

/** slug → cover image URL (real, category-matching catalog images). */
const GUIDE_COVERS: Record<string, string> = {
  'best-smartphones-under-30000': 'https://m.media-amazon.com/images/I/616-Eh2FbPL._SL1500_.jpg',
  'best-wireless-earbuds-2024': 'https://m.media-amazon.com/images/I/715ANXAamCL._SL1500_.jpg',
  'best-laptops-for-students': 'https://m.media-amazon.com/images/I/712WiT-wexL._SL1500_.jpg',
  'best-tv-buying-guide': 'https://m.media-amazon.com/images/I/815dn640DHL._SL1500_.jpg',
};

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
