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
 * active brands (case-insensitive contains). Every query is logged to
 * `search_queries` (FR-032) with the result count and a hashed IP (NFR-SEC-007).
 */
export async function searchCatalog(
  input: SearchQueryInput,
  ipHash?: string,
): Promise<CatalogSearchResult> {
  const { q, type, limit } = input;
  const insensitive = { contains: q, mode: 'insensitive' as const };

  const wantProducts = type === 'all' || type === 'products';
  const wantCategories = type === 'all' || type === 'categories';
  const wantBrands = type === 'all' || type === 'brands';

  const [productRows, categoryRows, brandRows] = await Promise.all([
    wantProducts
      ? prisma.product.findMany({
          where: {
            isPublished: true,
            OR: [
              { title: insensitive },
              { shortDescription: insensitive },
              { brand: { name: insensitive } },
            ],
          },
          include: { category: true, brand: true, images: true },
          orderBy: { reviewCount: 'desc' },
          take: limit,
        })
      : Promise.resolve([]),
    wantCategories
      ? prisma.category.findMany({
          where: { isActive: true, name: insensitive },
          orderBy: { sortOrder: 'asc' },
          take: limit,
        })
      : Promise.resolve([]),
    wantBrands
      ? prisma.brand.findMany({
          where: { isActive: true, name: insensitive },
          orderBy: { name: 'asc' },
          take: limit,
        })
      : Promise.resolve([]),
  ]);

  const products = productRows.map(presentProduct);
  const categories = categoryRows.map((c) => presentCategory(c));
  const brands = brandRows.map((b) => presentBrand(b));
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
