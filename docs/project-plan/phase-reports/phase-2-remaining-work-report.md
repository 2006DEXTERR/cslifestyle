# Phase 2 — Remaining Work Report

> What is intentionally NOT done after the catalog phase, and where it belongs. Date: 2026-06-15.

---

## 1. Out of scope for Phase 2 (explicitly deferred)

Per instruction, **no** work started on: guides, comparisons, authors, affiliate, AI, SEO,
analytics, or marketing. These remain mock-backed (`lib/data.ts`) on the frontend and have no
backend yet.

| Area | Where it lands |
| ---- | -------------- |
| Guides & Comparisons & Authors (schema + API + wiring) | next content phase (former tracker "1b" remainder) |
| Affiliate `/go/{asin}` redirect, click tracking, whitelist, disclosure | Affiliate engine phase |
| Amazon PA-API import (ASIN/CSV/URL/category) + tiered price/rating/availability sync | Import & Sync phase |
| AI content generation (queue, prompts, validation, review) | AI engine phase |
| SEO infra (sitemaps, robots, redirects, canonical, JSON-LD, `generateMetadata`/SSR) | SEO phase |
| Analytics (GA4/GSC ingest, revenue), `viewCount`/`clickCount` counters | Analytics phase |

## 2. Catalog follow-ups (deferred within the catalog domain)

| Item | Priority | Note |
| ---- | :------: | ---- |
| **SSR/SSG for catalog pages** | High (SEO) | Pages are client components today (`'use client'` + fetch). Converting product/category/brand pages to Server Components with `generateMetadata`/`generateStaticParams` is the biggest SEO unlock — slated for the SEO/Phase-2-of-roadmap work. |
| Server-side pagination on category/brand pages | Medium | Listing API supports `page`/`perPage`; the category/brand pages currently fetch up to 100 and filter client-side (fine at seed scale). Wire the UI pager to the API as the catalog grows. |
| `GET /api/products/asin/:asin` | Low | Internal-linking lookup from spec §8.2 — not yet added. |
| tsvector full-text search + autocomplete + trending | Medium | Search uses case-insensitive `contains` today; FR-028/029/031 (GIN tsvector, autocomplete, trending) are the dedicated Search phase. |
| Image upload pipeline (WebP, media table) | Medium | Images are URL-based; the admin editor accepts URLs. Real uploads = media phase. |
| Redis read-caching of catalog reads (spec §16.5) | Medium | Performance phase. |
| Brand `rating` as a live aggregate | Low | Currently a stored display value (seeded). |
| Multi-marketplace affiliate URLs (Flipkart/Reliance) | Low | Schema has a single `affiliateUrl`; the affiliate phase will model multiples. |
| Frontend component/E2E tests for catalog pages | Medium | Backend flows are covered (101 tests); the wired pages lack component/E2E tests. |
| Deep category trees in the seed | Low | Schema + admin support `parentId` hierarchy; the seed keeps the 10 mock categories flat (their subcategory names are display labels). |

## 3. Carried over from earlier phases (still open)

- Unused root `@supabase/supabase-js` dependency (deferred since Phase 0).
- 5 dev-only `npm audit` advisories in the Vitest→Vite→esbuild chain (ADR-009); **0 runtime**.
- Hard 2FA enforcement (currently soft `mustEnable2fa`); email durable queue + bounce webhooks
  (currently in-process fire-and-forget); edge silent-refresh for `/admin/*`.

## 4. Verification status (this phase)

typecheck ✅ · lint ✅ · build ✅ (backend + `next build`) · 68 unit + 33 integration = **101/101**
green vs real embedded Postgres · all three migrations apply via `migrate deploy`. No regression in
Phase 0/1/1a tests. Existing UI preserved (no component restyled; only data source + handlers
changed on catalog pages).
