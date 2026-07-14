/**
 * Sync canonical product data (server/my-products.csv) into PostgreSQL in place.
 *
 * Canonical fields (the only ones the owner maintains): name→title, asin, image
 * (→ image + gallery + one ProductImage row), and affiliateUrl DERIVED from the ASIN.
 * Every other product field (price, description, specs, rating, flags, …) has no
 * canonical value and is PRESERVED untouched — never invented, never overwritten.
 *
 * - Matches an existing product by stable id, in priority order: ASIN → slug → id.
 *   (Never creates or deletes a product; no duplicates.)
 * - Only writes fields that have an explicit canonical value AND differ from the DB.
 * - Rebuilds ProductImage to a single canonical row (sortOrder 0) when the image changes.
 * - Reports products whose canonical data is missing, and fields with no canonical value.
 * - Invalidates product caches via the existing bust helper (Redis opened explicitly;
 *   if unavailable the DB write still stands and a TTL/restart warning is printed).
 *
 * Usage (from server/):  npm run products:sync-canonical   [-- --check]
 *   --check = dry run (report + field-by-field diff, NO writes, NO cache changes)
 */
import { PrismaClient } from '@prisma/client';
import { products as mockProducts } from '../../lib/data';
import { CANONICAL_PRODUCTS } from '../prisma/canonical-products';
import { resolveAffiliateUrl } from '../src/lib/affiliate';
import { replaceProductNames } from '../src/lib/comparison-canonical';
import { env } from '../src/config/env';
import { bust } from '../src/lib/cache';
import { connectRedis, closeRedis, redis } from '../src/lib/redis';
import { rebuildIndex } from '../src/services/discovery/index.service';

/** Global old→canonical full-name pairs, so prose fields that name a renamed product get
 *  the current name (exact-match swap only — never invents or rewrites editorial claims). */
const NAME_PAIRS: Array<[string, string]> = mockProducts
  .map((p): [string, string] => [p.name, CANONICAL_PRODUCTS[p.slug]?.name ?? p.name])
  .filter(([o, n]) => o !== n);

/** Prose fields kept as-is except that old product names are normalized to canonical. */
const PROSE_FIELDS = ['shortDescription', 'description', 'seoTitle', 'metaDescription'] as const;

/** Fields that have NO canonical source — always preserved, reported for transparency.
 *  (Prose fields — shortDescription/description/seoTitle/metaDescription — are preserved too,
 *   except old product names in them are normalized to canonical; see PROSE_FIELDS.) */
const PRESERVED_FIELDS = [
  'brand', 'category', 'currentPrice', 'originalPrice',
  'discountPercent', 'availability', 'rating', 'reviewCount', 'features', 'highlights',
  'specifications', 'pros', 'cons', 'faqs', 'keywords',
  'isPublished', 'isTrending', 'isEditorsPick', 'dealExpiresIn', 'dealSavings',
];

const AFF = { tag: env.AMAZON_ASSOCIATE_TAG, domain: env.AMAZON_DOMAIN };

async function invalidateProductCaches(): Promise<void> {
  try {
    await connectRedis();
  } catch {
    /* handled below */
  }
  if (redis.status !== 'ready') {
    console.log(
      '\n[cache] ⚠ Redis unavailable — PostgreSQL WAS updated, but cached API responses ' +
        '(product list/detail, homepage, category, brand, search suggestions, comparisons) may ' +
        'remain STALE until each key’s TTL expires (product list ~120s, detail ~300s, ' +
        'suggestions ~45s) or the backend is restarted.',
    );
    return;
  }
  await bust.products(); // prod:* (list+detail), cat:*, brand:*, sugg:*, admin:overview
  await bust.comparisons(); // comp:* — comparison cards embed product name/image
  console.log('\n[cache] ✓ invalidated product list/detail, category, brand, search and comparison caches.');
}

interface FieldChange { field: string; before: unknown; after: unknown; }

async function main() {
  const dryRun = process.argv.includes('--check');
  const prisma = new PrismaClient();

  const dbProducts = await prisma.product.findMany({ include: { images: { orderBy: { sortOrder: 'asc' } } } });
  const byAsin = new Map(dbProducts.map((p) => [p.asin, p]));
  const bySlug = new Map(dbProducts.map((p) => [p.slug, p]));

  const canonicalEntries = Object.values(CANONICAL_PRODUCTS);
  console.log(`\n=== Canonical product sync (${dryRun ? 'DRY RUN' : 'APPLY'}) — ${canonicalEntries.length} canonical rows, ${dbProducts.length} DB products ===`);

  let updated = 0;
  let already = 0;
  const missing: string[] = [];
  const perProduct: { slug: string; matchedBy: string; changes: FieldChange[]; noCanonical: string[] }[] = [];

  for (const canon of canonicalEntries) {
    // Match priority: ASIN → slug → id (id == slug fallback here; CSV has no separate id).
    const matchedBy = canon.asin && byAsin.has(canon.asin) ? 'asin' : bySlug.has(canon.slug) ? 'slug' : '';
    const product = matchedBy === 'asin' ? byAsin.get(canon.asin!)! : bySlug.get(canon.slug);

    if (!product) {
      missing.push(canon.slug);
      console.log(`\n--- ${canon.slug} ---\n  ⚠  no DB product matches this canonical row (by ASIN or slug) — left as-is (not invented).`);
      continue;
    }

    // Duplicate-ASIN guard (asin is unique) — never repoint two products to one ASIN.
    if (canon.asin && canon.asin !== product.asin) {
      const clash = byAsin.get(canon.asin);
      if (clash && clash.id !== product.id) {
        console.log(`\n--- ${canon.slug} ---\n  ✗ SKIP — ASIN ${canon.asin} already used by "${clash.slug}".`);
        continue;
      }
    }

    const changes: FieldChange[] = [];
    const data: Record<string, unknown> = {};

    // name → title
    if (canon.name && canon.name !== product.title) {
      data.title = canon.name; changes.push({ field: 'name', before: product.title, after: canon.name });
    }
    // asin
    if (canon.asin && canon.asin !== product.asin) {
      data.asin = canon.asin; changes.push({ field: 'asin', before: product.asin, after: canon.asin });
    }
    // image → image + gallery (+ ProductImage rebuilt below)
    if (canon.image && canon.image !== product.image) {
      data.image = canon.image; data.gallery = [canon.image];
      changes.push({ field: 'image', before: product.image, after: canon.image });
    }
    // affiliateUrl — DERIVED from the effective (canonical-or-existing) ASIN.
    const effectiveAsin = canon.asin ?? product.asin;
    const nextAffiliate = resolveAffiliateUrl(effectiveAsin, product.affiliateUrl, AFF) || null;
    if (nextAffiliate !== (product.affiliateUrl ?? null)) {
      data.affiliateUrl = nextAffiliate;
      changes.push({ field: 'affiliateUrl', before: product.affiliateUrl, after: nextAffiliate });
    }

    // Normalize old product names in prose fields → canonical (exact swap only).
    for (const f of PROSE_FIELDS) {
      const cur = (product as Record<string, unknown>)[f] as string | null;
      const next = replaceProductNames(cur, NAME_PAIRS);
      if (next !== cur) { data[f] = next; changes.push({ field: f, before: cur, after: next }); }
    }

    // Report which scope fields have no canonical value (always preserved).
    const noCanonical = [
      ...(!canon.name ? ['name'] : []),
      ...(!canon.asin ? ['asin'] : []),
      ...(!canon.image ? ['image'] : []),
      ...PRESERVED_FIELDS,
    ];

    perProduct.push({ slug: product.slug, matchedBy, changes, noCanonical });

    console.log(`\n--- ${product.slug}  (matched by ${matchedBy}) ---`);
    if (changes.length === 0) {
      console.log(`  ✓  already canonical — no change.`);
      already += 1;
    } else {
      for (const c of changes) {
        console.log(`  ~ ${c.field}:`);
        console.log(`      BEFORE ${JSON.stringify(c.before)}`);
        console.log(`      AFTER  ${JSON.stringify(c.after)}`);
      }
      if (!dryRun) {
        await prisma.$transaction(async (tx) => {
          await tx.product.update({ where: { id: product.id }, data });
          if (typeof data.image === 'string') {
            await tx.productImage.deleteMany({ where: { productId: product.id } });
            await tx.productImage.create({ data: { productId: product.id, imageUrl: data.image as string, sortOrder: 0 } });
          }
        });
        console.log(`  ✓  UPDATED (${changes.map((c) => c.field).join(', ')}).`);
      } else {
        console.log(`  →  WOULD UPDATE (${changes.map((c) => c.field).join(', ')}).`);
      }
      updated += 1;
    }
  }

  // DB products with NO canonical entry (left untouched — reported, not deleted).
  const canonSlugs = new Set(canonicalEntries.map((c) => c.slug));
  const dbWithoutCanonical = dbProducts.filter((p) => !canonSlugs.has(p.slug)).map((p) => p.slug);

  if (!dryRun && updated > 0) {
    // Search results/suggestions embed product name + image — refresh the persisted index.
    try {
      const { indexed } = await rebuildIndex();
      console.log(`\n[search] rebuilt discovery index (${indexed} entries) so search shows fresh product names/images.`);
    } catch (e) {
      console.log(`\n[search] index rebuild skipped: ${String(e)}`);
    }
    await invalidateProductCaches();
  }

  console.log(`\n==== SUMMARY ====`);
  console.log(`  ${dryRun ? 'would update' : 'updated'} : ${updated}`);
  console.log(`  already canonical  : ${already}`);
  console.log(`  canonical rows with NO DB match (not invented) : ${missing.length}${missing.length ? ` -> ${missing.join(', ')}` : ''}`);
  console.log(`  DB products with NO canonical row (preserved)  : ${dbWithoutCanonical.length}${dbWithoutCanonical.length ? ` -> ${dbWithoutCanonical.join(', ')}` : ''}`);
  console.log(`  fields never touched (no canonical source, preserved for every product): ${PRESERVED_FIELDS.join(', ')}`);

  await closeRedis();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('CANONICAL_SYNC_ERR', e);
  process.exit(1);
});
