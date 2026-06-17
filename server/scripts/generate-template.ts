/**
 * Generate a ready-to-edit `my-products.csv` from the live database — one row per
 * product, with `slug` + `name` prefilled. Fields that already hold real data are
 * kept; fields that still need real data are marked `NEEDS_ASIN` / `NEEDS_IMAGE`.
 * `affiliateUrl` is left blank (it is auto-generated from the ASIN on apply).
 *
 *   npm run products:template            # writes ./my-products.csv
 *   npm run products:template -- --force # overwrite an existing file
 *
 * Then paste real ASINs + image URLs into the marked cells and run:
 *   npm run products:validate  &&  npm run products:bulk
 */
import { writeFileSync, existsSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { isRealAsin, isPlaceholderImage } from '../src/lib/affiliate';

const prisma = new PrismaClient();
const OUT = 'my-products.csv';

/** RFC-4180 quote a cell when it contains a comma, quote or newline. */
function csv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  if (existsSync(OUT) && !force) {
    console.error(`${OUT} already exists. Re-run with --force to overwrite (you will lose any edits):\n  npm run products:template -- --force`);
    process.exit(2);
  }

  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
    select: { slug: true, title: true, asin: true, image: true },
  });
  if (products.length === 0) {
    console.error('No products found. Run `npm run db:seed` first.');
    process.exit(2);
  }

  const lines = ['slug,name,asin,image,affiliateUrl'];
  let needData = 0;
  for (const p of products) {
    const asin = isRealAsin(p.asin) ? p.asin : 'NEEDS_ASIN';
    const image = isPlaceholderImage(p.image) ? 'NEEDS_IMAGE' : p.image;
    if (asin === 'NEEDS_ASIN' || image === 'NEEDS_IMAGE') needData++;
    // affiliateUrl intentionally blank — generated from the ASIN on apply.
    lines.push([csv(p.slug), csv(p.title), csv(asin), csv(image), ''].join(','));
  }

  writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
  console.log(
    `✓ Wrote ${OUT} with ${products.length} products (${needData} need real ASIN/image).\n\n` +
      `Next:\n` +
      `  1. Open ${OUT} and replace every NEEDS_ASIN / NEEDS_IMAGE with the real value.\n` +
      `     (Leave affiliateUrl blank — it is generated automatically.)\n` +
      `  2. npm run products:validate\n` +
      `  3. npm run products:bulk`,
  );
}

main()
  .catch((err) => { console.error('❌ template generation failed:', err); process.exit(1); })
  .finally(() => void prisma.$disconnect());
