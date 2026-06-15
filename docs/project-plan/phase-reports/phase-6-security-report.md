# Phase 6 — Security Report

**Date:** 2026-06-15 · **Phase:** 6 — Import Center & Catalog Automation · **Status:** Complete

Every Import Center write action is gated by JWT authentication, RBAC, and CSRF, and is audit-logged.
This report records the controls applied and how they were verified.

## 1. Permission model

A new permission **`import.manage`** was added to `config/permissions.ts` (module `import`), and
**`import.create`** is granted to the EDITOR role. The three import permissions:

| Permission | Grants | Endpoints |
| ---------- | ------ | --------- |
| `import.view` | Read dashboards/jobs/reports/templates | all GET `/api/import/*` |
| `import.create` | Start import jobs | POST `/csv`, `/asins`, `/categories` |
| `import.manage` | Retry/cancel jobs, manage templates | POST `/jobs/:id/retry`, `/jobs/:id/cancel`, POST/DELETE `/templates` |

Role mapping is seed-driven: `prisma/seed.ts` iterates `PERMISSIONS` and re-syncs role→permission
links, so re-running the seed grants the new permissions idempotently (no seed code change).

## 2. Controls per route

Every endpoint goes through the standard middleware chain:

- **Authentication** — `authenticate` (JWT access cookie). Unauthenticated → `401`.
- **Authorization** — `requirePermission('import.view'|'import.create'|'import.manage')`. Insufficient
  role → `403`.
- **CSRF** — `requireCsrf` on **all** writes (double-submit `cs_csrf` cookie vs `x-csrf-token` header).
  Missing/мismatched token → `403`.
- **Input validation** — `validateBody(zodSchema)` on create/template routes (size caps: CSV ≤ 20 MB,
  ≤ 5000 ASINs, ≤ 2000 categories) → `400` on violation. Prevents oversized/malformed payloads.
- **Audit** — `auditLogger('import.<action>', 'import')` records actor + action + resource for every
  write (csv/asins/categories/retry/cancel/template_created/template_deleted).

## 3. Data-safety properties

- **No open redirect / no arbitrary URL execution** — imports only create/update catalog rows; no
  outbound fetch from user-supplied URLs in this phase (URL import is intentionally not wired).
- **Draft-by-default** — imported products are `isPublished: false`, so an import cannot silently push
  unreviewed content to the public storefront.
- **SQL-injection-safe** — all DB access is via Prisma parameterized queries (NFR-SEC-005).
- **ASIN validation** — strict format check before any product row is created.
- **Unique-constraint integrity** — `create_copy` derives a **synthetic unique ASIN** to avoid
  violating the unique ASIN constraint; `overwrite` keeps asin/slug stable.
- **Cascade boundaries** — `ImportItem` cascades from `ImportJob`; created product/category links use
  `SetNull` so deleting an imported product does not delete import history.

## 4. Verification

Integration tests assert the security posture:
- `GET /api/import/stats` → **401** unauthenticated, **403** for a plain registered user, **200** for admin.
- `POST /api/import/asins` without `x-csrf-token` → **403**.
- Admin (with CSRF) → **201** and job processed.

`tests/unit/authorize.test.ts` + `permissions.test.ts` (unchanged) continue to pass, confirming the
permission catalog (now including `import.manage`) is internally consistent.

## 5. Outstanding

- Rate-limiting of import submissions (beyond the global limiter) and per-file virus/again-content
  scanning are deferred to deployment hardening.
- The BullMQ path inherits the same domain-level controls (jobs are only created via the guarded POST
  routes); Redis transport hardening (TLS/auth) is a deployment concern.
