# Phase 3 — API Coverage Report

> The content HTTP surface: endpoints, conventions, security. Date: 2026-06-15.

---

## 1. Mounting & conventions

- Mounted at **`/api`** (unversioned), alongside `/api/auth` and the Phase-2 catalog router
  (ADR-019). Next.js rewrites proxy `/api/{authors,guides,comparisons}` to the Express backend.
- **Response envelope** unchanged: `{ status, data, meta, message, errors }`; list endpoints put
  pagination in `meta.pagination`.
- **Reads** use `optionalAuthenticate` (anonymous sees published/active only; `*.view` permission
  unlocks drafts/inactive via `?status=`). **Writes** = `authenticate` → `requirePermission`
  → `requireCsrf` → `auditLogger`.
- **Validation:** zod (`validateBody` for bodies, `parseQuery` for list queries) → 400 field map.
- **Errors:** 400 (validation / identical comparison products) · 401 · 403 (RBAC/CSRF) · 404 · 429.
- **Rate limit:** `publicCatalogLimiter` (600/15m/IP) on reads.

## 2. Endpoint inventory (22)

| # | Method · Path | Permission |
| - | ------------- | ---------- |
| 1 | GET `/api/authors` | public / `authors.view` |
| 2 | GET `/api/authors/:slug` | public |
| 3 | POST `/api/authors` | authors.create |
| 4 | PUT `/api/authors/:id` | authors.edit |
| 5 | DELETE `/api/authors/:id` | authors.delete |
| 6 | GET `/api/guides` | public / `guides.view` |
| 7 | GET `/api/guides/:slug` | public |
| 8 | POST `/api/guides` | guides.create |
| 9 | PUT `/api/guides/:id` | guides.edit |
| 10 | DELETE `/api/guides/:id` | guides.delete |
| 11–13 | POST `/api/guides/:id/{publish,unpublish,draft}` | guides.publish |
| 14 | GET `/api/comparisons` | public / `comparisons.view` |
| 15 | GET `/api/comparisons/:slug` | public |
| 16 | POST `/api/comparisons` | comparisons.create |
| 17 | PUT `/api/comparisons/:id` | comparisons.edit |
| 18 | DELETE `/api/comparisons/:id` | comparisons.delete |
| 19–21 | POST `/api/comparisons/:id/{publish,unpublish,draft}` | comparisons.publish |

(Plus the catalog `/api/{products,categories,brands,search}` from Phase 2 and `/api/auth/*` —
the live API surface is now ~56 endpoints.)

## 3. RBAC mapping

Permissions reused from `config/permissions.ts`: `authors.{view,create,edit,delete}`,
`guides.{view,create,edit,delete,publish}`, `comparisons.{view,create,edit,delete,publish}`.
Roles: **admin** (all); **editor** (full guides/comparisons incl. publish; authors view+edit;
categories/brands/products per Phase 2); **author** (guides/comparisons create+edit, no publish/
delete; authors view+edit); **analyst** (view); **user** (none). Per-method route guards; every
mutation is audited.

## 4. Pagination / filtering / sorting / search

- **Pagination:** `?page=&perPage=` → `meta.pagination`.
- **Filtering:** guides by `category` (slug/id), `author` (slug/id), `status`; comparisons/authors
  by `status`.
- **Sorting:** guides/comparisons `newest|oldest|title`; authors `name|newest`.
- **Search:** `q` over title/excerpt (guides/comparisons) or name (authors), case-insensitive.

## 5. Swagger

`docs/swagger.ts` gains `Authors`/`Guides`/`Comparisons` tags; every content route carries an
`@openapi` block (params, bodies, status codes). Served at `/docs`, raw at `/docs.json`.

## 6. Test coverage

`content.integration.test.ts` (16 cases) exercises every group incl. the RBAC matrix (401/403/CSRF),
full lifecycles, publish→unpublish, relations (guide↔author↔picks, comparison↔specs), filters and
the identical-product 400. Plus the `content-presenters` unit suite. 117/117 green overall.

## 7. Gaps / follow-ups

`GET /api/guides/asin`-style internal lookups N/A; Redis read-caching deferred (perf phase); cursor
pagination deferred; TOC/FAQ authored as JSON; no per-entity view-count endpoints yet (analytics).
