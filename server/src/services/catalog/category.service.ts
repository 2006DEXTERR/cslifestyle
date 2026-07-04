import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http';
import { uniqueSlug } from '../../lib/slug';
import { presentCategory, type PresentedCategory } from './presenters';
import { cacheWrap, bust, CACHE_NS, TTL } from '../../lib/cache';
import type { CategoryListQuery, CreateCategoryBody } from '../../validation/catalog.schemas';

/** Map of categoryId → published-product count (for the UI productCount badge). */
async function publishedCounts(): Promise<Map<string, number>> {
  const rows = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { isPublished: true },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.categoryId, r._count._all]));
}

export async function listCategories(
  query: CategoryListQuery,
  canSeeInactive: boolean,
): Promise<PresentedCategory[]> {
  const run = async (): Promise<PresentedCategory[]> => {
    const and: Prisma.CategoryWhereInput[] = [];
    if (!canSeeInactive || query.status === 'active') and.push({ isActive: true });
    if (query.parent === 'root') and.push({ parentId: null });
    if (query.q) and.push({ name: { contains: query.q, mode: 'insensitive' } });

    const rows = await prisma.category.findMany({
      where: and.length ? { AND: and } : {},
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const counts = await publishedCounts();
    return rows.map((c) => presentCategory(c, counts.get(c.id) ?? 0));
  };

  // Cache only the public, non-search listing (changes rarely; short TTL self-heals).
  if (!canSeeInactive && !query.q) {
    return cacheWrap(`${CACHE_NS.categoryList}${query.status ?? 'active'}:${query.parent ?? 'all'}`, TTL.catalogList, run);
  }
  return run();
}

export async function getCategoryBySlug(
  slug: string,
  canSeeInactive: boolean,
): Promise<PresentedCategory> {
  if (!canSeeInactive) {
    return cacheWrap(`${CACHE_NS.categorySlug}${slug}`, TTL.detail, () => getCategoryBySlugUncached(slug, false));
  }
  return getCategoryBySlugUncached(slug, canSeeInactive);
}

async function getCategoryBySlugUncached(slug: string, canSeeInactive: boolean): Promise<PresentedCategory> {
  const row = await prisma.category.findUnique({ where: { slug } });
  if (!row || (!canSeeInactive && !row.isActive)) throw ApiError.notFound('Category not found');
  const count = await prisma.product.count({ where: { categoryId: row.id, isPublished: true } });
  return presentCategory(row, count);
}

function categoryExistsBySlug(slug: string): Promise<string | null> {
  return prisma.category.findUnique({ where: { slug }, select: { id: true } }).then((r) => r?.id ?? null);
}

function scalarData(body: Partial<CreateCategoryBody>): Prisma.CategoryUncheckedUpdateInput {
  const d: Prisma.CategoryUncheckedUpdateInput = {};
  if (body.name !== undefined) d.name = body.name;
  if (body.parentId !== undefined) d.parentId = body.parentId;
  if (body.description !== undefined) d.description = body.description;
  if (body.image !== undefined) d.image = body.image;
  if (body.icon !== undefined) d.icon = body.icon;
  if (body.seoTitle !== undefined) d.seoTitle = body.seoTitle;
  if (body.metaDescription !== undefined) d.metaDescription = body.metaDescription;
  if (body.subcategories !== undefined) d.subcategories = body.subcategories;
  if (body.isActive !== undefined) d.isActive = body.isActive;
  if (body.sortOrder !== undefined) d.sortOrder = body.sortOrder;
  return d;
}

async function assertParent(parentId: string | null | undefined, selfId?: string): Promise<void> {
  if (!parentId) return;
  if (parentId === selfId) throw ApiError.badRequest('A category cannot be its own parent');
  const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true } });
  if (!parent) throw ApiError.badRequest('Invalid parent', { parentId: ['Parent category not found'] });
}

export async function createCategory(body: CreateCategoryBody): Promise<PresentedCategory> {
  await assertParent(body.parentId ?? undefined);
  const slug = await uniqueSlug(body.slug ?? body.name, categoryExistsBySlug);
  const row = await prisma.category.create({
    data: { ...(scalarData(body) as Prisma.CategoryUncheckedCreateInput), slug },
  });
  await bust.categories();
  return presentCategory(row, 0);
}

export async function updateCategory(
  id: string,
  body: Partial<CreateCategoryBody> & { slug?: string },
): Promise<PresentedCategory> {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Category not found');
  await assertParent(body.parentId ?? undefined, id);

  const data = scalarData(body);
  if (body.slug) data.slug = await uniqueSlug(body.slug, categoryExistsBySlug, id);

  const row = await prisma.category.update({ where: { id }, data });
  const count = await prisma.product.count({ where: { categoryId: id, isPublished: true } });
  await bust.categories();
  return presentCategory(row, count);
}

export async function deleteCategory(id: string): Promise<void> {
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true, _count: { select: { products: true, children: true } } },
  });
  if (!existing) throw ApiError.notFound('Category not found');
  if (existing._count.products > 0) {
    throw new ApiError(409, 'Cannot delete a category that still has products');
  }
  if (existing._count.children > 0) {
    throw new ApiError(409, 'Cannot delete a category that has sub-categories');
  }
  await prisma.category.delete({ where: { id } });
  await bust.categories();
}
