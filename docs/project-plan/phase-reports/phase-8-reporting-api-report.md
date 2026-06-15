# Phase 8 — Reporting API Report

**Date:** 2026-06-15 · **Phase:** 8 — Analytics & Reporting Center

All endpoints mount at `/api` (router `server/src/routes/analytics.ts`), are documented under the
Swagger **Analytics** tag, and proxy from the Next frontend via the `/api/analytics/:path*` rewrite.
Standard envelope `{ status, data, meta, message, errors }`.

## 1. Endpoints (14)

| Method | Path | Permission | CSRF | Audit | Purpose |
| ------ | ---- | ---------- | :--: | ----- | ------- |
| POST | `/api/analytics/collect` | public | — | — | Privacy-safe view/search beacon (validated, rate-limited) |
| GET | `/api/analytics/dashboard` | analytics.view | — | — | KPIs + traffic/devices/geo/top-pages/sources/realtime/deltas |
| GET | `/api/analytics/products` | analytics.view | — | — | Most viewed/clicked/highest-revenue/trending |
| GET | `/api/analytics/search` | analytics.view | — | — | Top/zero-result/trends |
| GET | `/api/analytics/revenue` | analytics.view | — | — | Daily/weekly/monthly + by cat/brand + estimate |
| GET | `/api/analytics/ai` | analytics.view | — | — | Tokens/cost/provider/model/generation/failed |
| GET | `/api/analytics/content` | analytics.view | — | — | Top guides/comparisons/authors/categories/brands |
| GET | `/api/analytics/providers` | analytics.view | — | — | External provider status (PostHog/GA4/GSC) |
| GET | `/api/analytics/events` | analytics.view | — | — | Paginated raw events (filter eventType/entityType) |
| GET | `/api/analytics/reports` | reports.view | — | — | List report snapshots (paginated, filter type) |
| GET | `/api/analytics/reports/:id` | reports.view | — | — | Get a report snapshot |
| POST | `/api/analytics/reports` | reports.manage | ✓ | `analytics.report_generated` | Generate a snapshot |
| DELETE | `/api/analytics/reports/:id` | reports.manage | ✓ | `analytics.report_deleted` | Delete a snapshot |

## 2. Pagination / filtering / sorting / validation

- **Pagination:** `/events` and `/reports` accept `page` + `perPage` (≤100), return `meta.pagination`.
- **Filtering:** `/events` by `eventType` + `entityType`; `/reports` by `type`; all analytics reads by
  `range` (`today|last7days|last30days|thisMonth`).
- **Sorting:** aggregates are returned pre-sorted (top-N by count/revenue/views; time series ascending).
- **Validation:** every query + body is zod-validated (`validation/analytics.schemas.ts`); invalid →
  `400` with field errors. The collector enforces a public-only event allow-list.

## 3. Report snapshots

`POST /reports { type, range }` builds a snapshot embedding the **full** dashboard + product + search +
revenue + AI + content payload, persisted to `ReportSnapshot.payload` with the period. The same
`generateReport` runs from the BullMQ analytics worker (daily/weekly/monthly). Snapshots are retrievable
+ deletable (reports.manage). The frontend Export button downloads the live dashboard as JSON.

## 4. Security

Reads need `analytics.view`; report reads need `reports.view`; report writes need `reports.manage` and
are CSRF-guarded + audited. The public collector is unauthenticated by necessity (anonymous page views)
but validated, rate-limited (`publicCatalogLimiter`), and privacy-safe (SHA-256(ip) only). See the
Phase 8 Security Report.

## 5. Swagger

`@openapi` JSDoc on the route file; the **Analytics** tag was added in `docs/swagger.ts`. Served at
`/docs` (UI) + `/docs.json`.

## 6. Endpoint count delta

API surface: **+14** (Phase 7 ended ~97 documented; Phase 8 → ~111).
