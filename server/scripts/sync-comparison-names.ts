/**
 * Sync comparison text to canonical product names (server/my-products.csv → Product rows).
 *
 * A comparison's title/summary/verdict/etc. are stored strings that embed product names
 * captured at authoring time; when a product is renamed they go stale (e.g. the homepage
 * "Popular Comparisons" cards). This tool repairs them from the CURRENT linked product
 * titles — never inventing:
 *   - title   → rebuilt as "A vs B" + any ": tagline" the old title had.
 *   - prose   → exact old-full-name → new-name swaps (summary, excerpt, verdict,
 *               seoTitle, metaDescription, editorSummary, whoShouldBuyA/B, bestFor,
 *               comparisonNotes).
 * Short-form / brand references a rename can't resolve unambiguously are LEFT and
 * REPORTED (fixing them would require rewriting editorial claims = inventing).
 *
 * Rebuilds the discovery search index (comparison titles appear in search) and invalidates
 * comparison caches. Redis opened explicitly; if unavailable the DB write stands and a
 * TTL/restart warning prints.
 *
 * Usage (from server/):  npm run comparisons:sync-names   [-- --check]
 */
import { PrismaClient } from '@prisma/client';
import { products as mockProducts } from '../../lib/data';
import { deriveComparisonTitle, replaceProductNames } from '../src/lib/comparison-canonical';
import { bust } from '../src/lib/cache';
import { connectRedis, closeRedis, redis } from '../src/lib/redis';
import { rebuildIndex } from '../src/services/discovery/index.service';

/** Text fields that can embed product names. */
const TEXT_FIELDS = [
  'summary', 'excerpt', 'verdict', 'seoTitle', 'metaDescription',
  'editorSummary', 'whoShouldBuyA', 'whoShouldBuyB', 'bestFor', 'comparisonNotes',
] as const;

async function invalidateComparisonCaches(): Promise<void> {
  try {
    await connectRedis();
  } catch {
    /* handled below */
  }
  if (redis.status !== 'ready') {
    console.log(
      '\n[cache] ⚠ Redis unavailable — PostgreSQL WAS updated, but cached responses ' +
        '(comparisons list/detail, homepage Popular Comparisons, search suggestions) may remain ' +
        'STALE until each key’s TTL expires (comparison list ~180s, detail ~300s, suggestions ~45s) ' +
        'or the backend is restarted.',
    );
    return;
  }
  await bust.comparisons(); // comp:* (list + detail), sugg:* (search), admin:overview
  await bust.products(); // homepage/product surfaces embed comparison cards
  console.log('\n[cache] ✓ invalidated comparison, homepage and search caches.');
}

async function main() {
  const dryRun = process.argv.includes('--check');
  const prisma = new PrismaClient();

  const dbProducts = await prisma.product.findMany({ select: { slug: true, title: true } });
  const newBySlug = new Map(dbProducts.map((p) => [p.slug, p.title]));
  const oldBySlug = new Map(mockProducts.map((p) => [p.slug, p.name]));

  // Global old→new full-name replacement pairs (only where the name actually changed).
  const pairs: Array<[string, string]> = [];
  for (const [slug, oldName] of oldBySlug) {
    const newName = newBySlug.get(slug);
    if (newName && oldName && newName !== oldName) pairs.push([oldName, newName]);
  }
  const oldNames = pairs.map(([o]) => o);

  const comparisons = await prisma.comparison.findMany({
    orderBy: { slug: 'asc' },
    include: { productA: { select: { title: true } }, productB: { select: { title: true } } },
  });

  console.log(`\n=== Comparison name sync (${dryRun ? 'DRY RUN' : 'APPLY'}) — ${comparisons.length} comparisons ===`);
  console.log(`  canonical rename pairs: ${pairs.map(([o, n]) => `"${o}"→"${n}"`).join(', ') || '(none)'}`);

  let updated = 0;
  let already = 0;
  const residuals: { slug: string; field: string; text: string }[] = [];

  for (const c of comparisons) {
    const aName = c.productA.title;
    const bName = c.productB.title;
    const data: Record<string, string | null> = {};
    const changes: string[] = [];

    const newTitle = replaceProductNames(deriveComparisonTitle(c.title, aName, bName), pairs)!;
    if (newTitle !== c.title) { data.title = newTitle; changes.push('title'); }

    for (const f of TEXT_FIELDS) {
      const cur = (c as Record<string, unknown>)[f] as string | null;
      const next = replaceProductNames(cur, pairs);
      if (next !== cur) { data[f] = next; changes.push(f); }
    }

    console.log(`\n--- ${c.slug} ---`);
    console.log(`  linked: "${aName}" vs "${bName}"`);
    if (changes.length === 0) {
      console.log(`  ✓  already canonical — no change.`);
      already += 1;
    } else {
      for (const f of changes) {
        console.log(`  ~ ${f}:`);
        console.log(`      BEFORE ${JSON.stringify(f === 'title' ? c.title : (c as Record<string, unknown>)[f])}`);
        console.log(`      AFTER  ${JSON.stringify(data[f])}`);
      }
      if (!dryRun) {
        await prisma.comparison.update({ where: { id: c.id }, data });
        console.log(`  ✓  UPDATED (${changes.join(', ')}).`);
      } else {
        console.log(`  →  WOULD UPDATE (${changes.join(', ')}).`);
      }
      updated += 1;
    }

    // Residual scan: any OLD full product name still present after the swap (should be none),
    // plus short-form references the swap can't resolve are surfaced for editorial review.
    const finalTitle = data.title !== undefined ? (data.title ?? '') : c.title;
    const scanFields: Array<[string, string | null]> = [['title', finalTitle]];
    for (const f of TEXT_FIELDS) {
      scanFields.push([f, data[f] !== undefined ? data[f] : ((c as Record<string, unknown>)[f] as string | null)]);
    }
    for (const [f, text] of scanFields) {
      if (!text) continue;
      for (const oldN of oldNames) if (text.includes(oldN)) residuals.push({ slug: c.slug, field: f, text: `old full name "${oldN}" remains` });
    }
  }

  if (!dryRun && updated > 0) {
    try {
      const { indexed } = await rebuildIndex();
      console.log(`\n[search] rebuilt discovery index (${indexed} entries) so search shows fresh comparison titles.`);
    } catch (e) {
      console.log(`\n[search] index rebuild skipped: ${String(e)}`);
    }
    await invalidateComparisonCaches();
  }

  console.log(`\n==== SUMMARY ====`);
  console.log(`  ${dryRun ? 'would update' : 'updated'} : ${updated}`);
  console.log(`  already canonical  : ${already}`);
  console.log(`  old FULL names remaining after swap: ${residuals.length}${residuals.length ? '' : ' (none)'}`);
  for (const r of residuals) console.log(`    ✗ ${r.slug}.${r.field}: ${r.text}`);

  await closeRedis();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('COMPARISON_SYNC_ERR', e);
  process.exit(1);
});
