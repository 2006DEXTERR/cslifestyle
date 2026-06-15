# Phase 5 — Remaining Work Report

> What is intentionally NOT done after the affiliate system, and where it belongs. Date: 2026-06-15.

---

## 1. Out of scope for Phase 5 (deferred per the stop condition)

No work started on **AI Center, Analytics Center, Marketing Center, Import Center, Revenue
Forecasting, Media Library**, or any later phase.

| Area | Where it lands |
| ---- | -------------- |
| Amazon **PA-API import** (ASIN/CSV/URL/category product import) | Import Center phase |
| **AI** content generation | AI engine phase |
| **Analytics** (GA4/GSC ingest, traffic dashboards, real conversions) | Analytics phase |
| **Marketing** (newsletters, campaigns by email) | Marketing phase |
| **Revenue forecasting** | Forecasting phase |
| **Media Library** (image upload/WebP) | Media phase |

## 2. Affiliate follow-ups (within the affiliate domain)

| Item | Priority | Note |
| ---- | :------: | ---- |
| **Live order/conversion API** | High | Conversions/revenue currently come from imported Amazon CSVs; a live PA-API/Associates report sync would automate it. |
| **Durable click queue** (BullMQ) | Medium | `/go` logs in-process fire-and-forget; a queue gives at-least-once + back-pressure at high traffic (spec FR-046 "enqueue"). |
| **Geo/IP enrichment** beyond `CF-IPCountry` | Low | Country relies on the Cloudflare header; a GeoIP lookup would work without CF. |
| **Estimated-vs-actual reconciliation** | Medium | Seeded revenue is `estimated`; reconcile against `amazon_csv` actuals. |
| **Scheduled CSV auto-import** | Low | Currently manual upload. |
| **Affiliate link health-check** (FR daily check) | Medium | Verify ASINs still resolve on amazon.in. |
| **N-marketplace tags** (Flipkart/Reliance) | Low | Single amazon associate tag today. |
| **`/go` Redis cache for campaign lookups** | Low | Campaign `?c=` does one DB read; cache if hot. |

## 3. Cross-cutting (carried over)

- `next lint` red on **pre-existing** `react/no-unescaped-entities` + `<img>` warnings (content,
  carried verbatim; `eslint.ignoreDuringBuilds: true`). Recommend a cleanup + lint-in-CI.
- Listing pages + home/nav/footer/search/deals/wishlist still client + mock (out of scope since
  Phase 4); admin AI/analytics/marketing/seo/import dashboards remain mock.
- Unused root `@supabase/supabase-js`; 5 dev-only `npm audit` advisories (ADR-009, 0 runtime);
  soft 2FA enforcement; in-process email; tsvector full-text search; Redis read-cache.

## 4. Verification status (this phase)

backend typecheck/lint/build ✅ · Prisma `migrate deploy` ✅ (5 migrations) · **137/137 tests** vs
real embedded Postgres · frontend typecheck/`next build` ✅ (82 pages; SSR routes `●`) · **live
smoke** (`/go` 302 + tag, privacy-safe logging, product SSR CTA→`/go` + JSON-LD + canonical intact).
Existing UI/routes/colors/components/APIs/RBAC + SSR/SEO preserved.
