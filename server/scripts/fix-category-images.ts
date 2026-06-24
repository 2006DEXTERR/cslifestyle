/**
 * Set category cover images by reusing the REAL product image already stored in the
 * DB for a representative product in that category. Fixes the seeded stock category
 * covers that were broken (404) or wrong-subject. Safe + non-destructive + idempotent:
 *
 *   - Updates ONLY `Category.image`, matched by `slug`.
 *   - Sources each image from an existing `Product.image` (no invented/external URLs).
 *   - Never creates/deletes any row; never modifies products; never seeds.
 *   - Re-running is a no-op once values already match (reports "already set").
 *
 * Categories WITHOUT a matching catalog product (home-appliances, gaming, tablets,
 * fitness) are intentionally left unchanged and reported as pending.
 *
 *   npm run categories:fix-images
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** categorySlug → representative productSlug (whose real DB image is reused). */
const CATEGORY_SOURCE: Record<string, string> = {
  smartphones: 'iphone-15-pro-max', // iPhone 17 Pro Max
  laptops: 'macbook-pro-14-m3', // MacBook Pro
  earbuds: 'boat-airdotes-pro-4', // boAt Airdopes 181 Pro
  smartwatches: 'apple-watch-ultra-2', // Apple Watch Ultra 2
  cameras: 'sony-zv-e10-ii', // Sony Alpha ZV-E10M2
  televisions: 'lg-c3-oled-55', // LG OLED55B46LA
};

/** Categories with no matching catalog product — left unchanged on purpose. */
const PENDING = ['home-appliances', 'gaming', 'tablets', 'fitness'];

async function main(): Promise<void> {
  let updated = 0,
    unchanged = 0,
    skipped = 0;

  for (const [categorySlug, productSlug] of Object.entries(CATEGORY_SOURCE)) {
    const [category, product] = await Promise.all([
      prisma.category.findUnique({ where: { slug: categorySlug }, select: { id: true, image: true } }),
      prisma.product.findUnique({ where: { slug: productSlug }, select: { image: true } }),
    ]);

    if (!category) {
      skipped++;
      console.log(`  ✗ ${categorySlug} — no category with this slug (skipped)`);
      continue;
    }
    if (!product?.image) {
      skipped++;
      console.log(`  ✗ ${categorySlug} — source product "${productSlug}" has no image (skipped)`);
      continue;
    }
    if (category.image === product.image) {
      unchanged++;
      console.log(`  · ${categorySlug} — already set (no change)`);
      continue;
    }
    // Scoped to exactly this category's image — products are never touched.
    await prisma.category.update({ where: { id: category.id }, data: { image: product.image } });
    updated++;
    console.log(`  ✓ ${categorySlug} — image set from product "${productSlug}"`);
  }

  console.log(`\nSummary: ${updated} updated, ${unchanged} already set, ${skipped} skipped.`);
  console.log(`Pending (no catalog match, left unchanged): ${PENDING.join(', ')}`);
}

main()
  .catch((err) => { console.error('❌ fix-category-images failed:', err); process.exit(1); })
  .finally(() => void prisma.$disconnect());
