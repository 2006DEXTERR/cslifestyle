import type { SearchEntityType } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/**
 * Unified search index (Phase 11). `SearchIndexEntry` denormalises every searchable
 * entity (product/category/brand/guide/comparison/author) into one table so advanced
 * search can run weighted + fuzzy + synonym-expanded matching across all of them. The
 * discovery worker rebuilds it; mutations can re-index a single entity.
 */

interface IndexInput {
  entityType: SearchEntityType;
  entityId: string;
  slug?: string | null;
  title: string;
  body?: string | null;
  keywords?: string | null;
  boost?: number;
  url?: string | null;
  image?: string | null;
}

async function upsertEntry(e: IndexInput): Promise<void> {
  await prisma.searchIndexEntry.upsert({
    where: { entityType_entityId: { entityType: e.entityType, entityId: e.entityId } },
    update: { slug: e.slug ?? null, title: e.title, body: e.body ?? null, keywords: e.keywords ?? null, boost: e.boost ?? 1, url: e.url ?? null, image: e.image ?? null },
    create: { entityType: e.entityType, entityId: e.entityId, slug: e.slug ?? null, title: e.title, body: e.body ?? null, keywords: e.keywords ?? null, boost: e.boost ?? 1, url: e.url ?? null, image: e.image ?? null },
  });
}

const reviewBoost = (n: number): number => 1 + Math.min(n / 1000, 4);

/** Rebuild the entire search index from the live catalog + content. Returns the count. */
export async function rebuildIndex(): Promise<{ indexed: number }> {
  const [products, categories, brands, guides, comparisons, authors] = await Promise.all([
    prisma.product.findMany({ where: { isPublished: true }, include: { brand: true, category: true } }),
    prisma.category.findMany({ where: { isActive: true } }),
    prisma.brand.findMany({ where: { isActive: true } }),
    prisma.guide.findMany({ where: { status: 'published' }, include: { category: true } }),
    prisma.comparison.findMany({ where: { status: 'published' } }),
    prisma.author.findMany({ where: { isActive: true } }),
  ]);

  let indexed = 0;
  for (const p of products) {
    await upsertEntry({ entityType: 'product', entityId: p.id, slug: p.slug, title: p.title, body: p.shortDescription ?? p.description, keywords: [p.brand?.name, p.category?.name, p.asin].filter(Boolean).join(' '), boost: reviewBoost(p.reviewCount), url: `/products/${p.slug}`, image: p.image });
    indexed++;
  }
  for (const c of categories) { await upsertEntry({ entityType: 'category', entityId: c.id, slug: c.slug, title: c.name, body: c.description, url: `/categories/${c.slug}`, image: c.image }); indexed++; }
  for (const b of brands) { await upsertEntry({ entityType: 'brand', entityId: b.id, slug: b.slug, title: b.name, body: b.description, url: `/brands/${b.slug}`, image: b.logo }); indexed++; }
  for (const g of guides) { await upsertEntry({ entityType: 'guide', entityId: g.id, slug: g.slug, title: g.title, body: g.excerpt, keywords: g.category?.name ?? null, url: `/guides/${g.slug}`, image: g.coverImage }); indexed++; }
  for (const c of comparisons) { await upsertEntry({ entityType: 'comparison', entityId: c.id, slug: c.slug, title: c.title, body: c.summary ?? c.excerpt, url: `/comparisons/${c.slug}` }); indexed++; }
  for (const a of authors) { await upsertEntry({ entityType: 'author', entityId: a.id, slug: a.slug, title: a.name, body: a.bio, url: `/authors/${a.slug}`, image: a.avatarUrl }); indexed++; }

  // Prune index entries whose source entity is gone.
  const liveIds = new Set([...products, ...categories, ...brands, ...guides, ...comparisons, ...authors].map((e) => e.id));
  const stale = await prisma.searchIndexEntry.findMany({ select: { id: true, entityId: true } });
  const toDelete = stale.filter((s) => !liveIds.has(s.entityId)).map((s) => s.id);
  if (toDelete.length) await prisma.searchIndexEntry.deleteMany({ where: { id: { in: toDelete } } });

  return { indexed };
}
