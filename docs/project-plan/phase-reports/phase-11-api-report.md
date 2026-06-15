# Phase 11 — API Report

**Date:** 2026-06-15 · **Phase:** 11 — Discovery

Mounted at `/api` (router `server/src/routes/discovery.ts`), Swagger tags **Search** + **Recommendations**,
proxied via `/api/search/:path*` + `/api/recommendations/:path*`. Standard envelope.

## 1. Endpoints (18)

| Method | Path | Permission | CSRF | Audit | Purpose |
| ------ | ---- | ---------- | :--: | ----- | ------- |
| GET | `/api/search/advanced` | public | — | — | Weighted/fuzzy/synonym search + suggestions + did-you-mean |
| GET | `/api/search/suggestions` | public | — | — | Autocomplete suggestions |
| GET | `/api/search/trending` | public | — | — | Trending search terms |
| GET | `/api/recommendations/products` | public | — | — | related/similar/category/brand/price/trending |
| GET | `/api/recommendations/content` | public | — | — | related guides / comparisons |
| GET | `/api/search/synonyms` | search.manage | — | — | List synonyms |
| POST | `/api/search/synonyms` | search.manage | ✓ | `search.synonym_created` | Create synonym |
| PATCH | `/api/search/synonyms/:id` | search.manage | ✓ | `search.synonym_updated` | Update synonym |
| DELETE | `/api/search/synonyms/:id` | search.manage | ✓ | `search.synonym_deleted` | Delete synonym |
| POST | `/api/search/reindex` | search.manage | ✓ | `search.reindex` | Rebuild the search index |
| GET | `/api/recommendations/rules` | recommendations.view | — | — | List rules |
| POST | `/api/recommendations/rules` | recommendations.manage | ✓ | `recommendations.rule_created` | Create rule |
| PATCH | `/api/recommendations/rules/:id` | recommendations.manage | ✓ | `recommendations.rule_updated` | Update rule |
| DELETE | `/api/recommendations/rules/:id` | recommendations.manage | ✓ | `recommendations.rule_deleted` | Delete rule |
| GET | `/api/recommendations/internal-links` | recommendations.view | — | — | List link suggestions |
| POST | `/api/recommendations/internal-links/generate` | recommendations.manage | ✓ | `recommendations.links_generated` | Generate suggestions |
| POST | `/api/recommendations/internal-links/detect-broken` | recommendations.manage | ✓ | `recommendations.broken_scan` | Broken-link scan |
| PATCH | `/api/recommendations/internal-links/:id` | recommendations.manage | ✓ | `recommendations.link_updated` | Approve/reject |
| DELETE | `/api/recommendations/internal-links/:id` | recommendations.manage | ✓ | `recommendations.link_deleted` | Delete |

*(The task's required set — `/api/search/advanced|suggestions|trending`, `/api/recommendations/products|
content|internal-links|rules` — is covered.)*

## 2. Validation / pagination / sorting

zod-validated (`discovery.schemas.ts`): advanced search (`q`, `types` CSV, `limit`), recommendations
(`type`, ids, price range), synonyms/rules/links bodies, and paginated admin lists. Results are
pre-sorted (search by score; links by status then score; trending by frequency).

## 3. Public vs admin

Search + product/content recommendations are **public** (storefront + SSR, rate-limited). Synonyms +
reindex need `search.manage`; rules + internal links need `recommendations.view`/`manage`. All writes:
JWT + CSRF + audit.

## 4. Swagger

`@openapi` JSDoc on the route file; **Recommendations** tag added (Search tag already existed). Served at
`/docs` + `/docs.json`.

## 5. Endpoint count delta

API surface: **+18** (Phase 10 ended ~111; Phase 11 → ~129).
