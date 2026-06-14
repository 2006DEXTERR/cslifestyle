# 07 — API Design

> Spec §8 (Laravel/Sanctum) → **Express + TypeScript**. Same URLs, same semantics, JWT instead
> of Sanctum. Base path **`/api/v1`**. Affiliate redirect and SEO files served at root.

---

## 1. Conventions

- **Response envelope** (spec §8.1): `{ status: 'success'|'error', data, meta: { pagination },
  message, errors }`. Enforced by a response helper + error middleware.
- **Auth:** JWT Bearer for admin endpoints (replaces Sanctum). Public endpoints open behind rate
  limiting. `Authorization: Bearer <jwt>`; short-lived access + refresh; TOTP gate on 2FA roles.
- **Validation:** zod schemas per route; 422 with `errors` map on failure.
- **Rate limits** (spec §8.1/§15.5): public 60/min, search 30/min, `/go` 60/min, auth 300/min,
  admin 600/min, login 5/15min — Redis-backed (`express-rate-limit` + store).
- **Pagination:** `?page=&perPage=`; `meta.pagination = { page, perPage, total, totalPages }`.
- **Casing:** API speaks camelCase; mapping layer converts Prisma rows (see `06` §6).
- **Errors:** consistent codes (400 validation, 401, 403 rbac, 404, 409 duplicate, 429, 500).

## 2. Endpoint map (mirrors spec §8)

### 2.1 Products (§8.2)
| Method · Path | Auth | Notes |
| ------------- | ---- | ----- |
| GET `/products` | public | filters category_id, brand_id, min_price, max_price, min_rating, sort, page (FR-021/022/023) |
| GET `/products/{slug}` | public | full incl specs/pros/cons/FAQs (FR-009) |
| GET `/products/asin/{asin}` | public | internal linking |
| POST `/admin/products` | admin | manual create |
| PUT `/admin/products/{id}` | admin | update |
| DELETE `/admin/products/{id}` | admin | soft delete |
| POST `/admin/products/import/asin` | admin | FR-001 |
| POST `/admin/products/import/csv` | admin | FR-002 (≤500) |
| POST `/admin/products/import/url` | admin | FR-003 |
| POST `/admin/products/import/category` | admin | FR-004 |
| POST `/admin/products/sync-prices` | admin | FR-015 trigger |
| POST `/admin/products/{id}/regenerate-ai` | admin | FR-052 |
| POST `/admin/products/bulk-publish` | admin | FR-058 |

### 2.2 Categories (§8.3)
GET `/categories` (tree) · GET `/categories/{slug}` (cat+products+subcats+guides) · POST
`/admin/categories` · PUT `/admin/categories/{id}` · DELETE `/admin/categories/{id}` (only if no
active products) · POST `/admin/categories/{id}/generate-ai`.

### 2.3 Guides & Comparisons (§8.4)
GET `/guides` · GET `/guides/{slug}` · POST/PUT `/admin/guides` · POST
`/admin/guides/{id}/generate-ai` · POST `/admin/guides/{id}/publish` (publish + sitemap +
Indexing ping, FR-070) · GET `/comparisons` · GET `/comparisons/{slug}` · POST
`/admin/comparisons` (body product_id_a/b) · POST `/admin/comparisons/{id}/generate-ai`.

### 2.4 Search (§8.5)
GET `/search?q=&type=&page=` (FR-027/030) · GET `/search/autocomplete?q=` (top 8, FR-029) · GET
`/search/trending` (FR-031). All log to `search_queries` (FR-032).

### 2.5 Affiliate (§8.6, §9)
- **GET `/go/{asin}`** (or `/go/{slug}`) — **public**, validate ASIN + amazon.in whitelist
  (FR-049), enqueue async click event (FR-046), **302** to
  `amazon.in/dp/{ASIN}?tag=...&linkCode=ogi&th=1&psc=1` in <100ms (FR-044). Excluded from
  sitemap + `noindex` + robots disallow (NFR-SEO-008).
- GET `/admin/affiliate/clicks` · GET `/admin/affiliate/stats` · GET
  `/admin/affiliate/top-products?days=30` · GET `/admin/affiliate/compliance` (FR-063 checklist).

### 2.6 AI (§8.7)
GET `/admin/ai/queue` · POST `/admin/ai/queue/retry/{id}` · POST `/admin/ai/queue/retry-all-
failed` · POST `/admin/ai/bulk-generate` · GET `/admin/ai/logs` · GET `/admin/ai/prompts` · PUT
`/admin/ai/prompts/{type}` (FR-054) · GET `/admin/ai/stats`.

### 2.7 SEO & Analytics (§8.8)
GET `/admin/seo/sitemap-status` · POST `/admin/seo/generate-sitemaps` (FR-064) · GET/PUT
`/admin/seo/robots` (FR-066) · GET `/admin/seo/redirects` + CRUD (FR-061) · GET
`/admin/analytics/overview|traffic|revenue|top-pages` (FR-062).

### 2.8 Auth & Users (§15) — not enumerated in §8, required by §15
POST `/auth/login` (→ 2FA challenge if enabled) · POST `/auth/2fa/verify` · POST `/auth/refresh`
· POST `/auth/logout` · GET `/auth/me` · POST `/auth/2fa/setup` · admin user CRUD `/admin/users`
· roles/permissions `/admin/roles`, `/admin/permissions` · settings `/admin/settings`.

### 2.9 Public SEO files (root, not /api)
GET `/sitemap.xml` (index, FR-065) · GET `/sitemap-{type}.xml` (+ paginated product sitemaps
10k/file) · GET `/robots.txt` (admin-editable, FR-066). Served by Express *or* Next route
handlers proxying backend — decided in `12` (lean: Next `app/sitemap.ts`/`app/robots.ts` pull
from backend so they live on the indexed domain).

## 3. Middleware pipeline (order)

`requestId → helmet(CSP) → cors → rateLimit → bodyParser → (auth → 2fa → rbac for /admin) →
validate(zod) → controller → responseEnvelope`; errors → `errorHandler`; mutations → `audit`.

## 4. RBAC mapping (spec §15.2.1)

Per-endpoint `permission:<name>` guard (e.g. `manage-products`, `manage-settings`,
`view-analytics`). Role→permission matrix seeded from spec table. 403 on deny. 2FA-required
roles (super_admin, seo_manager) must present a valid TOTP-verified session for `/admin/*`.

## 5. Frontend API client (`lib/api/`)

Typed functions returning existing `lib/types.ts` shapes (DB→frontend mapping), e.g.
`getProductBySlug`, `listProducts(filters)`, `getCategoryTree`, `searchAll(q,type)`. Server
Components call these with `fetch` (Next caching/ISR); interactive islands call same via a thin
client wrapper. This is the seam that lets us delete reliance on `lib/data.ts` without touching
component markup.

## 6. Performance targets (§4.1)

Product/category/listing reads cached in Redis (TTLs §16.5); autocomplete <200ms (indexed +
cached); `/go` <100ms (no DB on hot path — enqueue + redirect). Cursor pagination for large
admin lists.

## 7. Open items → `12`

Where to terminate `/go` and sitemap/robots (Next vs Express) given same-origin/SEO needs · JWT
refresh-rotation strategy · CSRF approach for cookie vs Bearer · response-envelope on Next-side
SEO routes.
