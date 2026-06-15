# Phase 11 — Search Coverage Report

**Date:** 2026-06-15 · **Phase:** 11 — Discovery · **Status:** Complete

Advanced search over a unified `SearchIndexEntry` index across all 6 entity types. Deepens FR-027…032.

## 1. Requirement coverage

| Required feature | Status | Where |
| ---------------- | :----: | ----- |
| Full-text search | ✅ | weighted multi-field match over title/body/keywords (`search.service.ts`) |
| Fuzzy search | ✅ | bounded Levenshtein near-miss bonus + did-you-mean |
| Synonym support | ✅ | `SearchSynonym` + `expandTerms` (bidirectional) |
| Weighted results | ✅ | field weights × entry `boost` × hit count |
| Search suggestions | ✅ | `GET /api/search/suggestions` (prefix/contains on indexed titles) |
| Zero-result suggestions | ✅ | did-you-mean + nearest titles when total = 0 |
| Trending searches | ✅ | `GET /api/search/trending` (top `SearchQuery`, last 7 days) |
| Recent searches (frontend-safe) | ✅ | left client-only (search page), as specified |
| Across products/categories/brands/guides/comparisons/authors | ✅ | all 6 indexed by `rebuildIndex()` |

## 2. The index

`SearchIndexEntry` denormalises every published product / active category & brand / published guide &
comparison / active author into `{ title, body, keywords, boost, url, image }` (unique per
entityType+entityId). `rebuildIndex()` upserts + prunes stale entries; it runs from the **seed** (42
entries on the demo dataset) and the **discovery worker** (hourly), and can be triggered on demand via
`POST /api/search/reindex` (search.manage).

## 3. Scoring (weighted + fuzzy)

Per term: exact-title +10, title-prefix +6, title-contains +4, keyword-hit +2, body-hit +1, plus a
fuzzy near-miss (+2 when a title word is within edit-distance 1). The sum is multiplied by the entry's
`boost` (derived from review counts for products). Results are grouped by entity type.

## 4. Query expansion

The query is tokenised (stopwords + single chars dropped), then expanded with active synonyms before
matching — so "earphones" also matches "earbuds"/"headphones" (bidirectional groups).

## 5. Verification

- **Unit:** tokenizer (stopwords) + Levenshtein values.
- **Integration:** weighted advanced search returns scored hits; a **misspelled** query yields fuzzy
  matches/suggestions/did-you-mean; suggestions + trending endpoints; **synonym expansion** reflected in
  `expandedTerms`; on-demand reindex. All green vs embedded Postgres.

## 6. Honest gaps

- Uses a denormalised index + JS scoring rather than Postgres `tsvector`/`pg_trgm` (portable, extension-
  free, testable) — native FTS is a future optimization.
- The public search-page **results grid** still renders the existing client dataset; the advanced-search
  API is DB-backed and consumed by SSR recommendations + trending. Swapping the grid is a follow-up.
