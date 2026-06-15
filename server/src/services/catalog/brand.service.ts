import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http';
import { uniqueSlug } from '../../lib/slug';
import { presentBrand, type PresentedBrand } from './presenters';
import type { BrandListQuery, CreateBrandBody } from '../../validation/catalog.schemas';

async function publishedCounts(): Promise<Map<string, number>> {
  const rows = await prisma.product.groupBy({
    by: ['brandId'],
    where: { isPublished: true, brandId: { not: null } },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) if (r.brandId) map.set(r.brandId, r._count._all);
  return map;
}

export async function listBrands(
  query: BrandListQuery,
  canSeeInactive: boolean,
): Promise<PresentedBrand[]> {
  const and: Prisma.BrandWhereInput[] = [];
  if (!canSeeInactive || query.status === 'active') and.push({ isActive: true });
  if (query.q) and.push({ name: { contains: query.q, mode: 'insensitive' } });

  const rows = await prisma.brand.findMany({
    where: and.length ? { AND: and } : {},
    orderBy: { name: 'asc' },
  });
  const counts = await publishedCounts();
  return rows.map((b) => presentBrand(b, counts.get(b.id) ?? 0));
}

export async function getBrandBySlug(
  slug: string,
  canSeeInactive: boolean,
): Promise<PresentedBrand> {
  const row = await prisma.brand.findUnique({ where: { slug } });
  if (!row || (!canSeeInactive && !row.isActive)) throw ApiError.notFound('Brand not found');
  const count = await prisma.product.count({ where: { brandId: row.id, isPublished: true } });
  return presentBrand(row, count);
}

function brandExistsBySlug(slug: string): Promise<string | null> {
  return prisma.brand.findUnique({ where: { slug }, select: { id: true } }).then((r) => r?.id ?? null);
}

function scalarData(body: Partial<CreateBrandBody>): Prisma.BrandUncheckedUpdateInput {
  const d: Prisma.BrandUncheckedUpdateInput = {};
  if (body.name !== undefined) d.name = body.name;
  if (body.logo !== undefined) d.logo = body.logo;
  if (body.description !== undefined) d.description = body.description;
  if (body.website !== undefined) d.website = body.website;
  if (body.seoTitle !== undefined) d.seoTitle = body.seoTitle;
  if (body.metaDescription !== undefined) d.metaDescription = body.metaDescription;
  if (body.rating !== undefined) d.rating = body.rating;
  if (body.isActive !== undefined) d.isActive = body.isActive;
  return d;
}

export async function createBrand(body: CreateBrandBody): Promise<PresentedBrand> {
  const slug = await uniqueSlug(body.slug ?? body.name, brandExistsBySlug);
  const row = await prisma.brand.create({
    data: { ...(scalarData(body) as Prisma.BrandUncheckedCreateInput), slug },
  });
  return presentBrand(row, 0);
}

export async function updateBrand(
  id: string,
  body: Partial<CreateBrandBody> & { slug?: string },
): Promise<PresentedBrand> {
  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Brand not found');

  const data = scalarData(body);
  if (body.slug) data.slug = await uniqueSlug(body.slug, brandExistsBySlug, id);

  const row = await prisma.brand.update({ where: { id }, data });
  const count = await prisma.product.count({ where: { brandId: id, isPublished: true } });
  return presentBrand(row, count);
}

export async function deleteBrand(id: string): Promise<void> {
  const existing = await prisma.brand.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Brand not found');
  // Products keep existing — their brandId is set NULL by the FK (onDelete: SetNull).
  await prisma.brand.delete({ where: { id } });
}
