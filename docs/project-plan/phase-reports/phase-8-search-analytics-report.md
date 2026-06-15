# Phase 8 — Search Analytics Report

**Date:** 2026-06-15 · **Phase:** 8 · **Endpoint:** `GET /api/analytics/search` (analytics.view)

Search analytics over the existing `SearchQuery` table (FR-032, logged since Phase 2 by the catalog
search flow).

## 1. Outputs

| Field | Meaning |
| ----- | ------- |
| `topSearches` | most frequent queries (count + avg result count) |
| `zeroResultSearches` | queries with `resultsCount = 0` (content-gap signal) |
| `trends` | daily search-volume series |
| `total` | total searches in range |

## 2. Source

`SearchQuery` (query, type, resultsCount, ipHash, createdAt). The search endpoint already logs every
query (FR-032); this phase adds the analytics aggregation. `ipHash` is SHA-256 only and never returned.

## 3. Content-gap use (spec §3.3)

`zeroResultSearches` surfaces demand the catalog can't satisfy — directly feeding the content/import
pipeline (which products/guides to add next).

## 4. Verification

Integration test asserts the search payload exposes `topSearches`. Aggregations group by `query` with
counts + avg results; trends bucket by day.

## 5. Honest gaps

- Search-result-click-through (which result a user clicked) is not tracked in this phase — only query
  volume + zero-result detection. Click-through would require a result-level event (future work).
