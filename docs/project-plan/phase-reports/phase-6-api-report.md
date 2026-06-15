# Phase 6 — API Report

**Date:** 2026-06-15 · **Phase:** 6 — Import Center & Catalog Automation · **Status:** Complete

All Import Center endpoints are mounted at `/api` (router `server/src/routes/import.ts`), documented
in Swagger under the **Import** tag, and proxied from the Next frontend via the
`/api/import/:path*` rewrite. Every response uses the standard envelope `{ status, data, meta,
message, errors }`.

## 1. Endpoints (12)

| Method | Path | Permission | CSRF | Audit action | Purpose |
| ------ | ---- | ---------- | :--: | ------------ | ------- |
| GET | `/api/import/stats` | `import.view` | — | — | Dashboard counters (active/completed/failed jobs, queued items, today imported, success rate) |
| GET | `/api/import/jobs` | `import.view` | — | — | Paginated job list (`page`, `perPage`, `status`, `type`) |
| GET | `/api/import/jobs/:id` | `import.view` | — | — | Job detail + up to 1000 items |
| GET | `/api/import/jobs/:id/report` | `import.view` | — | — | Stored import report |
| GET | `/api/import/templates` | `import.view` | — | — | List import templates/mappings |
| POST | `/api/import/csv` | `import.create` | ✓ | `import.csv` | Bulk/CSV product import |
| POST | `/api/import/asins` | `import.create` | ✓ | `import.asins` | ASIN import |
| POST | `/api/import/categories` | `import.create` | ✓ | `import.categories` | Nested category import |
| POST | `/api/import/jobs/:id/retry` | `import.manage` | ✓ | `import.retry` | Retry failed items |
| POST | `/api/import/jobs/:id/cancel` | `import.manage` | ✓ | `import.cancel` | Cancel a pending/processing job |
| POST | `/api/import/templates` | `import.manage` | ✓ | `import.template_created` | Create a template |
| DELETE | `/api/import/templates/:id` | `import.manage` | ✓ | `import.template_deleted` | Delete a template |

## 2. Request bodies (validated by zod — `validation/import.schemas.ts`)

- **CSV** `{ fileName: string(1..255), csv: string(1..20MB), duplicateMode?: skip|overwrite|create_copy, name?: string }`
- **ASINs** `{ asins: string[](1..5000), duplicateMode?, name? }`
- **Categories** `{ categories: [{ name(1..160), parentName?, slug?, description? }](1..2000), duplicateMode?, name? }`
- **Template** `{ name(1..160), type: csv_product|asin|category, mappings: object }`
- **Jobs query** `{ page≥1=1, perPage 1..100=20, status?: active|pending|processing|completed|failed|cancelled, type? }`

## 3. Responses

- **Creates** return `201` with the presented job (`{ id, type, name, status, source, duplicateMode,
  totalItems, processedItems, successCount, failedCount, skippedCount, progress, startedAt,
  completedAt, report, error, createdAt }`). Under the inline driver the job is already `completed`.
- **List** returns `data: ImportJob[]` + `meta.pagination`.
- **Detail** adds `items: [{ id, position, externalId, status, errors[], createdProductId,
  createdCategoryId }]`.
- **Report** returns the `ImportReport` (or a "not available yet" placeholder while pending).
- **Errors** use the envelope with HTTP `400` (validation/bad CSV), `401` (unauth), `403` (RBAC/CSRF),
  `404` (unknown job/template).

## 4. Swagger

Each route file carries `@openapi` JSDoc; the **Import** tag was added in `docs/swagger.ts`. The spec
is served at `/docs` (UI) and `/docs.json` (raw). The swagger-jsdoc globs already include
`./src/routes/*.ts`, so `import.ts` is picked up automatically.

## 5. Frontend client

`lib/api/import.ts` (`importApi`) wraps every endpoint with typed methods, sends the `cs_csrf`
double-submit header on mutations, and is consumed by `/admin/import`.

## 6. Endpoint count delta

API surface: **+12** (Phase 5 ended at ~72 documented endpoints + `/go`; Phase 6 → ~84).
