import { randomBytes } from 'node:crypto';
import type { DuplicateMode, ImportItemStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { slugify, uniqueSlug } from '../../lib/slug';
import { isValidAsin, normalizeAsin } from '../../lib/affiliate';
import { parseNumber } from '../../lib/csv';
import { findOrCreateCategory, findOrCreateBrand, detectProductDuplicate } from './helpers';

export interface ProductRowInput {
  asin?: string;
  title?: string;
  brand?: string;
  category?: string;
  price?: string;
  originalPrice?: string;
  rating?: string;
  reviewCount?: string;
  imageUrl?: string;
  description?: string;
}

export interface RowResult {
  status: ImportItemStatus;
  productId?: string;
  errors: string[];
}

export const productExistsBySlug = (s: string): Promise<string | null> =>
  prisma.product.findUnique({ where: { slug: s }, select: { id: true } }).then((r) => r?.id ?? null);

/** Generate a unique synthetic ASIN (for create-copy of an ASIN duplicate). */
export async function deriveUniqueAsin(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = ('C' + randomBytes(8).toString('hex').toUpperCase()).slice(0, 10);
    const exists = await prisma.product.findUnique({ where: { asin: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return ('C' + randomBytes(8).toString('hex').toUpperCase()).slice(0, 10);
}

/** Import (or de-duplicate) a single product row per the configured DuplicateMode. */
export async function importProductRow(row: ProductRowInput, mode: DuplicateMode): Promise<RowResult> {
  const errors: string[] = [];
  const asin = normalizeAsin(row.asin ?? '');
  const title = (row.title ?? '').trim();

  if (!asin) errors.push('Missing ASIN');
  else if (!isValidAsin(asin)) errors.push(`Invalid ASIN format: "${asin}"`);
  if (!title) errors.push('Missing title');
  if (errors.length) return { status: 'failed', errors };

  const slug = slugify(title);
  const dup = await detectProductDuplicate(asin, slug, title);

  const buildData = async (slugVal: string, asinVal: string): Promise<Prisma.ProductUncheckedCreateInput> => ({
    asin: asinVal,
    title,
    slug: slugVal,
    shortDescription: (row.description ?? '').slice(0, 280) || null,
    description: row.description || null,
    image: row.imageUrl || null,
    currentPrice: row.price ? parseNumber(row.price) : null,
    originalPrice: row.originalPrice ? parseNumber(row.originalPrice) : null,
    rating: row.rating ? parseNumber(row.rating) : 0,
    reviewCount: row.reviewCount ? Math.round(parseNumber(row.reviewCount)) : 0,
    categoryId: await findOrCreateCategory(row.category ?? 'Uncategorized'),
    brandId: await findOrCreateBrand(row.brand),
    isPublished: false, // imported as draft; an editor publishes
  });

  if (dup) {
    if (mode === 'skip') {
      return { status: 'duplicate', productId: dup.product.id, errors: [`Duplicate by ${dup.matchType} — skipped`] };
    }
    if (mode === 'overwrite') {
      const data = await buildData(dup.product.slug, dup.product.asin);
      // Keep the existing asin/slug stable on overwrite.
      const { asin: _a, slug: _s, ...rest } = data;
      void _a;
      void _s;
      const updated = await prisma.product.update({ where: { id: dup.product.id }, data: rest });
      return { status: 'success', productId: updated.id, errors: [] };
    }
    // create_copy
    const copyTitle = `${title} (Copy)`;
    const copySlug = await uniqueSlug(copyTitle, productExistsBySlug);
    const copyAsin = dup.matchType === 'asin' ? await deriveUniqueAsin() : asin;
    const data = await buildData(copySlug, copyAsin);
    const created = await prisma.product.create({ data: { ...data, title: copyTitle } });
    return { status: 'success', productId: created.id, errors: [`Created copy of duplicate (${dup.matchType})`] };
  }

  const uniq = await uniqueSlug(slug, productExistsBySlug);
  const data = await buildData(uniq, asin);
  const created = await prisma.product.create({ data });
  return { status: 'success', productId: created.id, errors: [] };
}
