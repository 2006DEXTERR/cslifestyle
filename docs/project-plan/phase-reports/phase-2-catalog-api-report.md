# Phase 2 — Catalog API Report

> The catalog HTTP surface: endpoints, conventions, security, search. Date: 2026-06-15.

---

## 1. Mounting & conventions

- Mounted at **`/api`** (unversioned) per the Phase 2 contract (ADR-019), alongside `/api/auth`.
  Next.js rewrites proxy `/api/{products,categories,brands,search}` to the Express backend so admin
  mutations keep first-party cookies.
- **Response envelope** (unchanged): `{ status, data, meta, message, errors }`. List endpoints put
  pagination in `meta.pagination = { page, perPage, total, totalPages }`.
- **Reads** use `optionalAuthenticate` — anonymous callers see only published/active rows; a
  signed-in user with the relevant `*.view` permission can additionally request drafts/inactive
  (`?status=all|draft`). **Writes** require `authenticate` → `requirePermission` → `requireCsrf`
  → `auditLogger`.
- **Validation:** zod (`validateBody` for bodies, `parseQuery` for list/search query strings); 400
  with a `{ field: [messages] }` map on failure.
- **Errors:** 400 validation · 401 unauthenticated · 403 RBAC/CSRF · 404 · 409 (duplicate ASIN /
  non-empty category delete) · 429 rate-limited.
- **Rate limits:** `publicCatalogLimiter` (600/15m/IP) on reads, `searchLimiter` (120/15m/IP) on
  search.

## 2. Endpoint inventory (17)

| # | Method · Path | Permission | Notes |
| - | ------------- | ---------- | ----- |
| 1 | GET `/api/products` | public / `products.view` for drafts | pagination·sort·filter·search |
| 2 | GET `/api/products/:slug` | public | full detail |
| 3 | POST `/api/products` | products.create | 409 dup ASIN |
| 4 | PUT `/api/products/:id` | products.edit | partial; price-history capture |
| 5 | DELETE `/api/products/:id` | products.delete | cascade images/history |
| 6 | POST `/api/products/bulk` | products.publish (+delete) | publish/unpublish/delete |
| 7 | GET `/api/categories` | public / `categories.view` | status·parent·q |
| 8 | GET `/api/categories/:slug` | public | |
| 9 | POST `/api/categories` | categories.create | |
| 10 | PUT `/api/categories/:id` | categories.edit | no self-parent |
| 11 | DELETE `/api/categories/:id` | categories.delete | 409 if non-empty |
| 12 | GET `/api/brands` | public / `brands.view` | status·q |
| 13 | GET `/api/brands/:slug` | public | |
| 14 | POST `/api/brands` | brands.create | |
| 15 | PUT `/api/brands/:id` | brands.edit | |
| 16 | DELETE `/api/brands/:id` | brands.delete | unlinks products |
| 17 | GET `/api/search` | public (rate-limited) | logged |

## 3. RBAC mapping

Permissions reused from the Phase 1 catalog (`config/permissions.ts`): `products.{view,create,
edit,delete,publish}`, `categories.{view,create,edit,delete}`, `brands.{view,create,edit,delete}`.
Roles: **admin** (all), **editor** (products/categories/brands view+create+edit, products.publish;
no delete), **author/analyst** (view), **user** (none). Per-method guards on each route; the bulk
`delete` action additionally re-checks `products.delete` inside the controller.

## 4. Search (FR-027/032)

`GET /api/search?q=&type=all|products|categories|brands&limit=` — case-insensitive `contains`
across published products (title/shortDescription/brand name), active categories (name) and active
brands (name). Returns grouped results + counts. **Every query is logged** to `search_queries`
(query, type, resultsCount, hashed IP — NFR-SEC-007) best-effort (a logging failure never breaks
search). tsvector full-text is deferred (documented).

## 5. Swagger

`docs/swagger.ts` gains `Products`/`Categories`/`Brands`/`Search` tags + `Product`/`Category`/
`Brand` component schemas; every catalog route carries an `@openapi` block (params, request bodies,
status codes). Served at `/docs`, raw at `/docs.json`.

## 6. Test coverage

`catalog.integration.test.ts` (17 cases, vs real Postgres) exercises every endpoint incl. the RBAC
matrix (401 unauth, 403 plain-user, 403 missing-CSRF), the full admin lifecycle, 409s, bulk, and
search scoping. Plus 17 unit cases (`slug`, `presenters`). 101/101 green overall.

## 7. Gaps / follow-ups

`GET /products/asin/:asin` (internal-linking lookup, spec §8.2) not yet added; Redis read-caching
(spec §16.5) deferred to the performance phase; cursor pagination for very large admin lists
deferred (offset pagination today).
