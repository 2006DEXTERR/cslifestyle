import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http';
import type { Pagination } from '../../lib/http';
import { uniqueSlug } from '../../lib/slug';
import { presentComparison, type PresentedComparison } from './presenters';
import { likeFragments, rankBySearch } from '../../lib/search';
import type { ComparisonListQuery, CreateComparisonBody } from '../../validation/content.schemas';

const SEARCH_CANDIDATE_CAP = 400;

const PRODUCT_REL = { include: { category: true, brand: true, images: true } } as const;
const FULL_INCLUDE = {
  productA: PRODUCT_REL,
  productB: PRODUCT_REL,
  specs: { orderBy: { position: 'asc' } },
} as const;
const LIST_INCLUDE = { productA: PRODUCT_REL, productB: PRODUCT_REL } as const;

function buildWhere(q: ComparisonListQuery, canSeeUnpublished: boolean): Prisma.ComparisonWhereInput {
  const and: Prisma.ComparisonWhereInput[] = [];
  const status = canSeeUnpublished ? q.status : 'published';
  if (status === 'published') and.push({ status: 'published' });
  else if (status === 'draft') and.push({ status: 'draft' });
  return and.length ? { AND: and } : {};
}

/** Coarse DB recall filter for comparison text search (precision enforced in JS ranking). */
function searchRecallWhere(fragments: string[]): Prisma.ComparisonWhereInput {
  return {
    OR: fragments.flatMap((f) => [
      { title: { contains: f, mode: 'insensitive' as const } },
      { slug: { contains: f, mode: 'insensitive' as const } },
      { excerpt: { contains: f, mode: 'insensitive' as const } },
      { productA: { is: { title: { contains: f, mode: 'insensitive' as const } } } },
      { productB: { is: { title: { contains: f, mode: 'insensitive' as const } } } },
    ]),
  };
}

function buildOrderBy(sort: ComparisonListQuery['sort']): Prisma.ComparisonOrderByWithRelationInput[] {
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

export async function listComparisons(
  query: ComparisonListQuery,
  canSeeUnpublished: boolean,
): Promise<{ items: PresentedComparison[]; pagination: Pagination }> {
  const baseWhere = buildWhere(query, canSeeUnpublished);
  const skip = (query.page - 1) * query.perPage;
  const fragments = query.q ? likeFragments(query.q) : [];

  // Relevance-ranked text search (drafts already excluded by buildWhere for public callers).
  if (query.q && fragments.length) {
    const where: Prisma.ComparisonWhereInput = { AND: [baseWhere, searchRecallWhere(fragments)] };
    const candidates = await prisma.comparison.findMany({ where, include: LIST_INCLUDE, take: SEARCH_CANDIDATE_CAP });
    const ranked = rankBySearch(
      query.q,
      candidates,
      (row) => ({
        title: row.title,
        slug: row.slug,
        keywords: [row.excerpt ?? '', row.productA?.title ?? '', row.productB?.title ?? ''].join(' '),
      }),
      (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
    );
    const total = ranked.length;
    return {
      items: ranked.slice(skip, skip + query.perPage).map(presentComparison),
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.perPage)),
      },
    };
  }

  const [rows, total] = await prisma.$transaction([
    prisma.comparison.findMany({
      where: baseWhere,
      include: LIST_INCLUDE,
      orderBy: buildOrderBy(query.sort),
      skip,
      take: query.perPage,
    }),
    prisma.comparison.count({ where: baseWhere }),
  ]);

  return {
    items: rows.map(presentComparison),
    pagination: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.perPage)),
    },
  };
}

export async function getComparisonBySlug(
  slug: string,
  canSeeUnpublished: boolean,
): Promise<PresentedComparison> {
  const row = await prisma.comparison.findUnique({ where: { slug }, include: FULL_INCLUDE });
  if (!row || (!canSeeUnpublished && row.status !== 'published')) throw ApiError.notFound('Comparison not found');
  return presentComparison(row);
}

function comparisonExistsBySlug(slug: string): Promise<string | null> {
  return prisma.comparison.findUnique({ where: { slug }, select: { id: true } }).then((r) => r?.id ?? null);
}

function scalarData(body: Partial<CreateComparisonBody>): Prisma.ComparisonUncheckedUpdateInput {
  const d: Prisma.ComparisonUncheckedUpdateInput = {};
  if (body.title !== undefined) d.title = body.title;
  if (body.excerpt !== undefined) d.excerpt = body.excerpt;
  if (body.summary !== undefined) d.summary = body.summary;
  if (body.productAId !== undefined) d.productAId = body.productAId;
  if (body.productBId !== undefined) d.productBId = body.productBId;
  if (body.verdict !== undefined) d.verdict = body.verdict;
  if (body.winner !== undefined) d.winner = body.winner;
  if (body.prosCons !== undefined) d.prosCons = body.prosCons as Prisma.InputJsonValue;
  if (body.seoTitle !== undefined) d.seoTitle = body.seoTitle;
  if (body.metaDescription !== undefined) d.metaDescription = body.metaDescription;
  return d;
}

async function assertProducts(productAId?: string, productBId?: string): Promise<void> {
  const ids = [productAId, productBId].filter(Boolean) as string[];
  if (ids.length === 0) return;
  const found = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const foundIds = new Set(found.map((p) => p.id));
  for (const id of ids) {
    if (!foundIds.has(id)) throw ApiError.badRequest('Invalid product', { product: [`Product ${id} not found`] });
  }
}

async function syncSpecs(
  tx: Prisma.TransactionClient,
  comparisonId: string,
  specs: CreateComparisonBody['specs'],
): Promise<void> {
  if (specs === undefined) return;
  await tx.comparisonSpec.deleteMany({ where: { comparisonId } });
  if (specs.length > 0) {
    await tx.comparisonSpec.createMany({
      data: specs.map((s, i) => ({
        comparisonId,
        specName: s.specName,
        productAValue: s.productAValue ?? null,
        productBValue: s.productBValue ?? null,
        winner: s.winner ?? null,
        details: s.details ?? null,
        position: i,
      })),
    });
  }
}

async function syncProducts(
  tx: Prisma.TransactionClient,
  comparisonId: string,
  productAId: string,
  productBId: string,
): Promise<void> {
  await tx.comparisonProduct.deleteMany({ where: { comparisonId } });
  await tx.comparisonProduct.createMany({
    data: [
      { comparisonId, productId: productAId, position: 0 },
      { comparisonId, productId: productBId, position: 1 },
    ],
    skipDuplicates: true,
  });
}

export async function createComparison(body: CreateComparisonBody): Promise<PresentedComparison> {
  await assertProducts(body.productAId, body.productBId);
  const slug = await uniqueSlug(body.slug ?? body.title, comparisonExistsBySlug);
  const status = body.status ?? 'draft';

  const created = await prisma.$transaction(async (tx) => {
    const comparison = await tx.comparison.create({
      data: {
        ...(scalarData(body) as Prisma.ComparisonUncheckedCreateInput),
        slug,
        status,
        publishedAt: status === 'published' ? new Date() : null,
      },
    });
    await syncSpecs(tx, comparison.id, body.specs);
    await syncProducts(tx, comparison.id, body.productAId, body.productBId);
    return comparison;
  });

  return getComparisonById(created.id);
}

export async function updateComparison(
  id: string,
  body: Partial<CreateComparisonBody>,
): Promise<PresentedComparison> {
  const existing = await prisma.comparison.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Comparison not found');
  await assertProducts(body.productAId, body.productBId);

  const data = scalarData(body);
  if (body.slug) data.slug = await uniqueSlug(body.slug, comparisonExistsBySlug, id);
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === 'published' && !existing.publishedAt) data.publishedAt = new Date();
  }

  const finalA = body.productAId ?? existing.productAId;
  const finalB = body.productBId ?? existing.productBId;

  await prisma.$transaction(async (tx) => {
    await tx.comparison.update({ where: { id }, data });
    await syncSpecs(tx, id, body.specs);
    if (body.productAId !== undefined || body.productBId !== undefined) {
      await syncProducts(tx, id, finalA, finalB);
    }
  });

  return getComparisonById(id);
}

export async function deleteComparison(id: string): Promise<void> {
  const existing = await prisma.comparison.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Comparison not found');
  await prisma.comparison.delete({ where: { id } });
}

export async function setComparisonStatus(
  id: string,
  action: 'publish' | 'unpublish' | 'draft',
): Promise<PresentedComparison> {
  const existing = await prisma.comparison.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Comparison not found');

  if (action === 'publish') {
    await prisma.comparison.update({
      where: { id },
      data: { status: 'published', publishedAt: existing.publishedAt ?? new Date() },
    });
  } else {
    await prisma.comparison.update({ where: { id }, data: { status: 'draft' } });
  }
  return getComparisonById(id);
}

async function getComparisonById(id: string): Promise<PresentedComparison> {
  const row = await prisma.comparison.findUnique({ where: { id }, include: FULL_INCLUDE });
  if (!row) throw ApiError.notFound('Comparison not found');
  return presentComparison(row);
}
