# Phase 8 — Revenue Analytics Report

**Date:** 2026-06-15 · **Phase:** 8 · **Endpoint:** `GET /api/analytics/revenue` (analytics.view)

Implements spec §13.4 revenue tracking over the existing `RevenueReport` / `RevenueImport` tables (no
new revenue model — they were built in Phase 5).

## 1. Outputs

| Field | Meaning | Source |
| ----- | ------- | ------ |
| `total` | Σ `actualRevenue` in range | `RevenueReport.actualRevenue` |
| `daily` / `weekly` / `monthly` | revenue bucketed by day / ISO week / month | `RevenueReport.date` |
| `byCategory` | revenue grouped by category (top 15) | `RevenueReport.category` |
| `byBrand` | revenue grouped by brand (join `productId → Product.brand`) | `RevenueReport` × `Product` |
| `estimated` | **clicks × CVR × commission** (§13.4) | `AffiliateClick` count × env CVR × commission |
| `estimateInputs` | `{ clicks, cvr, commission }` used | `REVENUE_DEFAULT_CVR` / `REVENUE_DEFAULT_COMMISSION` |

## 2. Estimate formula (§13.4)

`estimated = clicks × CVR × commission`, with `CVR` (`REVENUE_DEFAULT_CVR`, default 0.04) and
`commission` (`REVENUE_DEFAULT_COMMISSION`, default 0.05) configurable via env. The estimate is reported
alongside actual imported revenue (Amazon CSV, `source=amazon_csv`) so admins can compare estimated vs
actual. Inputs are returned for transparency.

## 3. Data sources (reused, not rebuilt)

- `RevenueReport` (date, category, productId, actualRevenue, estimatedRevenue, orders, clicks, source).
- `RevenueImport` (Amazon CSV imports — Phase 5).
- `AffiliateClick` (click counts for the estimate).

## 4. Dashboard surfacing

`/admin/analytics` Content Performance tab shows real Products revenue (₹) + clicks; the dashboard
"Revenue" card aggregates `actualRevenue` for the range. The full daily/weekly/monthly + by-category/
brand breakdown is available via the API and the report snapshot payload.

## 5. Verification

Integration test asserts the revenue payload has `byCategory` + `estimateInputs`; report snapshots embed
the full revenue section. Revenue math is deterministic (env-configured inputs).

## 6. Honest gaps

- Per-content-type revenue attribution beyond Products is not split in the UI table (shown as `—`).
- Live Amazon order/conversion API is out of scope (revenue comes from CSV import + the estimate), as in
  Phase 5.
