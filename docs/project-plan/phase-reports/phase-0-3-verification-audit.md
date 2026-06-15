# Phase 0–3 Verification Audit

> Deep read-only audit before Phase 4. Date: 2026-06-15. Method: static inspection (imports, route
> guards, Swagger spec, hydration risks) + a **live clean-database run** (embedded Postgres, throwaway
> harness, since removed): `prisma migrate deploy` from empty → `db:seed` → `vitest run` (117 tests)
> → direct row-count probes. No product code was modified.

---

## 1. Verification Report

| # | Check | Verdict | Evidence |
| - | ----- | :-----: | -------- |
| 1 | Product/Category/Brand/Guide/Comparison/Author **pages use PostgreSQL** | ✅ (with caveats) | 17 app pages import `@/lib/api/{catalog,content}`: all 6 detail pages, the 3 catalog + 3 content **listing** pages, and all 6 **admin** pages. Live API → Postgres via presenters. **Caveat:** cross-entity surfaces still read mock — see #2. |
| 2 | **No remaining `lib/data.ts` imports** in implemented domains | ❌ **Not met** | 7 files still import `@/lib/data`: `app/page.tsx` (home — products/guides/comparisons/brands), `components/layout/{Navbar,Footer}.tsx` (categories/brands), `app/search/page.tsx`, `app/deals/page.tsx`, `app/wishlist/page.tsx`, and **`app/categories/[slug]/page.tsx`** (its "Related Guides" section still uses `buyingGuides` mock — guides are now an implemented domain). |
| 3 | **CRUD persists correctly** | ✅ | 117/117 integration tests incl. full create→update→publish→delete lifecycles for products, categories, brands, authors, guides, comparisons; verified vs a real Postgres. |
| 4 | **Migrations apply from a clean DB** | ✅ | Empty DB → all 4 migrations applied in order (`auth_init`, `2fa_email_settings`, `catalog_products_categories_brands`, `content_guides_comparisons_authors`); schema then in sync. |
| 5 | **RBAC enforced on every write endpoint** | ✅ | catalog: 10 write routes / 11 `requirePermission` + 11 `requireCsrf` + 11 `auditLogger`; content: 11 write source-lines (incl. publish/unpublish/draft loops) / 12 of each guard. Integration tests assert **401 unauth, 403 plain-user, 403 missing-CSRF** on writes. |
| 6 | **SearchQuery logging works** | ✅ | Direct probe after the run: `search_queries = 2` rows, written by live `GET /api/search` calls during tests (query, type, resultsCount, hashed IP). |
| 7 | **ProductPriceHistory works** | ✅ | Direct probe: `product_price_history = 12` rows (one per seeded product). Service appends a row on create and on every price change (covered by the price-change test). |
| 8 | **Swagger complete** | ✅ | Generated spec: **46 paths / 59 operations**. Every catalog (products 6, categories 5, brands 5, search 1) and content (authors 5, guides 8, comparisons 8) endpoint is documented, plus auth + health. |
| 9 | **Seed matches the frontend** | ✅ | `seed.ts` imports the mock arrays directly and upserts. Probe counts equal the mock array lengths exactly: categories 10, brands 8, products 12, authors 4, guides 5, comparisons 3 (+ 9 guide-product picks, 9 comparison specs). |
| 10 | **No remaining hydration mismatches** | 🟡 **Public clean; admin residue** | Homepage (reported) + author page (`Math.random`) fixed and verified (SSR HTML is now en-IN-only; build + dev confirmed). **Residual latent risks (admin, behind auth):** `app/admin/products/page.tsx:206` `new Date(...).toLocaleDateString()` (no locale → date-format mismatch); and bare `toLocaleString()` in mock dashboards `app/admin/{page,analytics,affiliate,marketing,seo,ai}.tsx`. |

**Net:** 8 of 10 fully ✅. #2 is **not met** (mock still backs cross-entity/secondary surfaces). #10 is
**green for all public, implemented pages**; the remaining risks are in auth-gated admin mock screens.

### Build/lint/type gates (re-confirmed this audit)
- Backend `tsc --noEmit` ✅ · ESLint ✅ · `tsc -p tsconfig.build.json` ✅
- Frontend `tsc --noEmit` ✅ · `next build` ✅ (all 38 routes; 6 dynamic routes render as `λ`)
- Frontend `next lint` ❌ — **pre-existing, unrelated**: `react/no-unescaped-entities` on the original
  `Editor's Pick` text + `<img>` LCP warnings in `components/products/ProductCard.tsx`. Not a
  regression; `next.config.js` sets `eslint.ignoreDuringBuilds: true` so the build is unaffected.

---

## 2. Remaining Technical Debt

1. **`lib/data.ts` is still the source of truth for cross-entity surfaces** — home, navbar, footer,
   search, deals, wishlist, and the category page's guides section. These touch implemented domains
   but were out of each phase's explicit route list. Until wired, they show mock data divergent from
   the DB (e.g., category `productCount`, author `articlesCount`).
2. **All catalog/content pages are client components** (`'use client'` + `useEffect` fetch). No SSR
   data in the initial HTML, no `generateMetadata`, no `generateStaticParams`, no JSON-LD — the
   single largest debt for an SEO-first product.
3. **Admin mock dashboards** (`ai`, `analytics`, `affiliate`, `marketing`, `seo`, admin home) are
   100% mock and carry latent `toLocaleString()` hydration risk (#10).
4. **`app/admin/products/page.tsx:206`** uses locale-default `toLocaleDateString()` — should route
   through a shared deterministic date formatter (a sibling to `lib/format.ts`).
5. **No view/click analytics** — admin guide/comparison tables show "—"/derived placeholders;
   author "views" is a deterministic placeholder.
6. **Guide TOC/FAQ authored as JSON textareas**; comparison N-product (2–5) modelled in the schema
   but the UI is 2-way only; comparisons have no `authorId` (author page shows recent comparisons).
7. **No frontend component/E2E tests** — backend is well covered (117), the wired pages are not.
8. **Image handling is URL-only** (no upload/WebP pipeline).
9. **Carry-overs:** unused root `@supabase/supabase-js`; 5 dev-only `npm audit` advisories
   (Vitest→Vite→esbuild, ADR-009, 0 runtime); soft 2FA enforcement; in-process email (no durable
   queue); `contains`-based search (tsvector deferred); no Redis read-cache.
10. **`eslint.ignoreDuringBuilds: true`** masks lint in CI/build — real issues (ProductCard) sit
    unaddressed.

---

## 3. Refactoring Recommendations

1. **Extract a shared frontend API client.** `lib/api/catalog.ts` and `lib/api/content.ts` duplicate
   `raw`/`request`/`qs`/envelope/CSRF logic. Hoist into `lib/api/client.ts`; drop the per-call
   `params as Record<string, unknown>` casts with a typed `qs<T>()`.
2. **Extract a generic admin `DataTable` + `Drawer`/`EditorTabs` shell.** The six admin pages repeat
   table + search/filter/pagination + drawer-form scaffolding. A shared component would cut ~40% of
   admin code and standardise behaviour.
3. **Centralise deterministic formatting.** Move all number/date formatting behind
   `lib/format.ts` (add `formatDate`), then add an ESLint rule banning bare `toLocaleString()` /
   `toLocaleDateString()` to prevent regressions (and fix the admin residue in #2/#4 above).
4. **Unify presenters.** Catalog and content presenters share patterns (Decimal→number, JSON
   coercion, superset shape). A small shared `present` helper set would reduce drift.
5. **DRY the route guard chain.** `authenticate → requireCsrf → requirePermission → validateBody →
   auditLogger` is repeated per write; a `protectedWrite(permission, schema, event)` helper would
   make missing-guard mistakes impossible.
6. **Replace JSON-textarea editors** (guide TOC/FAQ) with structured repeaters (the product-picks and
   specs-matrix repeaters are the model to copy).
7. **Turn on lint in CI** (drop `ignoreDuringBuilds` once ProductCard is cleaned) so quality gates
   are enforced.

---

## 4. Readiness Assessment — SSR/SEO Phase

**Backend: ready.** Reads are stateless, return presenter shapes already carrying `seoTitle`/
`metaDescription`, and run behind `optionalAuthenticate` (anonymous SSR sees published/active only).
Slugs are unique and indexed — ideal for `generateStaticParams`.

**Frontend: the main work.** Every catalog/content page is a client component that fetches on mount,
so crawlers currently receive an empty shell (no data, no meta tags, no structured data). The SSR/SEO
phase should:

| Task | Notes |
| ---- | ----- |
| Convert detail + listing pages to **async Server Components** | Fetch server-side (call the services directly, or fetch with an **absolute** URL — the `next.config.js` rewrite is browser-only; SSR fetch needs `BACKEND_ORIGIN`). Push interactivity (filters, drawers, tabs) into small client islands. |
| `generateMetadata()` | Title/description already in the DB per entity. |
| `generateStaticParams()` + ISR | From published slugs; revalidate on publish. |
| JSON-LD | `Product`, `Article` (guides), `BreadcrumbList`, `Review`/`ItemList` (comparisons). |
| `app/sitemap.ts` + `app/robots.ts` | Pull published slugs from the DB (FR-064/065/066). |
| Canonicals, OG/Twitter tags | Per entity. |

**Pre-requisites / risks before SSR:**
- **Resolve Technical Debt #1** (or consciously accept it): wiring the remaining mock surfaces matters
  more once pages are SSR'd and indexable.
- **Clear the residual hydration risks (#10)** so SSR doesn't reintroduce server/client mismatches —
  add `formatDate` and sweep the admin `toLocaleString`/`toLocaleDateString`.
- **SSR data-fetch transport:** decide direct service calls (fastest, no HTTP hop — preferred for
  Server Components in the same deployment) vs server-side `fetch(BACKEND_ORIGIN)`.
- **Performance:** add Redis read-caching + ISR before high-volume crawl (currently uncached).

**Verdict:** **Green to proceed** to SSR/SEO. The data layer, APIs, RBAC, migrations, seed, and
Swagger are solid and verified; the SSR phase is a well-bounded frontend conversion plus the SEO
artefacts above, with two small clean-ups (mock-surface wiring + hydration sweep) recommended first.
