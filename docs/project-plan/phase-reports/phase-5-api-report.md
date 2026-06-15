# Phase 5 — API Report

> The affiliate + revenue HTTP surface. Date: 2026-06-15.

---

## 1. Conventions

- Redirect mounted at root **`/go`**; admin API at **`/api`** (proxied by Next rewrites
  `/go/:path*`, `/api/affiliate/:path*`, `/api/revenue/:path*`).
- Response envelope `{ status, data, meta, message, errors }`; lists carry `meta.pagination`.
- Admin endpoints: `authenticate` → `requirePermission` → (writes) `requireCsrf` + `validateBody` +
  `auditLogger`. Reads need `affiliate.view`; writes need `affiliate.{create,edit,delete}`.
- Rate limit: `goLimiter` (~900/15m/IP) on `/go`.

## 2. Endpoint inventory

| Method · Path | Auth | Notes |
| ------------- | ---- | ----- |
| **GET `/go/:asin`** | public (rate-limited) | 302 to amazon.in; `?src=`, `?c=`; async privacy-safe log |
| GET `/api/affiliate/stats` | affiliate.view | totals, EPC, CVR, daily, by device/source |
| GET `/api/affiliate/clicks` | affiliate.view | paginated/filterable; **no ip/UA exposed** |
| GET `/api/affiliate/top-products` | affiliate.view | by clicks + revenue |
| GET `/api/affiliate/compliance` | affiliate.view | checklist + score (FR-063) |
| GET `/api/affiliate/settings` | affiliate.view | associate tag, domain, disclosure |
| PUT `/api/affiliate/settings` | affiliate.edit | + CSRF + audit |
| GET `/api/affiliate/campaigns` | affiliate.view | with click counts |
| POST `/api/affiliate/campaigns` | affiliate.create | |
| PUT `/api/affiliate/campaigns/:id` | affiliate.edit | |
| DELETE `/api/affiliate/campaigns/:id` | affiliate.delete | |
| POST `/api/revenue/import` | affiliate.edit | JSON `{ fileName, source, csv }` → RevenueImport + rows |
| GET `/api/revenue/imports` | affiliate.view | recent imports |
| GET `/api/revenue/reports` | affiliate.view | paginated revenue rows |
| GET `/api/revenue/summary` | affiliate.view | totals + by source + top categories |

(~16 endpoints + the public `/go`; total live API surface now ~72.)

## 3. RBAC mapping

Permissions reused from `config/permissions.ts`: `affiliate.{view,create,edit,delete}` (already
seeded). Roles: **admin** (all); **editor/analyst** (`affiliate.view` only → read dashboards, cannot
mutate settings/campaigns/import); **user** (none). Verified: 401 unauth, 403 plain-user, 200 admin.

## 4. Validation (zod)

`updateSettingsSchema` (partial), `createCampaignSchema`/`updateCampaignSchema`, `importRevenueSchema`
(`{ fileName, source, csv }`, csv ≤5 MB), and query parsers (`clicks`, `stats`, `top-products`,
`reports`). 400 with a field-error map on failure.

## 5. Swagger

`docs/swagger.ts` gains **Affiliate** + **Revenue** tags; every route (incl. `/go`) carries an
`@openapi` block. Served at `/docs`, raw at `/docs.json`.

## 6. Privacy note

`GET /api/affiliate/clicks` deliberately **omits** `ipHash`/`userAgentHash` from the response shape —
hashes exist only for de-dup/abuse analysis at rest, never over the wire (test-asserted).

## 7. Gaps / follow-ups

No public affiliate stats endpoint (admin-only by design); `/go` analytics could move to a durable
queue at scale; an `asin` lookup endpoint for internal linking is not part of this phase.
