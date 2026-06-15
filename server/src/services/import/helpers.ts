import type { Product } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { slugify, uniqueSlug } from '../../lib/slug';

/** Find a category by slug/name (case-insensitive) or create it. Returns the id. */
export async function findOrCreateCategory(name: string): Promise<string> {
  const trimmed = name.trim() || 'Uncategorized';
  const slug = slugify(trimmed);
  const existing = await prisma.category.findFirst({
    where: { OR: [{ slug }, { name: { equals: trimmed, mode: 'insensitive' } }] },
    select: { id: true },
  });
  if (existing) return existing.id;
  const uniq = await uniqueSlug(trimmed, (s) =>
    prisma.category.findUnique({ where: { slug: s }, select: { id: true } }).then((r) => r?.id ?? null),
  );
  const created = await prisma.category.create({ data: { name: trimmed, slug: uniq, isActive: true } });
  return created.id;
}

/** Find a brand by slug/name or create it. Returns the id (null for an empty name). */
export async function findOrCreateBrand(name: string | undefined | null): Promise<string | null> {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return null;
  const slug = slugify(trimmed);
  const existing = await prisma.brand.findFirst({
    where: { OR: [{ slug }, { name: { equals: trimmed, mode: 'insensitive' } }] },
    select: { id: true },
  });
  if (existing) return existing.id;
  const uniq = await uniqueSlug(trimmed, (s) =>
    prisma.brand.findUnique({ where: { slug: s }, select: { id: true } }).then((r) => r?.id ?? null),
  );
  const created = await prisma.brand.create({ data: { name: trimmed, slug: uniq, isActive: true } });
  return created.id;
}

export type DuplicateMatch = 'asin' | 'slug' | 'title';

export interface DuplicateResult {
  product: Pick<Product, 'id' | 'asin' | 'slug' | 'title'>;
  matchType: DuplicateMatch;
}

/**
 * Detect a duplicate product by ASIN (strongest), then slug, then title
 * (FR-019). Returns the matched product + how it matched, or null.
 */
export async function detectProductDuplicate(
  asin: string,
  slug: string,
  title: string,
): Promise<DuplicateResult | null> {
  const byAsin = await prisma.product.findUnique({
    where: { asin },
    select: { id: true, asin: true, slug: true, title: true },
  });
  if (byAsin) return { product: byAsin, matchType: 'asin' };

  const bySlug = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, asin: true, slug: true, title: true },
  });
  if (bySlug) return { product: bySlug, matchType: 'slug' };

  const byTitle = await prisma.product.findFirst({
    where: { title: { equals: title, mode: 'insensitive' } },
    select: { id: true, asin: true, slug: true, title: true },
  });
  if (byTitle) return { product: byTitle, matchType: 'title' };

  return null;
}
