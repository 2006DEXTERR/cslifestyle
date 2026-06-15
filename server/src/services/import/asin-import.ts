import type { DuplicateMode } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { uniqueSlug } from '../../lib/slug';
import { isValidAsin, normalizeAsin } from '../../lib/affiliate';
import { findOrCreateCategory } from './helpers';
import { productExistsBySlug, deriveUniqueAsin, type RowResult } from './product-import';

/**
 * Import one ASIN → a DRAFT product stub (asin + placeholder title), to be
 * enriched later (PA-API is a future phase). Duplicate-aware per FR-019.
 */
export async function importAsinRow(rawAsin: string, mode: DuplicateMode): Promise<RowResult> {
  const asin = normalizeAsin(rawAsin);
  if (!asin) return { status: 'failed', errors: ['Empty ASIN'] };
  if (!isValidAsin(asin)) return { status: 'failed', errors: [`Invalid ASIN format: "${asin}"`] };

  const existing = await prisma.product.findUnique({ where: { asin }, select: { id: true } });

  if (existing && mode !== 'create_copy') {
    // skip / overwrite (no new data to overwrite) → treat as duplicate
    return { status: 'duplicate', productId: existing.id, errors: ['ASIN already exists — skipped'] };
  }

  const useAsin = existing ? await deriveUniqueAsin() : asin;
  const title = `Product ${useAsin}`;
  const slug = await uniqueSlug(title, productExistsBySlug);
  const categoryId = await findOrCreateCategory('Uncategorized');
  const created = await prisma.product.create({
    data: { asin: useAsin, title, slug, categoryId, isPublished: false },
  });
  return {
    status: 'success',
    productId: created.id,
    errors: existing ? ['Created copy of existing ASIN'] : [],
  };
}
