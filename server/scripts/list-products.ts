/**
 * Print every product's slug + name and its current data status (ASIN / image /
 * affiliate link). Use this to see which products still need real data, and as
 * the source of truth for the slugs to put in your CSV.
 *
 *   npm run products:list
 */
import { PrismaClient } from '@prisma/client';
import { isRealAsin, isPlaceholderImage } from '../src/lib/affiliate';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
    select: { slug: true, title: true, asin: true, image: true, affiliateUrl: true },
  });

  if (products.length === 0) {
    console.log('No products found. Did you run `npm run db:seed`?');
    return;
  }

  let needData = 0;
  console.log(`\n${products.length} products:\n`);
  for (const p of products) {
    const asinOk = isRealAsin(p.asin);
    const imgOk = !isPlaceholderImage(p.image);
    const linkOk = !!p.affiliateUrl;
    if (!asinOk || !imgOk) needData++;
    const flag = asinOk && imgOk ? '✓' : '⚠';
    console.log(
      `  ${flag} ${p.slug}\n      name: ${p.title}\n      asin: ${p.asin}${asinOk ? '' : '  (PLACEHOLDER — needs real ASIN)'}` +
        `\n      image: ${imgOk ? 'ok' : 'PLACEHOLDER — needs real image'}` +
        `\n      affiliate: ${linkOk ? p.affiliateUrl : '(none — generated once a real ASIN is set)'}`,
    );
  }
  console.log(
    `\n${needData} of ${products.length} product(s) need real ASIN/image.` +
      `\nNext: npm run products:template   →  edit my-products.csv  →  npm run products:validate  →  npm run products:bulk`,
  );
}

main()
  .catch((err) => { console.error('❌ list failed:', err); process.exit(1); })
  .finally(() => void prisma.$disconnect());
