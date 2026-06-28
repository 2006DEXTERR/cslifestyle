import { Prisma, type SearchEntityType, type SearchIndexEntry } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { expandTerms } from './synonym.service';
import { tokenize as relTokenize, likeFragments, relevanceScore, type SearchDoc } from '../../lib/search';
import { cacheWrap } from '../../lib/cache';

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

/** Predictive autocomplete suggestion, tagged with its source so the UI can group it. */
export type SuggestionType = 'product' | 'category' | 'brand' | 'guide' | 'comparison' | 'popular';
export interface SearchSuggestion {
  label: string;
  type: SuggestionType;
}

/**
 * Predictive autocomplete suggestions sourced ONLY from existing DB content — category &
 * brand names, product / guide / comparison titles, and previous valid search queries
 * (`popular`). Matching is word-boundary safe (so "phone" never suggests a "headphone")
 * with a strong prefix boost for next-word completion (typing "lap" → "Laptops"). Capped
 * at `limit` (max 8). Empty/too-short queries fall back to trending past searches.
 */
export async function searchSuggestions(q: string, limit = 8): Promise<SearchSuggestion[]> {
  const cap = Math.min(limit, 8);
  const term = q.trim();
  // Short-TTL cache: autocomplete fires on every keystroke; suggestions change rarely.
  return cacheWrap(`sugg:${cap}:${term.toLowerCase()}`, 30, () => computeSuggestions(term, cap));
}

async function computeSuggestions(term: string, cap: number): Promise<SearchSuggestion[]> {
  const trendingFallback = async (): Promise<SearchSuggestion[]> =>
    (await trendingTerms(cap)).map((t) => ({ label: t, type: 'popular' as const }));

  if (relTokenize(term).length === 0) return trendingFallback();
  const fragments = likeFragments(term);
  if (!fragments.length) return trendingFallback();
  const like = (f: string) => ({ contains: f, mode: 'insensitive' as const });

  const [categories, brands, products, guides, comparisons, recent] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true, OR: fragments.flatMap((f) => [{ name: like(f) }, { slug: like(f) }]) }, select: { name: true }, take: 20 }),
    prisma.brand.findMany({ where: { isActive: true, OR: fragments.flatMap((f) => [{ name: like(f) }, { slug: like(f) }]) }, select: { name: true }, take: 20 }),
    prisma.product.findMany({
      where: { isPublished: true, OR: fragments.flatMap((f) => [{ title: like(f) }, { category: { is: { name: like(f) } } }, { brand: { is: { name: like(f) } } }]) },
      select: { title: true, category: { select: { name: true } }, brand: { select: { name: true } } },
      take: 40,
    }),
    prisma.guide.findMany({ where: { status: 'published', OR: fragments.map((f) => ({ title: like(f) })) }, select: { title: true }, take: 20 }),
    prisma.comparison.findMany({ where: { status: 'published', OR: fragments.map((f) => ({ title: like(f) })) }, select: { title: true }, take: 20 }),
    prisma.searchQuery.findMany({ where: { resultsCount: { gt: 0 }, OR: fragments.map((f) => ({ query: like(f) })) }, select: { query: true }, distinct: ['query'], orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  // weight nudges short, high-value labels (category/brand/past query) above product titles.
  const cands: { label: string; type: SuggestionType; doc: SearchDoc; weight: number }[] = [
    ...categories.map((c) => ({ label: c.name, type: 'category' as const, doc: { title: c.name } as SearchDoc, weight: 5 })),
    ...brands.map((b) => ({ label: b.name, type: 'brand' as const, doc: { title: b.name } as SearchDoc, weight: 4 })),
    ...recent.map((r) => ({ label: r.query, type: 'popular' as const, doc: { title: r.query } as SearchDoc, weight: 3 })),
    ...guides.map((g) => ({ label: g.title, type: 'guide' as const, doc: { title: g.title } as SearchDoc, weight: 2 })),
    ...comparisons.map((c) => ({ label: c.title, type: 'comparison' as const, doc: { title: c.title } as SearchDoc, weight: 2 })),
    ...products.map((p) => ({ label: p.title, type: 'product' as const, doc: { title: p.title, category: p.category?.name ?? null, brand: p.brand?.name ?? null } as SearchDoc, weight: 1 })),
  ];

  const lower = term.toLowerCase();
  const scored = cands
    .map((c) => {
      const rel = relevanceScore(term, c.doc); // 0 ⇒ not a safe word-boundary match
      const prefix = c.label.toLowerCase().startsWith(lower) ? 500 : 0; // next-word completion boost
      return { label: c.label, type: c.type, key: rel + prefix + c.weight, ok: rel > 0 };
    })
    .filter((x) => x.ok)
    .sort((a, b) => b.key - a.key || a.label.length - b.label.length);

  // De-dupe case-insensitively, preserving the best-ranked source/type.
  const seen = new Set<string>();
  const out: SearchSuggestion[] = [];
  for (const s of scored) {
    const k = s.label.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ label: s.label, type: s.type });
    if (out.length >= cap) break;
  }
  return out;
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
