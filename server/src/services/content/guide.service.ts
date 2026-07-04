import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http';
import type { Pagination } from '../../lib/http';
import { uniqueSlug } from '../../lib/slug';
import { presentGuide, type PresentedGuide } from './presenters';
import { likeFragments, rankBySearch } from '../../lib/search';
import { cacheWrap, bust, CACHE_NS, TTL } from '../../lib/cache';
import type { GuideListQuery, CreateGuideBody } from '../../validation/content.schemas';

const SEARCH_CANDIDATE_CAP = 400;

const FULL_INCLUDE = {
  category: true,
  author: true,
  products: { include: { product: { include: { category: true, brand: true, images: true } } } },
} as const;

function buildWhere(q: GuideListQuery, canSeeUnpublished: boolean): Prisma.GuideWhereInput {
  const and: Prisma.GuideWhereInput[] = [];
  const status = canSeeUnpublished ? q.status : 'published';
  if (status === 'published') and.push({ status: 'published' });
  else if (status === 'draft') and.push({ status: 'draft' });
  if (q.category) and.push({ OR: [{ categoryId: q.category }, { category: { slug: q.category } }] });
  if (q.author) and.push({ OR: [{ authorId: q.author }, { author: { slug: q.author } }] });
  return and.length ? { AND: and } : {};
}

/** Coarse DB recall filter for guide text search (precision enforced later in JS ranking). */
function searchRecallWhere(fragments: string[]): Prisma.GuideWhereInput {
  return {
    OR: fragments.flatMap((f) => [
      { title: { contains: f, mode: 'insensitive' as const } },
      { slug: { contains: f, mode: 'insensitive' as const } },
      { excerpt: { contains: f, mode: 'insensitive' as const } },
      { category: { is: { name: { contains: f, mode: 'insensitive' as const } } } },
    ]),
  };
}

function buildOrderBy(sort: GuideListQuery['sort']): Prisma.GuideOrderByWithRelationInput[] {
  switch (sort) {
    case 'oldest':
      return [{ publishedAt: 'asc' }, { createdAt: 'asc' }];
    case 'title':
      return [{ title: 'asc' }];
    case 'newest':
    default:
      return [{ publishedAt: 'desc' }, { createdAt: 'desc' }];
  }
}

export async function listGuides(
  query: GuideListQuery,
  canSeeUnpublished: boolean,
): Promise<{ items: PresentedGuide[]; pagination: Pagination }> {
  // Cache the public, non-search listing (homepage/guide index); admin/search paths run fresh.
  if (!canSeeUnpublished && !query.q) {
    return cacheWrap(`${CACHE_NS.guideList}${JSON.stringify(query)}`, TTL.contentList, () => listGuidesUncached(query, false));
  }
  return listGuidesUncached(query, canSeeUnpublished);
}

async function listGuidesUncached(
  query: GuideListQuery,
  canSeeUnpublished: boolean,
): Promise<{ items: PresentedGuide[]; pagination: Pagination }> {
  const baseWhere = buildWhere(query, canSeeUnpublished);
  const skip = (query.page - 1) * query.perPage;
  const fragments = query.q ? likeFragments(query.q) : [];

  // Relevance-ranked text search (drafts already excluded by buildWhere for public callers).
  if (query.q && fragments.length) {
    const where: Prisma.GuideWhereInput = { AND: [baseWhere, searchRecallWhere(fragments)] };
    const candidates = await prisma.guide.findMany({
      where,
      include: { category: true, author: true },
      take: SEARCH_CANDIDATE_CAP,
    });
    const ranked = rankBySearch(
      query.q,
      candidates,
      (row) => ({
        title: row.title,
        slug: row.slug,
        category: row.category?.name ?? null,
        keywords: row.excerpt ?? '',
      }),
      (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
    );
    const total = ranked.length;
    return {
      items: ranked.slice(skip, skip + query.perPage).map(presentGuide),
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.perPage)),
      },
    };
  }

  const [rows, total] = await prisma.$transaction([
    prisma.guide.findMany({
      where: baseWhere,
      include: { category: true, author: true },
      orderBy: buildOrderBy(query.sort),
      skip,
      take: query.perPage,
    }),
    prisma.guide.count({ where: baseWhere }),
  ]);

  return {
    items: rows.map(presentGuide),
    pagination: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.perPage)),
    },
  };
}

export async function getGuideBySlug(
  slug: string,
  canSeeUnpublished: boolean,
): Promise<PresentedGuide> {
  if (!canSeeUnpublished) {
    return cacheWrap(`${CACHE_NS.guideSlug}${slug}`, TTL.detail, () => getGuideBySlugUncached(slug, false));
  }
  return getGuideBySlugUncached(slug, canSeeUnpublished);
}

async function getGuideBySlugUncached(slug: string, canSeeUnpublished: boolean): Promise<PresentedGuide> {
  const row = await prisma.guide.findUnique({ where: { slug }, include: FULL_INCLUDE });
  if (!row || (!canSeeUnpublished && row.status !== 'published')) throw ApiError.notFound('Guide not found');
  const presented = presentGuide(row);
  // Fill the embedded author's real published-guide count (the detail sidebar shows it).
  if (presented.author && row.authorId) {
    presented.author.articlesCount = await prisma.guide.count({
      where: { authorId: row.authorId, status: 'published' },
    });
  }
  return presented;
}

function guideExistsBySlug(slug: string): Promise<string | null> {
  return prisma.guide.findUnique({ where: { slug }, select: { id: true } }).then((r) => r?.id ?? null);
}

function scalarData(body: Partial<CreateGuideBody>): Prisma.GuideUncheckedUpdateInput {
  const d: Prisma.GuideUncheckedUpdateInput = {};
  if (body.title !== undefined) d.title = body.title;
  if (body.excerpt !== undefined) d.excerpt = body.excerpt;
  if (body.content !== undefined) d.content = body.content;
  if (body.coverImage !== undefined) d.coverImage = body.coverImage;
  if (body.categoryId !== undefined) d.categoryId = body.categoryId;
  if (body.authorId !== undefined) d.authorId = body.authorId;
  if (body.readingTime !== undefined) d.readingTime = body.readingTime;
  if (body.tableOfContents !== undefined) d.tableOfContents = body.tableOfContents as Prisma.InputJsonValue;
  if (body.faqItems !== undefined) d.faqItems = body.faqItems as Prisma.InputJsonValue;
  if (body.tags !== undefined) d.tags = body.tags;
  if (body.seoTitle !== undefined) d.seoTitle = body.seoTitle;
  if (body.metaDescription !== undefined) d.metaDescription = body.metaDescription;
  return d;
}

async function assertRefs(categoryId?: string | null, authorId?: string | null): Promise<void> {
  if (categoryId) {
    const c = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!c) throw ApiError.badRequest('Invalid category', { categoryId: ['Category not found'] });
  }
  if (authorId) {
    const a = await prisma.author.findUnique({ where: { id: authorId }, select: { id: true } });
    if (!a) throw ApiError.badRequest('Invalid author', { authorId: ['Author not found'] });
  }
}

async function syncProducts(
  tx: Prisma.TransactionClient,
  guideId: string,
  products: CreateGuideBody['products'],
): Promise<void> {
  if (products === undefined) return;
  await tx.guideProduct.deleteMany({ where: { guideId } });
  if (products.length > 0) {
    // De-dupe by productId (composite PK guideId+productId).
    const seen = new Set<string>();
    const data = products
      .filter((p) => (seen.has(p.productId) ? false : (seen.add(p.productId), true)))
      .map((p, i) => ({
        guideId,
        productId: p.productId,
        position: p.position ?? i,
        reason: p.reason ?? null,
        isTopPick: p.isTopPick ?? false,
      }));
    await tx.guideProduct.createMany({ data });
  }
}

export async function createGuide(body: CreateGuideBody): Promise<PresentedGuide> {
  await assertRefs(body.categoryId, body.authorId);
  const slug = await uniqueSlug(body.slug ?? body.title, guideExistsBySlug);
  const status = body.status ?? 'draft';

  const created = await prisma.$transaction(async (tx) => {
    const guide = await tx.guide.create({
      data: {
        ...(scalarData(body) as Prisma.GuideUncheckedCreateInput),
        slug,
        status,
        publishedAt: status === 'published' ? new Date() : null,
      },
    });
    await syncProducts(tx, guide.id, body.products);
    return guide;
  });

  await bust.guides();
  return getGuideById(created.id);
}

export async function updateGuide(
  id: string,
  body: Partial<CreateGuideBody>,
): Promise<PresentedGuide> {
  const existing = await prisma.guide.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Guide not found');
  await assertRefs(body.categoryId, body.authorId);

  const data = scalarData(body);
  if (body.slug) data.slug = await uniqueSlug(body.slug, guideExistsBySlug, id);
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === 'published' && !existing.publishedAt) data.publishedAt = new Date();
  }

  await prisma.$transaction(async (tx) => {
    await tx.guide.update({ where: { id }, data });
    await syncProducts(tx, id, body.products);
  });

  await bust.guides();
  return getGuideById(id);
}

export async function deleteGuide(id: string): Promise<void> {
  const existing = await prisma.guide.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Guide not found');
  await prisma.guide.delete({ where: { id } });
  await bust.guides();
}

export async function setGuideStatus(
  id: string,
  action: 'publish' | 'unpublish' | 'draft',
): Promise<PresentedGuide> {
  const existing = await prisma.guide.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Guide not found');

  if (action === 'publish') {
    await prisma.guide.update({
      where: { id },
      data: { status: 'published', publishedAt: existing.publishedAt ?? new Date() },
    });
  } else {
    await prisma.guide.update({ where: { id }, data: { status: 'draft' } });
  }
  return getGuideById(id);
}

async function getGuideById(id: string): Promise<PresentedGuide> {
  const row = await prisma.guide.findUnique({ where: { id }, include: FULL_INCLUDE });
  if (!row) throw ApiError.notFound('Guide not found');
  return presentGuide(row);
}
