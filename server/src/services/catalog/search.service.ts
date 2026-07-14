import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import {
  presentProduct,
  presentCategory,
  presentBrand,
  type PresentedProduct,
  type PresentedCategory,
  type PresentedBrand,
} from './presenters';
import { likeFragments, rankBySearch } from '../../lib/search';
import { cacheWrap, CACHE_NS, TTL } from '../../lib/cache';
import type { SearchQueryInput } from '../../validation/catalog.schemas';

export interface CatalogSearchResult {
  query: string;
  type: SearchQueryInput['type'];
  products: PresentedProduct[];
  categories: PresentedCategory[];
  brands: PresentedBrand[];
  total: number;
}

/**
 * Database-backed catalog search across published products, active categories and
 * active brands. Uses relevance ranking (token + word-boundary matching, singular/plural,
 * safe synonyms) rather than naive substring — so "laptop" finds the whole category and
 * "phone" never matches "headphone". Every query is logged to `search_queries` (FR-032)
 * with the result count and a hashed IP (NFR-SEC-007).
 */
export async function searchCatalog(
  input: SearchQueryInput,
  ipHash?: string,
): Promise<CatalogSearchResult> {
  const { q, type, limit } = input;
  const fragments = likeFragments(q);

  // Cache the (public, non-personalized) result set — search fires on every keystroke but
  // the catalog changes rarely. Keyed by type+limit+term; busted by bust.products/etc. via
  // the shared `sugg:` prefix. Empty/stopword-only queries skip the DB entirely.
  const result: CatalogSearchResult = fragments.length
    ? await cacheWrap(
        `${CACHE_NS.suggestions}catalog:${type}:${limit}:${q.trim().toLowerCase()}`,
        TTL.suggestions,
        () => computeSearchResults(input, fragments),
      )
    : { query: q, type, products: [], categories: [], brands: [], total: 0 };

  // Analytics logging is best-effort and NON-BLOCKING — never delay search on a write.
  logSearch(q, type, result.total, ipHash);
  return result;
}

async function computeSearchResults(
  input: SearchQueryInput,
  fragments: string[],
): Promise<CatalogSearchResult> {
  const { q, type, limit } = input;
  const like = (f: string) => ({ contains: f, mode: 'insensitive' as const });

  const wantProducts = type === 'all' || type === 'products';
  const wantCategories = type === 'all' || type === 'categories';
  const wantBrands = type === 'all' || type === 'brands';

  const [productRows, categoryRows, brandRows] = await Promise.all([
    wantProducts
      ? prisma.product.findMany({
          where: {
            isPublished: true,
            OR: fragments.flatMap((f) => [
              { title: like(f) },
              { slug: like(f) },
              { shortDescription: like(f) },
              { category: { is: { name: like(f) } } },
              { brand: { is: { name: like(f) } } },
            ]),
          },
          include: { category: true, brand: true, images: true },
          take: 400,
        })
      : Promise.resolve([]),
    wantCategories
      ? prisma.category.findMany({
          where: { isActive: true, OR: fragments.flatMap((f) => [{ name: like(f) }, { slug: like(f) }]) },
          take: 100,
        })
      : Promise.resolve([]),
    wantBrands
      ? prisma.brand.findMany({
          where: { isActive: true, OR: fragments.flatMap((f) => [{ name: like(f) }, { slug: like(f) }]) },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  const products = rankBySearch(
    q,
    productRows,
    (r) => ({ title: r.title, slug: r.slug, category: r.category?.name ?? null, brand: r.brand?.name ?? null, keywords: r.shortDescription ?? '' }),
    (a, b) => b.reviewCount - a.reviewCount,
  ).slice(0, limit).map(presentProduct);
  const categories = rankBySearch(q, categoryRows, (c) => ({ title: c.name, slug: c.slug }))
    .slice(0, limit).map((c) => presentCategory(c));
  const brands = rankBySearch(q, brandRows, (b) => ({ title: b.name, slug: b.slug }))
    .slice(0, limit).map((b) => presentBrand(b));

  const total = products.length + categories.length + brands.length;
  return { query: q, type, products, categories, brands, total };
}

/** Fire-and-forget analytics write — best-effort, never blocks or breaks the response. */
function logSearch(q: string, type: SearchQueryInput['type'], total: number, ipHash?: string): void {
  prisma.searchQuery
    .create({ data: { query: q, type, resultsCount: total, ipHash: ipHash ?? null } })
    .catch((err) => logger.warn({ err }, 'failed to log search query'));
}
