# Phase 12 — API Coverage Report

**Date:** 2026-06-15 · **Phase:** 12 (final)

**~167 route handlers** across 13 routers, all mounted under `/api` (+ `/go`, `/uploads`, `/healthz`,
`/readyz`, `/docs`). Standard envelope `{ status, data, meta, message, errors }`. Swagger at `/docs`.

## 1. Routers (handler counts)

| Router | Handlers | Domain (phase) |
| ------ | :------: | -------------- |
| `auth.ts` | 15 | Auth, 2FA, sessions, password reset (1/1a) |
| `catalog.ts` | 17 | Products / categories / brands / search (2) |
| `content.ts` | 17 | Guides / comparisons / authors (3) |
| `affiliate.ts` | 14 | `/affiliate/*` + `/revenue/*` (5) |
| `go.ts` | 1 | `/go/:asin` redirect engine (5) |
| `import.ts` | 12 | Import Center (6) |
| `ai.ts` | 13 | AI content engine (7) |
| `analytics.ts` | 13 | Analytics & reporting + public collector (8) |
| `marketing.ts` | 25 | Newsletter + campaigns + tracking (9) |
| `media.ts` | 15 | Media Library + static uploads (10) |
| `discovery.ts` | 19 | Advanced search + recommendations + internal links (11) |
| `health.ts` | 2 | `/healthz` + `/readyz` (0/12) |
| `index.ts` | 4 | versioned API surface (`/api/v1`) |

## 2. Auth / RBAC / CSRF posture

- **Public reads:** catalog/content reads, search/recommendations, `/go`, `/uploads`, health,
  newsletter subscribe/unsubscribe/verify, analytics collector, email open/click tracking — validated +
  rate-limited; no privileged data.
- **Authenticated reads:** admin dashboards/lists gated by the relevant `*.view` permission.
- **Writes:** every state-changing route = **JWT + RBAC permission + CSRF + audit** (verified across all
  domains in the integration suites).

## 3. Validation & pagination

All bodies/queries are **zod-validated** (`server/src/validation/*.schemas.ts`); list endpoints accept
`page`/`perPage` (capped ≤100) and return `meta.pagination`. Filtering + sorting per domain.

## 4. Spec §8 coverage

The blueprint §8 endpoint families (products, categories, guides & comparisons, search, affiliate incl
`/go`, AI, SEO & analytics, auth/users/roles/settings) are all implemented, plus beyond-spec families
(import, marketing, media, recommendations). **§8 endpoint coverage ≈ 88%** (the small remainder is
external-integration endpoints — e.g. live GA4/GSC/Indexing-API — not internal APIs).

## 5. Documentation

Swagger/OpenAPI is generated from `@openapi` JSDoc on the route files (`server/src/docs/swagger.ts`),
served at `/docs` (UI) + `/docs.json` (raw), with tags per domain (Auth, Products, …, AI, Analytics,
Marketing, Media, Recommendations, Health).
