/**
 * Search relevance toolkit — token + word-boundary matching, singular/plural folding,
 * a small safe synonym map, and weighted ranking. Pure & synchronous so it can be
 * unit-tested directly and reused by every catalog/content `q` search.
 *
 * Why not naive substring (the bug this replaces):
 *   - `contains 'phone'` also matches "headphone" → wrong results.
 *   - Model-named products ("Acer Aspire 3") never contain the word "laptop", so a
 *     substring query for "laptop" misses the whole category.
 * Fix: tokenise both the query and the document, match on whole tokens (word
 * boundaries), fold singular/plural, expand a few safe storefront synonyms, and rank
 * by where the match landed (title > category > brand > specs).
 */

/** Common words that carry no search signal. */
const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'at', 'with',
  'best', 'top', 'vs', 'under', 'cheap', 'buy', 'review', 'reviews',
]);

/**
 * Safe, unambiguous storefront synonyms used to EXPAND the query only. These let
 * "phone" find the "Smartphones" category without ever matching "headphone" (because
 * matching stays word-boundary: we add the token `smartphone`, which never equals
 * `headphone`). This is search vocabulary — not product data.
 */
const SYNONYMS: Record<string, string[]> = {
  phone: ['smartphone', 'mobile'],
  smartphone: ['phone', 'mobile'],
  mobile: ['smartphone', 'phone'],
  tv: ['television'],
  television: ['tv'],
  laptop: ['notebook'],
  notebook: ['laptop'],
  earbud: ['earphone'],
  earphone: ['earbud'],
  fridge: ['refrigerator'],
  refrigerator: ['fridge'],
  watch: ['smartwatch'],
  smartwatch: ['watch'],
  ac: ['air', 'conditioner'],
};

/** Split text into lowercase word tokens, dropping punctuation, stopwords and noise. */
export function tokenize(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Naive English singulariser so laptop/laptops and watch/watches fold together. */
export function singularize(t: string): string {
  if (t.length <= 3) return t;
  if (t.endsWith('ies')) return `${t.slice(0, -3)}y`; // batteries → battery
  if (t.endsWith('ses') || t.endsWith('xes') || t.endsWith('ches') || t.endsWith('shes')) {
    return t.slice(0, -2); // watches → watch, boxes → box
  }
  if (t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1); // laptops → laptop
  return t;
}

/** The set of normalised forms a query token can match: itself + safe synonyms. */
export function variantSet(token: string): Set<string> {
  const base = singularize(token);
  const out = new Set<string>([base]);
  for (const syn of SYNONYMS[base] ?? []) out.add(singularize(syn));
  return out;
}

/** Expand + normalise raw query tokens to the full set of forms used for LIKE recall. */
export function expandQueryTokens(tokens: string[]): string[] {
  const out = new Set<string>();
  for (const t of tokens) for (const v of variantSet(t)) out.add(v);
  return [...out];
}

function containsConsecutive(hay: string[], needle: string[]): boolean {
  if (!needle.length || needle.length > hay.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

/** A document's searchable fields. `keywords` holds weak text (specs/highlights/excerpt). */
export interface SearchDoc {
  title: string;
  slug?: string | null;
  category?: string | null;
  brand?: string | null;
  keywords?: string | string[] | null;
}

// Field weights → ranking tiers (exact title ≫ title token ≫ category ≫ brand ≫ specs).
const W = {
  exactTitle: 1000,
  titlePhrase: 300,
  titleToken: 100,
  titlePrefix: 25, // safe partial (prefix only), tier 6
  slugToken: 18,
  categoryToken: 60,
  brandToken: 45,
  keywordToken: 12,
  keywordPrefix: 4,
} as const;

const flatten = (v: SearchDoc['keywords']): string =>
  !v ? '' : Array.isArray(v) ? v.join(' ') : v;

/**
 * Relevance score for one document against a query. 0 means "no safe match" — the
 * caller should exclude it (this is what keeps "headphone" out of a "phone" search).
 */
export function relevanceScore(query: string, doc: SearchDoc): number {
  const qBase = tokenize(query).map(singularize);
  if (!qBase.length) return 0;

  const titleTokens = tokenize(doc.title);
  const titleNorm = titleTokens.map(singularize);
  const slugNorm = tokenize(doc.slug).map(singularize);
  const catNorm = tokenize(doc.category).map(singularize);
  const brandNorm = tokenize(doc.brand).map(singularize);
  const kwTokens = tokenize(flatten(doc.keywords));
  const kwNorm = kwTokens.map(singularize);

  let score = 0;

  // Tier 1: whole-title exact match (order-sensitive, normalised).
  if (titleNorm.length && titleNorm.join(' ') === qBase.join(' ')) {
    score += W.exactTitle;
  } else if (containsConsecutive(titleNorm, qBase)) {
    // Tier 1b: title contains the full query phrase as consecutive words.
    score += W.titlePhrase;
  }

  const hasVariant = (arr: string[], variants: Set<string>) => arr.some((w) => variants.has(w));

  for (const base of qBase) {
    const variants = variantSet(base);

    if (hasVariant(titleNorm, variants)) {
      score += W.titleToken; // tier 2
    } else if (titleTokens.some((w) => w.length >= 3 && [...variants].some((v) => v.length >= 3 && w.startsWith(v)))) {
      score += W.titlePrefix; // tier 6 — safe partial (prefix of a title word)
    }

    if (hasVariant(catNorm, variants)) score += W.categoryToken; // tier 3
    if (hasVariant(brandNorm, variants)) score += W.brandToken; // tier 4
    if (hasVariant(slugNorm, variants)) score += W.slugToken;

    if (kwNorm.length) {
      if (hasVariant(kwNorm, variants)) score += W.keywordToken; // tier 5
      else if (kwTokens.some((w) => w.length >= 4 && [...variants].some((v) => v.length >= 3 && w.startsWith(v)))) {
        score += W.keywordPrefix;
      }
    }
  }

  return score;
}

/** Rank docs by relevance (desc), keeping only safe matches (score > 0). Stable tie-break via `secondary`. */
export function rankBySearch<T>(
  query: string,
  docs: T[],
  toDoc: (item: T) => SearchDoc,
  secondary?: (a: T, b: T) => number,
): T[] {
  return docs
    .map((item, i) => ({ item, i, score: relevanceScore(query, toDoc(item)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (secondary ? secondary(a.item, b.item) : 0) || a.i - b.i)
    .map((x) => x.item);
}

/**
 * LIKE fragments for a coarse DB pre-filter (recall). Returns the distinct token forms
 * (token + singular + synonyms) to OR across searchable columns before JS ranking. We
 * filter precisely in {@link relevanceScore}; this only narrows the candidate set.
 */
export function likeFragments(query: string): string[] {
  return expandQueryTokens(tokenize(query)).filter((t) => t.length > 1);
}
