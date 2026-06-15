# Phase 5 — Revenue Tracking Report

> CSV import, revenue storage, and reporting. Date: 2026-06-15.

---

## 1. Models

- **RevenueImport** — audit record per import: `fileName`, `source` (estimated | amazon_csv),
  `status`, `rowCount`, `totalRevenue` (Decimal 14,2), `periodStart`/`periodEnd`, `importedById`.
- **RevenueReport** — the revenue rows: `date`, `asin?`, `productId?` (resolved from ASIN),
  `category?`, `actualRevenue`, `estimatedRevenue?`, `orders`, `clicks`, `source`, `importId?`.
  Spec §13.4 grain (date + category + source) extended to per-ASIN for Amazon CSVs.

## 2. CSV import pipeline

`POST /api/revenue/import` (RBAC `affiliate.edit` + CSV + audit). Body is **JSON `{ fileName, source,
csv }`** — the admin reads the file client-side (`FileReader`) and posts the text, so there is **no
multer/multipart dependency** (ADR-022).

1. Parse with an RFC-4180-ish parser (`parseCsv`) — handles quoted fields + embedded commas.
2. Map flexible headers: `date` + `revenue` required; `asin`, `orders`/`units`, `clicks`, `category`
   optional (multiple aliases recognised, e.g. `ad_fees`, `earnings`, `commission`). Currency
   symbols/commas stripped on parse.
3. Skip rows with an unparseable date (reported as `skipped`).
4. Resolve `productId` from ASIN (batch).
5. In a transaction: create the `RevenueImport` (status `completed`, totals, period) + `createMany`
   the `RevenueReport` rows linked to it.
6. Invalid CSV (no data rows, or missing date/revenue columns) → **400** with a helpful message.

## 3. Reporting APIs

| Endpoint | Returns |
| -------- | ------- |
| `GET /api/revenue/summary?days=` | totalRevenue, totalOrders, totalClicks, revenue **by source**, **top categories** |
| `GET /api/revenue/reports` | paginated revenue rows (filter by source/days), with product title |
| `GET /api/revenue/imports` | recent imports (file, source, status, totals, period, importer) |
| `GET /api/affiliate/stats?days=` | clicks + revenue joined: totals, EPC, conversion rate, daily series, by device/source |

`epc = revenue / clicks`, `conversionRate = orders / clicks` — computed in the stats service.

## 4. Admin UI (Revenue tab)

Revenue stat cards (revenue/orders/attributed-clicks) · **Upload CSV** (drag a file → parsed +
imported) · **Import History** table. All values formatted deterministically (`₹` + `formatNumber`).

## 5. Seed

272 estimated `RevenueReport` rows (per product/day, ~4% commission model derived from seeded clicks)
+ a sample `amazon_csv` import record, so the summary/charts render real data on day one.

## 6. Verification

Integration test imports a 2-row CSV → 201 with `rowCount=2`, `totalRevenue≈2230.5`; the import
appears in `/revenue/imports`; `/revenue/summary` reflects it; `/revenue/reports?source=amazon_csv`
returns the rows; a malformed CSV → 400. Unit test covers the CSV parser (quoted fields, blank lines).

## 7. Gaps / follow-ups

No live Amazon order/earnings API (manual CSV only); no revenue **forecasting** (deferred, per the
stop condition); no scheduled/auto-import; estimated-vs-actual reconciliation and GA4/GSC revenue
ingestion are later analytics-phase work.
