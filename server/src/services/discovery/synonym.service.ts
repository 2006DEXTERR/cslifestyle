import { Prisma, type SearchSynonym } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError, type Pagination } from '../../lib/http';

/**
 * Search synonyms (Phase 11). Each row maps a term to equivalent terms; `expandTerms`
 * widens a query (bidirectionally) before matching so e.g. "earphones" also matches
 * "earbuds"/"headphones". Admin-managed (search.manage).
 */

export function present(s: SearchSynonym): Record<string, unknown> {
  return { id: s.id, term: s.term, synonyms: (s.synonyms as string[]) ?? [], isActive: s.isActive, updatedAt: s.updatedAt.toISOString() };
}

const norm = (s: string): string => s.trim().toLowerCase();

export async function listSynonyms(q: { page: number; perPage: number; search?: string }): Promise<{ items: unknown[]; pagination: Pagination }> {
  const where: Prisma.SearchSynonymWhereInput = q.search ? { term: { contains: q.search.toLowerCase() } } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.searchSynonym.findMany({ where, orderBy: { term: 'asc' }, skip: (q.page - 1) * q.perPage, take: q.perPage }),
    prisma.searchSynonym.count({ where }),
  ]);
  return { items: rows.map(present), pagination: { page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) } };
}

export async function createSynonym(input: { term: string; synonyms: string[]; isActive?: boolean }): Promise<Record<string, unknown>> {
  const term = norm(input.term);
  const existing = await prisma.searchSynonym.findUnique({ where: { term } });
  if (existing) throw new ApiError(409, 'A synonym entry for this term already exists');
  const syns = [...new Set(input.synonyms.map(norm).filter(Boolean))];
  const row = await prisma.searchSynonym.create({ data: { term, synonyms: syns, isActive: input.isActive ?? true } });
  return present(row);
}

export async function updateSynonym(id: string, input: { synonyms?: string[]; isActive?: boolean }): Promise<Record<string, unknown>> {
  const existing = await prisma.searchSynonym.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Synonym not found');
  const data: Prisma.SearchSynonymUpdateInput = {};
  if (input.synonyms) data.synonyms = [...new Set(input.synonyms.map(norm).filter(Boolean))];
  if (input.isActive !== undefined) data.isActive = input.isActive;
  const row = await prisma.searchSynonym.update({ where: { id }, data });
  return present(row);
}

export async function deleteSynonym(id: string): Promise<void> {
  const existing = await prisma.searchSynonym.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Synonym not found');
  await prisma.searchSynonym.delete({ where: { id } });
}

/** Expand query terms with active synonyms (bidirectional). */
export async function expandTerms(terms: string[]): Promise<string[]> {
  const lower = terms.map(norm);
  const rows = await prisma.searchSynonym.findMany({ where: { isActive: true } });
  const out = new Set(lower);
  for (const r of rows) {
    const syns = ((r.synonyms as string[]) ?? []).map(norm);
    const group = [r.term, ...syns];
    if (group.some((g) => lower.includes(g))) for (const g of group) out.add(g);
  }
  return [...out];
}
