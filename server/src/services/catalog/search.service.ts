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
  const like = (f: string) => ({ contains: f, mode: 'insensitive' as const });

  const wantProducts = type === 'all' || type === 'products';
  const wantCategories = type === 'all' || type === 'categories';
  const wantBrands = type === 'all' || type === 'brands';

  // Empty/stopword-only queries can't match anything meaningfully.
  if (!fragments.length) {
    return logAndReturn(q, type, [], [], [], ipHash);
  }

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

  return logAndReturn(q, type, products, categories, brands, ipHash);
}

async function logAndReturn(
  q: string,
  type: SearchQueryInput['type'],
  products: PresentedProduct[],
  categories: PresentedCategory[],
  brands: PresentedBrand[],
  ipHash?: string,
): Promise<CatalogSearchResult> {
  const total = products.length + categories.length + brands.length;

  // Log the query (best-effort — never block/break search on a logging failure).
  try {
    await prisma.searchQuery.create({
      data: { query: q, type, resultsCount: total, ipHash: ipHash ?? null },
    });
  } catch (err) {
    logger.warn({ err }, 'failed to log search query');
  }

  return { query: q, type, products, categories, brands, total };
}
