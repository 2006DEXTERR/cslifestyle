import type { DuplicateMode, ImportItemStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { slugify, uniqueSlug } from '../../lib/slug';
import { findOrCreateCategory } from './helpers';

export interface CategoryRowInput {
  name?: string;
  parentName?: string;
  slug?: string;
  description?: string;
}
export interface CategoryRowResult {
  status: ImportItemStatus;
  categoryId?: string;
  errors: string[];
}

const catExistsBySlug = (s: string): Promise<string | null> =>
  prisma.category.findUnique({ where: { slug: s }, select: { id: true } }).then((r) => r?.id ?? null);

/** Import one category (nested via `parentName`, FR-018) with slug generation + dedup. */
export async function importCategoryRow(
  row: CategoryRowInput,
  mode: DuplicateMode,
): Promise<CategoryRowResult> {
  const name = (row.name ?? '').trim();
  if (!name) return { status: 'failed', errors: ['Missing category name'] };

  const slug = slugify(row.slug || name);
  const parentName = (row.parentName ?? '').trim();
  // Resolve (creating if needed) the parent — but never make a category its own parent.
  const parentId =
    parentName && parentName.toLowerCase() !== name.toLowerCase()
      ? await findOrCreateCategory(parentName)
      : null;

  const existing = await prisma.category.findFirst({
    where: { OR: [{ slug }, { name: { equals: name, mode: 'insensitive' } }] },
    select: { id: true },
  });

  if (existing) {
    if (mode === 'skip') {
      return { status: 'duplicate', categoryId: existing.id, errors: ['Category already exists — skipped'] };
    }
    if (mode === 'overwrite') {
      const u = await prisma.category.update({
        where: { id: existing.id },
        data: { description: row.description || undefined, parentId: parentId ?? undefined },
      });
      return { status: 'success', categoryId: u.id, errors: [] };
    }
    // create_copy
    const copyName = `${name} (Copy)`;
    const copySlug = await uniqueSlug(copyName, catExistsBySlug);
    const c = await prisma.category.create({
      data: { name: copyName, slug: copySlug, description: row.description || null, parentId, isActive: true },
    });
    return { status: 'success', categoryId: c.id, errors: ['Created copy of duplicate'] };
  }

  const uniq = await uniqueSlug(slug, catExistsBySlug);
  const c = await prisma.category.create({
    data: { name, slug: uniq, description: row.description || null, parentId, isActive: true },
  });
  return { status: 'success', categoryId: c.id, errors: [] };
}
