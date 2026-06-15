# Phase 11 — Security Report

**Date:** 2026-06-15 · **Phase:** 11 — Discovery

## 1. Permission model

New permissions (seed-driven): `search.manage`, `recommendations.view`, `recommendations.manage`.
Grants: editor → all three; analyst → `recommendations.view`; admin → all.

| Permission | Grants | Endpoints |
| ---------- | ------ | --------- |
| `search.manage` | Synonyms + reindex | `/api/search/synonyms*`, `/api/search/reindex` |
| `recommendations.view` | Read rules + internal-link suggestions | GET `/api/recommendations/rules`, `/internal-links` |
| `recommendations.manage` | Manage rules + internal links | the recommendation/link write routes |

## 2. Public vs protected

- **Public reads** (storefront + SSR): `/api/search/advanced|suggestions|trending`,
  `/api/recommendations/products|content`. Validated + rate-limited (`searchLimiter` /
  `publicCatalogLimiter`). No auth (these power public pages); they expose only published/active content
  via the index and presenters.
- **Admin** routes are JWT-gated by permission.

## 3. Write-operation controls

Every admin write goes through **authenticate (JWT)** → **requireCsrf** → **requirePermission** →
(**validateBody**) → **auditLogger** (`search.*` / `recommendations.*`). Verified: plain user → `403`,
missing CSRF → `403`, admin → `201/200`.

## 4. Data-safety properties

- **Internal links are review-only** — generation never modifies content; nothing is auto-published.
- **No open redirect / injection** — search matches are parameterised Prisma queries over the index;
  the click-tracking redirect (media/marketing) is unaffected here.
- **Search logging** reuses the privacy-safe `SearchQuery` path (SHA-256(ip) only, NFR-SEC-007).
- **Public reads only surface published/active rows** (the index is built from published content).

## 5. Privacy

Advanced-search queries are logged (FR-032) with a hashed IP only; recommendations use aggregate
view/click counts (no per-user profiles). No new PII is collected.

## 6. Outstanding

- Rate-limit tuning for the search endpoints under load is a deployment concern.
- Native Postgres FTS (if adopted later) must keep the same published-only visibility guarantees.
