// Server-side data fetchers for the SSR detail pages.
//
// Server Components cannot use the browser-only next.config.js rewrites, so these
// call the backend at an ABSOLUTE origin (BACKEND_ORIGIN, default 127.0.0.1:4000) —
// the same env var the rewrites use. Requests are anonymous, so the public API
// returns published/active rows only (correct for public SSR). Every call is
// resilient (try/catch → null/[]) so `next build` succeeds even if the backend is
// down at build time (pages then render on-demand via ISR).

import type { CatalogProduct, CatalogCategory, CatalogBrand } from '@/lib/api/catalog';
import type { ContentGuide, ContentComparison, ContentAuthor } from '@/lib/api/content';

// IPv4 127.0.0.1 (not "localhost") avoids an IPv6 ::1 resolution miss against the
// IPv4-bound backend on Windows during local dev. Prod overrides via env.
const BACKEND = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:4000';

/** Default ISR window (seconds) for catalog/content reads. */
export const REVALIDATE = 3600;

interface Envelope<T> {
  status: 'success' | 'error';
  data: T;
  meta?: { pagination?: { page: number; perPage: number; total: number; totalPages: number } } | null;
}

async function ssrGet<T>(path: string, revalidate = REVALIDATE): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<Envelope<T>>;
    return body.status === 'success' ? ((body.data ?? null) as T | null) : null;
  } catch {
    return null;
  }
}

async function ssrList<T>(path: string, revalidate = REVALIDATE): Promise<T[]> {
  return (await ssrGet<T[]>(path, revalidate)) ?? [];
}

/**
 * Collect every published slug for a paginated resource (products/guides/
 * comparisons/authors). The list APIs cap perPage at 100, so we walk pages using
 * `meta.pagination.totalPages` (bounded for safety).
 */
async function collectSlugs(resource: string): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    try {
      const res = await fetch(`${BACKEND}/api/${resource}?perPage=100&page=${page}`, {
        next: { revalidate: REVALIDATE },
      });
      if (!res.ok) break;
      const body = (await res.json()) as Envelope<{ slug: string }[]>;
      if (body.status !== 'success' || !Array.isArray(body.data)) break;
      for (const row of body.data) slugs.push(row.slug);
      totalPages = body.meta?.pagination?.totalPages ?? 1;
    } catch {
      break;
    }
    page += 1;
  } while (page <= totalPages && page <= 50);
  return slugs;
}

// ───────────────────────── Products ─────────────────────────
export const getProduct = (slug: string) => ssrGet<CatalogProduct>(`/api/products/${slug}`);
export const listProductSlugs = (): Promise<string[]> => collectSlugs('products');
export const listProductsByCategory = (categorySlug: string, perPage = 5) =>
  ssrList<CatalogProduct>(`/api/products?category=${encodeURIComponent(categorySlug)}&perPage=${perPage}`);
export const listProductsByBrand = (brandSlug: string, perPage = 100) =>
  ssrList<CatalogProduct>(`/api/products?brand=${encodeURIComponent(brandSlug)}&perPage=${perPage}`);

// ───────────────────────── Categories ─────────────────────────
export const getCategory = (slug: string) => ssrGet<CatalogCategory>(`/api/categories/${slug}`);
export const listCategorySlugs = async (): Promise<string[]> =>
  (await ssrList<CatalogCategory>(`/api/categories?parent=all`)).map((c) => c.slug);

// ───────────────────────── Brands ─────────────────────────
export const getBrand = (slug: string) => ssrGet<CatalogBrand>(`/api/brands/${slug}`);
export const listBrandSlugs = async (): Promise<string[]> =>
  (await ssrList<CatalogBrand>(`/api/brands`)).map((b) => b.slug);

// ───────────────────────── Guides ─────────────────────────
export const getGuide = (slug: string) => ssrGet<ContentGuide>(`/api/guides/${slug}`);
export const listGuideSlugs = (): Promise<string[]> => collectSlugs('guides');
export const listGuidesByCategory = (categorySlug: string, perPage = 4) =>
  ssrList<ContentGuide>(`/api/guides?category=${encodeURIComponent(categorySlug)}&perPage=${perPage}`);

// ───────────────────────── Comparisons ─────────────────────────
export const getComparison = (slug: string) => ssrGet<ContentComparison>(`/api/comparisons/${slug}`);
export const listComparisonSlugs = (): Promise<string[]> => collectSlugs('comparisons');
export const listComparisons = (perPage = 4) =>
  ssrList<ContentComparison>(`/api/comparisons?perPage=${perPage}`);

// ───────────────────────── Authors ─────────────────────────
export const getAuthor = (slug: string) => ssrGet<ContentAuthor>(`/api/authors/${slug}`);
export const listAuthorSlugs = (): Promise<string[]> => collectSlugs('authors');

// ───────────────────────── Recommendations (Phase 11) ─────────────────────────
// DB-backed discovery recommendations for the public detail pages. Same presented
// shapes as the catalog/content reads, so the detail islands consume them unchanged.
export const recommendRelatedProducts = (productId: string, limit = 4) =>
  ssrList<CatalogProduct>(`/api/recommendations/products?type=related&productId=${encodeURIComponent(productId)}&limit=${limit}`);
export const recommendRelatedGuides = (guideId: string, limit = 3) =>
  ssrList<ContentGuide>(`/api/recommendations/content?type=guide&id=${encodeURIComponent(guideId)}&limit=${limit}`);
export const recommendRelatedComparisons = (comparisonId: string, limit = 3) =>
  ssrList<ContentComparison>(`/api/recommendations/content?type=comparison&id=${encodeURIComponent(comparisonId)}&limit=${limit}`);
