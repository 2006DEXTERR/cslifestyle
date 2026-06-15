# Phase 6 — Remaining Work Report (Honest Gaps)

**Date:** 2026-06-15 · **Phase:** 6 — Import Center & Catalog Automation

What Phase 6 deliberately did **not** do, and what remains for later phases. Nothing here is a silent
gap — each item is called out so scope is unambiguous.

## 1. In-scope but intentionally limited

| Area | Shipped | Gap / deferred |
| ---- | ------- | -------------- |
| ASIN import | Creates a **draft stub product** (`Product <ASIN>`) per new ASIN; duplicate detection works | **No live Amazon PA-API enrichment** (real title/price/image/rating). That requires the PA-API credentials + the import-sync phase. |
| URL import | The mock UI's "URL Import" card is **preserved** but flagged "not available yet" in the wizard | Not in the FR-015…021 set; needs a scraper/PA-API. Left honest rather than faked. |
| Queue (BullMQ) | Full BullMQ driver + 3 workers + retry/backoff; **inline driver tested in CI** | The **BullMQ/Redis path is not exercised in CI** (no Redis in the harness). Covered indirectly via the shared processor. A Redis smoke test belongs to deployment hardening. |
| Job control | Cancel + Retry implemented and wired | **Pause/Resume** of a running job is not implemented (UI Pause control disabled). |
| Templates | CRUD endpoints + service + DB model | No UI for building/applying templates yet (wizard uses fixed column mapping with header aliases). |

## 2. Out of scope (correctly untouched this phase)

Per the Phase 6 mandate, **none** of these were started:
- AI Center / AI content engine
- Analytics & revenue forecasting
- Marketing features
- Media Library
- Search Engine upgrade (tsvector/autocomplete beyond existing)
- Recommendation engine ("users also viewed")

## 3. Catalog-automation items for the dedicated sync phase

- Tiered **price-sync** scheduler + **price-history** capture on sync.
- **Rating/review-count sync** and **availability/OOS auto-deactivate**.
- Scheduled re-import / refresh of imported ASINs.
- Import→AI pipeline hand-off (auto-generate descriptions for imported drafts).

## 4. Testing gaps

- No Redis-backed BullMQ integration test (see above).
- No large-file (multi-MB CSV) performance test — parser is streaming-friendly but unbenchmarked.
- Frontend `/admin/import` is verified by production build + manual reasoning, not an automated E2E
  (consistent with the rest of the admin UI in this project).

## 5. Summary

The Import Center is **functionally complete for FR-015…FR-021** with real persistence, a real queue
abstraction, duplicate detection, reports, RBAC/CSRF/audit, and a wired admin UI. The principal honest
gap is **Amazon PA-API enrichment** (ASIN/URL imports create drafts rather than fully-populated
products), which is a separate, credential-dependent phase.
