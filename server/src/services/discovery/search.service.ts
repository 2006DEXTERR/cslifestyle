import { Prisma, type SearchEntityType, type SearchIndexEntry } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { expandTerms } from './synonym.service';

/**
 * Advanced search (Phase 11) over the unified `SearchIndexEntry`. Tokenises + synonym-
 * expands the query, matches across title/body/keywords for all 6 entity types, scores
 * results (weighted by field + entry boost + hit count), and offers fuzzy "did you mean"
 * + trending suggestions for zero-result queries. Every query is logged (FR-032).
 */

export interface AdvancedSearchInput {
  q: string;
  types?: SearchEntityType[];
  limit?: number;
  page?: number;
}

export interface SearchHit {
  entityType: SearchEntityType;
  entityId: string;
  title: string;
  slug: string | null;
  url: string | null;
  image: string | null;
  snippet: string | null;
  score: number;
}

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'with', 'best']);

export function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));
}

/** Levenshtein edit distance (bounded use — short tokens only). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = tmp;
    }
  }
  return dp[m];
}

function scoreEntry(entry: SearchIndexEntry, terms: string[]): number {
  const title = entry.title.toLowerCase();
  const body = (entry.body ?? '').toLowerCase();
  const keywords = (entry.keywords ?? '').toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (title === t) s += 10;
    else if (title.startsWith(t)) s += 6;
    else if (title.includes(t)) s += 4;
    if (keywords.includes(t)) s += 2;
    if (body.includes(t)) s += 1;
    // Fuzzy near-miss on a title word.
    if (!title.includes(t) && title.split(/\s+/).some((w) => editDistance(w, t) <= 1)) s += 2;
  }
  return s * (entry.boost || 1);
}

function present(entry: SearchIndexEntry, score: number): SearchHit {
  const body = entry.body ?? '';
  return {
    entityType: entry.entityType,
    entityId: entry.entityId,
    title: entry.title,
    slug: entry.slug,
    url: entry.url,
    image: entry.image,
    snippet: body.slice(0, 160) || null,
    score: Number(score.toFixed(2)),
  };
}

export interface AdvancedSearchResult {
  query: string;
  expandedTerms: string[];
  total: number;
  groups: Record<string, SearchHit[]>;
  hits: SearchHit[];
  suggestions: string[];
  didYouMean: string | null;
}

export async function advancedSearch(input: AdvancedSearchInput, ipHash?: string): Promise<AdvancedSearchResult> {
  const limit = Math.min(input.limit ?? 24, 50);
  const baseTerms = tokenize(input.q);
  const terms = baseTerms.length ? await expandTerms(baseTerms) : [];

  const where: Prisma.SearchIndexEntryWhereInput = {};
  if (input.types?.length) where.entityType = { in: input.types };
  if (terms.length) {
    where.OR = terms.flatMap((t) => [
      { title: { contains: t, mode: 'insensitive' as const } },
      { body: { contains: t, mode: 'insensitive' as const } },
      { keywords: { contains: t, mode: 'insensitive' as const } },
    ]);
  }

  const candidates = terms.length ? await prisma.searchIndexEntry.findMany({ where, take: 400 }) : [];
  const scored = candidates
    .map((e) => ({ e, score: scoreEntry(e, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const hits = scored.slice(0, limit).map((x) => present(x.e, x.score));
  const groups: Record<string, SearchHit[]> = {};
  for (const h of hits) (groups[h.entityType] ??= []).push(h);

  // Suggestions / did-you-mean (always useful, critical for zero-result).
  let suggestions: string[] = [];
  let didYouMean: string | null = null;
  if (hits.length < 5 && baseTerms.length) {
    const titles = await prisma.searchIndexEntry.findMany({ select: { title: true }, take: 500 });
    const ranked = titles
      .map((t) => ({ title: t.title, d: Math.min(...baseTerms.map((bt) => Math.min(...t.title.toLowerCase().split(/\s+/).map((w) => editDistance(w, bt))))) }))
      .filter((x) => x.d <= 2)
      .sort((a, b) => a.d - b.d);
    suggestions = [...new Set(ranked.map((r) => r.title))].slice(0, 6);
    if (hits.length === 0 && ranked.length) didYouMean = ranked[0].title;
  }

  const total = scored.length;
  try {
    await prisma.searchQuery.create({ data: { query: input.q.slice(0, 200), type: 'advanced', resultsCount: total, ipHash: ipHash ?? null } });
  } catch (err) {
    logger.warn({ err }, 'failed to log advanced search');
  }

  return { query: input.q, expandedTerms: terms, total, groups, hits, suggestions, didYouMean };
}

/** Autocomplete suggestions (prefix/contains on indexed titles) + trending fallback. */
export async function searchSuggestions(q: string, limit = 8): Promise<string[]> {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return trendingTerms(limit);
  const rows = await prisma.searchIndexEntry.findMany({
    where: { title: { contains: term, mode: 'insensitive' } },
    select: { title: true, boost: true },
    orderBy: { boost: 'desc' },
    take: 30,
  });
  const titles = rows
    .map((r) => r.title)
    .sort((a, b) => Number(b.toLowerCase().startsWith(term)) - Number(a.toLowerCase().startsWith(term)));
  return [...new Set(titles)].slice(0, limit);
}

/** Trending search terms (most frequent non-empty queries, last 7 days). */
export async function trendingTerms(limit = 8): Promise<string[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await prisma.searchQuery.groupBy({
    by: ['query'],
    where: { createdAt: { gte: since }, resultsCount: { gt: 0 } },
    _count: { query: true },
    orderBy: { _count: { query: 'desc' } },
    take: limit,
  });
  return rows.map((r) => r.query);
}
