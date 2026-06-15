# Phase 3 — Remaining Work Report

> What is intentionally NOT done after the content phase, and where it belongs. Date: 2026-06-15.

---

## 1. Out of scope for Phase 3 (explicitly deferred)

Per the stop condition, **no** work started on Phase 4 or beyond. These remain unbuilt:

| Area | Where it lands |
| ---- | -------------- |
| Affiliate `/go/{asin}` redirect, click tracking, whitelist, disclosure | Affiliate engine phase |
| Amazon PA-API import + price/rating/availability sync | Import & Sync phase |
| AI content generation (queue, prompts, validation, review) | AI engine phase |
| SEO infra (sitemaps, robots, redirects, canonical, JSON-LD, SSR/`generateMetadata`) | SEO phase |
| Analytics (GA4/GSC ingest, revenue) + per-entity view/click counts | Analytics phase |
| Marketing (newsletters, campaigns) | Marketing phase |

## 2. Content follow-ups (deferred within the content domain)

| Item | Priority | Note |
| ---- | :------: | ---- |
| **SSR/SSG for content pages** | High (SEO) | Guides/comparisons/authors pages are client components today. Server Components + `generateMetadata`/`generateStaticParams` is the SEO unlock — SEO phase. |
| Rich block editor for guide content / TOC / FAQ | Medium | Today: a content textarea + JSON textareas for TOC/FAQ (functional, production-usable). A block/markdown editor is a future nicety. |
| Article + comparison **view counts** | Medium | Not tracked yet; admin tables show "—"/derived. Wire with analytics. |
| Comparison N-product support on the UI | Low | Schema's `comparison_products` supports N; the UI renders the 2-way A/B case. |
| Author ↔ comparison authorship | Low | Comparisons have no `authorId` in the spec domain; the author page shows recent comparisons (mirrors the prior mock). Add `authorId` if the spec later requires it. |
| Author rating | Low | Not in the domain; admin shows guides/published/topics instead of a fabricated rating. |
| Image uploads (avatars, covers) | Medium | URL-based today; real uploads = media phase. |
| Server-side pagination wired to UI pagers | Medium | APIs support `page`/`perPage`; some admin/public lists fetch up to 200 and page client-side (fine at current scale). |
| Frontend component/E2E tests for content pages | Medium | Backend flows covered (117 tests); wired pages lack component/E2E tests. |
| Home / Navbar / Footer cross-entity sections | Low | Still read the mock (`lib/data.ts`) for mixed product+guide+comparison sections; migrate when convenient. |

## 3. Hydration fix — residual

The reported homepage mismatch is fixed (shared `en-IN` formatter; verified via build + dev). The
same `toLocaleString()` class still exists in **unrelated admin mock dashboards** (`ai`, `affiliate`,
`analytics`, `marketing`, `seo`, admin home) — behind auth and out of this phase's scope. Recommended
as a quick follow-up sweep (route them through `lib/format.ts`).

## 4. Carried over from earlier phases (still open)

- Unused root `@supabase/supabase-js` dependency (since Phase 0).
- 5 dev-only `npm audit` advisories (Vitest→Vite→esbuild chain, ADR-009); **0 runtime**.
- Hard 2FA enforcement (currently soft); email durable queue + bounce webhooks; tsvector full-text
  search; Redis read-caching.

## 5. Verification status (this phase)

backend typecheck/lint/build ✅ · frontend typecheck/`next build` ✅ · Prisma `migrate deploy` ✅
(4 migrations) · **117/117 tests** green vs real embedded Postgres (no regression). Existing UI
preserved (no component restyled; only data source + handlers changed on content pages).
