import { Prisma, type RecommendationRule } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError, type Pagination } from '../../lib/http';
import { presentProduct, type PresentedProduct } from '../catalog/presenters';
import { presentGuide, presentComparison, type PresentedGuide, type PresentedComparison } from '../content/presenters';

/**
 * Recommendation engine (Phase 11). Blends category / brand / price-proximity / rating /
 * trending (recent ProductView) / affiliate-performance (recent AffiliateClick) signals,
 * weighted by admin-configurable `RecommendationRule`s. Outputs reuse the catalog/content
 * presenters so the public SSR pages can consume them with **no shape change**.
 */

const PRODUCT_INC = { category: true, brand: true, images: true } as const;
const GUIDE_INC = { category: true, author: true, products: { include: { product: { include: PRODUCT_INC } } } } as const;
const COMPARISON_INC = { productA: { include: PRODUCT_INC }, productB: { include: PRODUCT_INC }, specs: true } as const;

interface Weights {
  category: number; brand: number; price: number; rating: number; trending: number; affiliate: number;
}
const DEFAULT_WEIGHTS: Weights = { category: 3, brand: 2, price: 1.5, rating: 1, trending: 2, affiliate: 1.5 };

async function activeWeights(): Promise<Weights> {
  const rules = await prisma.recommendationRule.findMany({ where: { isActive: true } });
  const w = { ...DEFAULT_WEIGHTS };
  for (const r of rules) if (r.type in w) (w as Record<string, number>)[r.type] = r.weight;
  return w;
}

async function engagement(ids: string[]): Promise<{ views: Map<string, number>; clicks: Map<string, number> }> {
  if (ids.length === 0) return { views: new Map(), clicks: new Map() };
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [views, clicks] = await Promise.all([
    prisma.productView.groupBy({ by: ['productId'], where: { productId: { in: ids }, createdAt: { gte: since } }, _count: { productId: true } }),
    prisma.affiliateClick.groupBy({ by: ['productId'], where: { productId: { in: ids }, clickedAt: { gte: since } }, _count: { productId: true } }),
  ]);
  return {
    views: new Map(views.map((v) => [v.productId, v._count.productId])),
    clicks: new Map(clicks.filter((c) => c.productId).map((c) => [c.productId as string, c._count.productId])),
  };
}

type ProductRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INC }>;

async function scoreAndPresent(seed: ProductRow | null, candidates: ProductRow[], w: Weights, limit: number, opts: { brand?: boolean } = {}): Promise<PresentedProduct[]> {
  const { views, clicks } = await engagement(candidates.map((c) => c.id));
  const maxV = Math.max(1, ...views.values());
  const maxC = Math.max(1, ...clicks.values());
  const seedPrice = seed?.currentPrice ? Number(seed.currentPrice) : null;
  const scored = candidates.map((c) => {
    let s = 0;
    if (seed && c.categoryId === seed.categoryId) s += w.category;
    if (opts.brand !== false && seed?.brandId && c.brandId === seed.brandId) s += w.brand;
    if (seedPrice && c.currentPrice) s += w.price * (1 - Math.min(Math.abs(Number(c.currentPrice) - seedPrice) / seedPrice, 1));
    s += w.rating * (c.rating / 5);
    s += w.trending * ((views.get(c.id) ?? 0) / maxV);
    s += w.affiliate * ((clicks.get(c.id) ?? 0) / maxC);
    return { c, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => presentProduct(x.c));
}

// ── Product recommendations ──

export async function relatedProducts(productId: string, limit = 6): Promise<PresentedProduct[]> {
  const seed = await prisma.product.findUnique({ where: { id: productId }, include: PRODUCT_INC });
  if (!seed) return [];
  const candidates = await prisma.product.findMany({
    where: { isPublished: true, id: { not: productId }, OR: [{ categoryId: seed.categoryId }, ...(seed.brandId ? [{ brandId: seed.brandId }] : [])] },
    include: PRODUCT_INC,
    take: 120,
  });
  return scoreAndPresent(seed, candidates, await activeWeights(), limit);
}

/** Similar = same category, closest price + rating (brand-agnostic). */
export async function similarProducts(productId: string, limit = 6): Promise<PresentedProduct[]> {
  const seed = await prisma.product.findUnique({ where: { id: productId }, include: PRODUCT_INC });
  if (!seed) return [];
  const candidates = await prisma.product.findMany({ where: { isPublished: true, id: { not: productId }, categoryId: seed.categoryId }, include: PRODUCT_INC, take: 120 });
  const w = { ...(await activeWeights()), brand: 0, trending: 0.5, affiliate: 0.5 };
  return scoreAndPresent(seed, candidates, w, limit, { brand: false });
}

export async function categoryRecommendations(categoryId: string, limit = 8): Promise<PresentedProduct[]> {
  const candidates = await prisma.product.findMany({ where: { isPublished: true, categoryId }, include: PRODUCT_INC, take: 150 });
  return scoreAndPresent(null, candidates, await activeWeights(), limit);
}

export async function brandRecommendations(brandId: string, limit = 8): Promise<PresentedProduct[]> {
  const candidates = await prisma.product.findMany({ where: { isPublished: true, brandId }, include: PRODUCT_INC, take: 150 });
  return scoreAndPresent(null, candidates, await activeWeights(), limit);
}

export async function priceRangeRecommendations(min: number, max: number, limit = 8): Promise<PresentedProduct[]> {
  const candidates = await prisma.product.findMany({ where: { isPublished: true, currentPrice: { gte: min, lte: max } }, include: PRODUCT_INC, take: 150 });
  return scoreAndPresent(null, candidates, await activeWeights(), limit);
}

/** Trending = top products by recent views + affiliate clicks (affiliate-performance weighted). */
export async function trendingProducts(limit = 8): Promise<PresentedProduct[]> {
  const candidates = await prisma.product.findMany({ where: { isPublished: true }, include: PRODUCT_INC, take: 300 });
  const w = { ...(await activeWeights()), category: 0, brand: 0, price: 0 };
  return scoreAndPresent(null, candidates, w, limit);
}

// ── Content recommendations ──

export async function relatedGuides(guideId: string, limit = 3): Promise<PresentedGuide[]> {
  const guide = await prisma.guide.findUnique({ where: { id: guideId }, include: { products: true } });
  if (!guide) return [];
  const productIds = guide.products.map((p) => p.productId);
  const candidates = await prisma.guide.findMany({
    where: { status: 'published', id: { not: guideId }, OR: [{ categoryId: guide.categoryId ?? undefined }, { products: { some: { productId: { in: productIds } } } }] },
    include: GUIDE_INC,
    take: 20,
  });
  const scored = candidates.map((c) => {
    const shared = c.products.filter((gp) => productIds.includes(gp.productId)).length;
    return { c, s: shared * 2 + (c.categoryId && c.categoryId === guide.categoryId ? 1 : 0) };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => presentGuide(x.c));
}

export async function relatedComparisons(comparisonId: string, limit = 3): Promise<PresentedComparison[]> {
  const comp = await prisma.comparison.findUnique({ where: { id: comparisonId }, select: { productAId: true, productBId: true } });
  if (!comp) return [];
  const products = [comp.productAId, comp.productBId];
  const candidates = await prisma.comparison.findMany({
    where: { status: 'published', id: { not: comparisonId }, OR: [{ productAId: { in: products } }, { productBId: { in: products } }] },
    include: COMPARISON_INC,
    take: 20,
  });
  // Fallback: latest comparisons if no product overlap.
  let list = candidates;
  if (list.length < limit) {
    const extra = await prisma.comparison.findMany({ where: { status: 'published', id: { not: comparisonId } }, include: COMPARISON_INC, orderBy: { publishedAt: 'desc' }, take: limit });
    const seen = new Set(list.map((c) => c.id));
    list = [...list, ...extra.filter((c) => !seen.has(c.id))];
  }
  return list.slice(0, limit).map((c) => presentComparison(c));
}

// ── Rules (recommendations.view / recommendations.manage) ──

export function presentRule(r: RecommendationRule): Record<string, unknown> {
  return { id: r.id, name: r.name, type: r.type, conditions: r.conditions ?? null, weight: r.weight, isActive: r.isActive, updatedAt: r.updatedAt.toISOString() };
}

const RULE_TYPES = ['category', 'brand', 'price', 'rating', 'trending', 'affiliate', 'related_products', 'similar'];

export async function listRules(q: { page: number; perPage: number }): Promise<{ items: unknown[]; pagination: Pagination }> {
  const [rows, total] = await prisma.$transaction([
    prisma.recommendationRule.findMany({ orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.perPage, take: q.perPage }),
    prisma.recommendationRule.count(),
  ]);
  return { items: rows.map(presentRule), pagination: { page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) } };
}

export async function createRule(input: { name: string; type: string; weight?: number; conditions?: Prisma.InputJsonValue; isActive?: boolean; userId?: string | null }): Promise<Record<string, unknown>> {
  if (!RULE_TYPES.includes(input.type)) throw ApiError.badRequest(`Unknown rule type "${input.type}"`);
  const r = await prisma.recommendationRule.create({ data: { name: input.name, type: input.type, weight: input.weight ?? 1, conditions: input.conditions, isActive: input.isActive ?? true, createdById: input.userId ?? null } });
  return presentRule(r);
}

export async function updateRule(id: string, input: { name?: string; weight?: number; conditions?: Prisma.InputJsonValue; isActive?: boolean }): Promise<Record<string, unknown>> {
  const existing = await prisma.recommendationRule.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Rule not found');
  const r = await prisma.recommendationRule.update({ where: { id }, data: { name: input.name ?? undefined, weight: input.weight ?? undefined, conditions: input.conditions, isActive: input.isActive ?? undefined } });
  return presentRule(r);
}

export async function deleteRule(id: string): Promise<void> {
  const existing = await prisma.recommendationRule.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Rule not found');
  await prisma.recommendationRule.delete({ where: { id } });
}
