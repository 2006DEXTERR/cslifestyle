# Phase 4 — Remaining Work Report

> What is intentionally NOT done after the SSR/SEO foundation, and where it belongs. Date: 2026-06-15.

---

## 1. Out of scope for Phase 4 (deferred per the stop condition)

No work started on **Affiliate, AI, Import Center, Analytics, Marketing, Revenue, Media Library**, or
any later phase.

| Area | Where it lands |
| ---- | -------------- |
| Affiliate `/go/{asin}` redirect + click tracking + disclosure | Affiliate engine phase |
| Amazon PA-API import + price/rating/availability sync | Import & Sync phase |
| AI content generation | AI engine phase |
| GA4 / Search Console ingest, per-entity view/click analytics | Analytics phase |
| Marketing / newsletters / campaigns | Marketing phase |
| Revenue estimation / Amazon CSV import | Revenue phase |
| Media library / image upload + WebP pipeline | Media phase |

## 2. SEO follow-ups (within the SEO domain, deferred)

| Item | Priority | Note |
| ---- | :------: | ---- |
| **Indexing-API ping on publish** (FR-070) | High | Ping Google on guide/comparison/product publish; needs a queued job (BullMQ exists). |
| **Google Search Console** ingest + sitemap submission | Medium | Analytics/SEO-ops phase. |
| **Branded OG image** | Medium | Currently the `bolt.new` placeholder; needs a real asset (or dynamic OG image route). |
| Per-entity **noindex** + **redirect** management (spec §11) | Medium | Admin SEO center; `Redirect`/`Seo` models from `06`. |
| **Image optimisation** (`next/image` / WebP) | Medium | Pages use `<img>` (preserved); `<img>` LCP warnings remain. |
| `sitemap` index split (10k URLs/file) | Low | At scale (spec §11); current single sitemap is fine for now. |
| `hreflang` / i18n | Low | Single-locale (en-IN) today. |

## 3. SSR / architecture follow-ups

| Item | Priority | Note |
| ---- | :------: | ---- |
| SSR data via **direct service calls** vs HTTP hop | Medium | Today SSR fetches `BACKEND_ORIGIN` over HTTP; a same-deployment optimisation could call services directly. Requires `BACKEND_ORIGIN` set in prod. |
| **Redis read-cache** + ISR tuning | Medium | Performance phase (spec §16.5); reads are currently uncached. |
| **Listing pages** (`/categories`, `/brands`, `/guides`, `/comparisons`, `/authors`) → SSR | Medium | Phase 4 converted only the 6 `[slug]` detail routes (per the goal list); listing pages remain client + are indexable but not SSR-data-rendered. |
| **Home / Navbar / Footer / search / deals / wishlist** still mock + client | Medium | Out of Phase 4 scope; still import `lib/data.ts` for cross-entity sections. |
| Frontend **component/E2E tests** for SSR pages | Medium | Backend covered (117 tests); the islands + metadata lack automated FE tests. |

## 4. Carried over (still open)

- `next lint` red on **pre-existing** `react/no-unescaped-entities` (apostrophes/quotes in original
  copy) + `<img>` warnings; `eslint.ignoreDuringBuilds: true` masks them. Recommend a dedicated
  cleanup + turning lint on in CI.
- Unused root `@supabase/supabase-js`; 5 dev-only `npm audit` advisories (ADR-009, 0 runtime);
  soft 2FA enforcement; in-process email; tsvector full-text search.

## 5. Verification status (this phase)

typecheck ✅ · `next build` ✅ (82 pages; 6 routes `●` SSG/ISR) · **live SSR smoke** ✅ (data +
JSON-LD + canonical/OG/Twitter + 404 + robots + sitemap 50 URLs) · backend unchanged (117/117
tests from Phase 3 still valid). Existing UI/routes/colors/components/APIs/RBAC preserved.
