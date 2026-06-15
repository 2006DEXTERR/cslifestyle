# Phase 11 — Remaining Work Report (Honest Gaps)

**Date:** 2026-06-15 · **Phase:** 11 — Discovery

What Phase 11 deliberately did not do, called out so scope is unambiguous.

## 1. In-scope but intentionally limited

| Area | Shipped | Gap / deferred |
| ---- | ------- | -------------- |
| Search engine | Unified index table + weighted/fuzzy/synonym JS scoring (DB-backed, extension-free, testable) | **Postgres `tsvector`/GIN + `pg_trgm`** native FTS is a future optimization (the embedded test DB doesn't guarantee extensions). |
| Public search page | **Trending chips** now use real `/api/search/trending`; advanced-search API is DB-backed | The search **results grid** still renders the existing client dataset; swapping it to the advanced-search API (full objects per hit) is a follow-up — kept out to fully preserve the elaborate page layout. |
| Category / brand detail recs | Those pages already render DB-backed catalog product lists | Not re-pointed to the recommendation endpoint (they're already real); product/guide/comparison detail **were** wired to real recommendations. |
| Internal links | Suggestions + review + broken-link **detection** | **Auto-insert** into content is intentionally not done (review-only). Broken findings are returned, not persisted as a triage queue. |
| Recommendations | On-demand compute from live signals + rules | No **precomputed cache** (a `recommendation-recalc` worker hook exists) and no **per-user personalisation** (content-based + popularity only). |
| Workers | inline path tested in CI | BullMQ path not exercised in CI (no Redis); shares the same `runDiscoveryJob`. |

## 2. Out of scope (correctly untouched)

Per the mandate, **none** of these were started: **Deployment**, **Production Infrastructure**, **Final
Audit**. No framework migration, no redesign.

## 3. Data caveats

- Advanced search depends on the **search index** — built by the seed (42 entries on the demo data) and
  the hourly worker / on-demand `reindex`. After content changes, reindex (or wait for the worker).
- Recommendations reflect **real** signals — trending/affiliate weighting needs accrued ProductView/
  AffiliateClick data to differentiate; on a fresh DB they fall back to category/rating/price.

## 4. Summary

Discovery is **functionally complete** for the Phase 11 requirements (advanced search incl. fuzzy +
synonyms + weighting + suggestions + trending; a rule-configurable recommendation engine with affiliate
weighting; review-only internal-linking + broken-link detection; public SSR recommendations; admin UI;
RBAC). The principal honest gaps are **native Postgres FTS**, **wiring the search results grid**, and
**precomputed/personalised recommendations** — all incremental, none blocking.
