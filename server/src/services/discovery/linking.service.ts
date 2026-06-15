import { Prisma, type InternalLink, type InternalLinkStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError, type Pagination } from '../../lib/http';

/**
 * Internal linking automation (Phase 11). Generates **suggested** internal links (never
 * auto-inserted into content) between guides/comparisons and relevant products/content,
 * with generated anchor text. Also detects broken internal links in existing content.
 * Review workflow: suggested → approved | rejected. Spec §10 internal links.
 */

export function present(l: InternalLink): Record<string, unknown> {
  return {
    id: l.id,
    sourceType: l.sourceType,
    sourceId: l.sourceId,
    targetType: l.targetType,
    targetId: l.targetId,
    anchorText: l.anchorText,
    targetUrl: l.targetUrl,
    status: l.status,
    score: l.score,
    createdAt: l.createdAt.toISOString(),
  };
}

async function upsertLink(d: { sourceType: string; sourceId: string; targetType: string; targetId: string; anchorText: string; targetUrl: string; score: number }): Promise<void> {
  await prisma.internalLink.upsert({
    where: { sourceType_sourceId_targetType_targetId: { sourceType: d.sourceType, sourceId: d.sourceId, targetType: d.targetType, targetId: d.targetId } },
    update: { anchorText: d.anchorText, targetUrl: d.targetUrl, score: d.score },
    create: { ...d, status: 'suggested' },
  });
}

/** Generate internal-link suggestions for a guide or comparison source. */
export async function generateSuggestions(sourceType: 'guide' | 'comparison', sourceId: string): Promise<{ created: number }> {
  let categoryId: string | null = null;
  let productIds: string[] = [];

  if (sourceType === 'guide') {
    const g = await prisma.guide.findUnique({ where: { id: sourceId }, include: { products: true } });
    if (!g) throw ApiError.notFound('Guide not found');
    categoryId = g.categoryId;
    productIds = g.products.map((p) => p.productId);
  } else {
    const c = await prisma.comparison.findUnique({ where: { id: sourceId }, include: { productA: true, productB: true } });
    if (!c) throw ApiError.notFound('Comparison not found');
    categoryId = c.productA?.categoryId ?? null;
    productIds = [c.productAId, c.productBId];
  }

  // Candidate products: those already referenced + top-rated in the same category.
  const products = await prisma.product.findMany({
    where: { isPublished: true, OR: [{ id: { in: productIds } }, ...(categoryId ? [{ categoryId }] : [])] },
    orderBy: { rating: 'desc' },
    take: 8,
  });
  // Candidate guides in the same category.
  const guides = categoryId
    ? await prisma.guide.findMany({ where: { status: 'published', categoryId, id: sourceType === 'guide' ? { not: sourceId } : undefined }, take: 3 })
    : [];

  let created = 0;
  for (const p of products) {
    await upsertLink({ sourceType, sourceId, targetType: 'product', targetId: p.id, anchorText: p.title, targetUrl: `/products/${p.slug}`, score: p.rating });
    created++;
  }
  for (const g of guides) {
    await upsertLink({ sourceType, sourceId, targetType: 'guide', targetId: g.id, anchorText: g.title, targetUrl: `/guides/${g.slug}`, score: 1 });
    created++;
  }
  return { created };
}

export interface LinksQuery {
  page: number;
  perPage: number;
  status?: InternalLinkStatus;
  sourceType?: string;
  sourceId?: string;
}

export async function listLinks(q: LinksQuery): Promise<{ items: unknown[]; pagination: Pagination }> {
  const and: Prisma.InternalLinkWhereInput[] = [];
  if (q.status) and.push({ status: q.status });
  if (q.sourceType) and.push({ sourceType: q.sourceType });
  if (q.sourceId) and.push({ sourceId: q.sourceId });
  const where = and.length ? { AND: and } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.internalLink.findMany({ where, orderBy: [{ status: 'asc' }, { score: 'desc' }], skip: (q.page - 1) * q.perPage, take: q.perPage }),
    prisma.internalLink.count({ where }),
  ]);
  return { items: rows.map(present), pagination: { page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) } };
}

export async function setLinkStatus(id: string, status: InternalLinkStatus): Promise<Record<string, unknown>> {
  const existing = await prisma.internalLink.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Internal link not found');
  const l = await prisma.internalLink.update({ where: { id }, data: { status } });
  return present(l);
}

export async function deleteLink(id: string): Promise<void> {
  const existing = await prisma.internalLink.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Internal link not found');
  await prisma.internalLink.delete({ where: { id } });
}

const LINK_RE = /\/(products|guides|comparisons|categories|brands|authors)\/([a-z0-9-]+)/gi;

/** Scan published content for internal links whose target slug no longer exists. */
export async function detectBrokenLinks(): Promise<{ broken: { sourceType: string; sourceId: string; url: string }[]; scanned: number }> {
  const [guides, comparisons] = await Promise.all([
    prisma.guide.findMany({ where: { status: 'published' }, select: { id: true, content: true, excerpt: true } }),
    prisma.comparison.findMany({ where: { status: 'published' }, select: { id: true, summary: true, verdict: true } }),
  ]);

  // Build the set of valid slugs per type.
  const [products, cats, brands, gSlugs, cSlugs, authors] = await Promise.all([
    prisma.product.findMany({ select: { slug: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.brand.findMany({ select: { slug: true } }),
    prisma.guide.findMany({ select: { slug: true } }),
    prisma.comparison.findMany({ select: { slug: true } }),
    prisma.author.findMany({ select: { slug: true } }),
  ]);
  const valid: Record<string, Set<string>> = {
    products: new Set(products.map((p) => p.slug)),
    categories: new Set(cats.map((c) => c.slug)),
    brands: new Set(brands.map((b) => b.slug)),
    guides: new Set(gSlugs.map((g) => g.slug)),
    comparisons: new Set(cSlugs.map((c) => c.slug)),
    authors: new Set(authors.map((a) => a.slug)),
  };

  const broken: { sourceType: string; sourceId: string; url: string }[] = [];
  const scan = (sourceType: string, sourceId: string, text: string | null): void => {
    if (!text) return;
    for (const m of text.matchAll(LINK_RE)) {
      const [url, type, slug] = m;
      if (valid[type] && !valid[type].has(slug)) broken.push({ sourceType, sourceId, url });
    }
  };
  for (const g of guides) { scan('guide', g.id, g.content); scan('guide', g.id, g.excerpt); }
  for (const c of comparisons) { scan('comparison', c.id, c.summary); scan('comparison', c.id, c.verdict); }

  return { broken, scanned: guides.length + comparisons.length };
}
