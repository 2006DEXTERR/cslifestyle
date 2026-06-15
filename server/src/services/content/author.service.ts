import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http';
import type { Pagination } from '../../lib/http';
import { uniqueSlug } from '../../lib/slug';
import { presentAuthor, type PresentedAuthor } from './presenters';
import type { AuthorListQuery, CreateAuthorBody } from '../../validation/content.schemas';

/** Map of authorId → published-guide count (the UI "articles" stat). */
async function publishedGuideCounts(): Promise<Map<string, number>> {
  const rows = await prisma.guide.groupBy({
    by: ['authorId'],
    where: { status: 'published', authorId: { not: null } },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) if (r.authorId) map.set(r.authorId, r._count._all);
  return map;
}

export async function listAuthors(
  query: AuthorListQuery,
  canSeeInactive: boolean,
): Promise<{ items: PresentedAuthor[]; pagination: Pagination }> {
  const and: Prisma.AuthorWhereInput[] = [];
  if (!canSeeInactive || query.status === 'active') and.push({ isActive: true });
  if (query.q) and.push({ name: { contains: query.q, mode: 'insensitive' } });
  const where = and.length ? { AND: and } : {};

  const orderBy: Prisma.AuthorOrderByWithRelationInput =
    query.sort === 'newest' ? { createdAt: 'desc' } : { name: 'asc' };
  const skip = (query.page - 1) * query.perPage;

  const [rows, total, counts] = await Promise.all([
    prisma.author.findMany({ where, orderBy, skip, take: query.perPage }),
    prisma.author.count({ where }),
    publishedGuideCounts(),
  ]);

  return {
    items: rows.map((a) => presentAuthor(a, { articlesCount: counts.get(a.id) ?? 0 })),
    pagination: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.perPage)),
    },
  };
}

export async function getAuthorBySlug(
  slug: string,
  canSeeInactive: boolean,
): Promise<PresentedAuthor> {
  const author = await prisma.author.findUnique({ where: { slug } });
  if (!author || (!canSeeInactive && !author.isActive)) throw ApiError.notFound('Author not found');

  const guides = await prisma.guide.findMany({
    where: { authorId: author.id, ...(canSeeInactive ? {} : { status: 'published' }) },
    include: { category: true, author: true },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  });

  const published = guides.filter((g) => g.status === 'published').length;
  return presentAuthor(author, { guides, articlesCount: published });
}

function authorExistsBySlug(slug: string): Promise<string | null> {
  return prisma.author.findUnique({ where: { slug }, select: { id: true } }).then((r) => r?.id ?? null);
}

function scalarData(body: Partial<CreateAuthorBody>): Prisma.AuthorUncheckedUpdateInput {
  const d: Prisma.AuthorUncheckedUpdateInput = {};
  if (body.name !== undefined) d.name = body.name;
  if (body.avatarUrl !== undefined) d.avatarUrl = body.avatarUrl;
  if (body.bio !== undefined) d.bio = body.bio;
  if (body.credentials !== undefined) d.credentials = body.credentials;
  if (body.expertise !== undefined) d.expertise = body.expertise;
  if (body.socialLinks !== undefined) d.socialLinks = body.socialLinks as Prisma.InputJsonValue;
  if (body.seoTitle !== undefined) d.seoTitle = body.seoTitle;
  if (body.metaDescription !== undefined) d.metaDescription = body.metaDescription;
  if (body.isActive !== undefined) d.isActive = body.isActive;
  return d;
}

export async function createAuthor(body: CreateAuthorBody): Promise<PresentedAuthor> {
  const slug = await uniqueSlug(body.slug ?? body.name, authorExistsBySlug);
  const row = await prisma.author.create({
    data: { ...(scalarData(body) as Prisma.AuthorUncheckedCreateInput), slug },
  });
  return presentAuthor(row, { articlesCount: 0 });
}

export async function updateAuthor(
  id: string,
  body: Partial<CreateAuthorBody> & { slug?: string },
): Promise<PresentedAuthor> {
  const existing = await prisma.author.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Author not found');

  const data = scalarData(body);
  if (body.slug) data.slug = await uniqueSlug(body.slug, authorExistsBySlug, id);

  const row = await prisma.author.update({ where: { id }, data });
  const count = await prisma.guide.count({ where: { authorId: id, status: 'published' } });
  return presentAuthor(row, { articlesCount: count });
}

export async function deleteAuthor(id: string): Promise<void> {
  const existing = await prisma.author.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Author not found');
  // Guides keep existing — their authorId is set NULL by the FK (onDelete: SetNull).
  await prisma.author.delete({ where: { id } });
}
