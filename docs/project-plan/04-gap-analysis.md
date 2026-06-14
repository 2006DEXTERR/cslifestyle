# 04 — Gap Analysis

> Requirement-by-requirement mapping of spec (`02`) against reality (`03`).
> Legend: ✅ **Implemented** · 🟡 **Partial** (UI or stub exists, no real behaviour) · ❌ **Missing**.
> "UI" = a mock screen exists but is not wired to any backend. Rolled-up percentages live in
> `15-compliance-report.md` (the single source for the compliance number).

---

## A. Functional requirements (FR-001…FR-070)

| FR | Requirement | Status | Evidence / note |
| -- | ----------- | :----: | --------------- |
| 001 | ASIN import (PA-API) | 🟡 | `/admin/import` UI only; no PA-API client |
| 002 | CSV import ≤500 rows | 🟡 | wizard UI only; no parser/upload |
| 003 | URL import (ASIN extract) | ❌ | not present (regex util to build) |
| 004 | Category browse-node import | 🟡 | UI card only |
| 005 | One-click import from search | 🟡 | UI only; no embedded PA-API search |
| 006 | Import → AI queue trigger | ❌ | no queue exists |
| 007 | ASIN format validation | ❌ | none |
| 008 | Duplicate ASIN skip + log | ❌ | none |
| 009 | Product page core fields | ✅ | `products/[slug]` renders all (mock data) |
| 010 | Price + "Last updated" | 🟡 | price shown; no synced timestamp |
| 011 | CTA above fold all sizes | ✅ | present in product page/cards |
| 012 | Related products (≥4) | 🟡 | related shown via mock category filter |
| 013 | "Users also viewed" | ❌ | no view tracking |
| 014 | WebP gallery + lazy + lightbox | 🟡 | lightbox/zoom yes; WebP/lazy pipeline no |
| 015 | Price sync 6h | ❌ | no scheduler/job |
| 016 | Rating sync 24h | ❌ | none |
| 017 | Availability sync + OOS | 🟡 | OOS badge in UI; no sync |
| 018 | Auto-deactivate 30d | ❌ | none |
| 019 | Price history table | ❌ | none |
| 020 | Category hierarchy (5 lvl) | 🟡 | UI tree (2 lvl mock); no model |
| 021 | Category grid + filters | ✅ | `categories/[slug]` (client filters, mock) |
| 022 | Filter set | 🟡 | price+rating only; missing brand/avail/discount |
| 023 | Sort set | ✅ | popularity/price/rating/newest present (client) |
| 024 | Breadcrumbs + schema | 🟡 | breadcrumbs yes; schema no |
| 025 | Desktop mega-nav | ✅ | Navbar mega-menu (mock data) |
| 026 | Mobile hamburger/accordion | ✅ | present |
| 027 | Full-text search | 🟡 | client string-match on mock; no FT index |
| 028 | FT index on products | ❌ | no DB (Postgres tsvector planned) |
| 029 | Autocomplete ≥3 chars | ❌ | none (navbar search non-func) |
| 030 | Search reuses filters | 🟡 | tabs only; not full filter parity |
| 031 | No-results suggestions | 🟡 | empty state exists; not data-driven |
| 032 | Search query logging | ❌ | none |
| 033 | Rich-text guide editor | 🟡 | admin editor stub; no TipTap/inline cards |
| 034 | Auto TOC H2/H3 | 🟡 | TOC rendered from mock field; not generated |
| 035 | Related guides widget | ✅ | present (mock) |
| 036 | Reading time | ✅ | shown (precomputed in mock) |
| 037 | Guide schema | ❌ | no JSON-LD |
| 038 | AI guide workflow | ❌ | none |
| 039 | Comparison 2–5 table | 🟡 | 2-product table (mock); no 3–5 |
| 040 | Winner cell highlight | 🟡 | winner badges; not auto per-spec green cell |
| 041 | AI verdict + winner | 🟡 | verdict text (mock); no AI |
| 042 | Per-product CTA | ✅ | present |
| 043 | Auto-generate comparisons | ❌ | no detector job |
| 044 | `/go/{asin}` 302 redirect | ❌ | route absent |
| 045 | Configurable associate tag | 🟡 | settings field UI; not wired |
| 046 | Click logging | ❌ | none |
| 047 | rel + new tab on links | 🟡 | new tab likely; rel attrs to verify/add |
| 048 | Auto-inject disclosure | 🟡 | disclosure page + banners exist; not auto on /go pages |
| 049 | Redirect whitelist | ❌ | none |
| 050 | AI jobs on import | ❌ | none |
| 051 | Queue workers concurrency | ❌ | none |
| 052 | AI content store + edit/approve | 🟡 | admin field editors (UI); no store/approve flow |
| 053 | Provider configurable | 🟡 | settings UI lists providers; not wired |
| 054 | Editable prompt templates | ❌ | no prompt editor |
| 055 | AI logs (tokens/cost) | 🟡 | charts UI (mock); no real logs |
| 056 | RBAC roles | 🟡 | roles+matrix UI (read-only); no enforcement |
| 057 | Dashboard KPIs | 🟡 | dashboard UI (mock data) |
| 058 | Products admin ops | 🟡 | full UI; unwired |
| 059 | Categories admin | 🟡 | UI; unwired |
| 060 | AI Centre | 🟡 | UI; missing prompt editor; unwired |
| 061 | SEO Centre | 🟡 | health UI; missing sitemap/robots/redirect mgr |
| 062 | Analytics admin | 🟡 | UI (mock); no GA4/GSC |
| 063 | Affiliate Centre | 🟡 | UI (mock); no real clicks |
| 064 | Split XML sitemaps | ❌ | none |
| 065 | Sitemap index | ❌ | none |
| 066 | Admin robots editor | 🟡 | settings textarea; not served |
| 067 | Canonical URLs | ❌ | none |
| 068 | Breadcrumb schema | ❌ | none |
| 069 | OG/Twitter tags | 🟡 | root layout only; not per-page |
| 070 | Indexing API ping | ❌ | none |

**FR tally:** ✅ 8 · 🟡 35 · ❌ 27 (of 70).

## B. Non-functional requirements

| Group | Status | Note |
| ----- | :----: | ---- |
| Performance (§4.1/§17) | 🟡 | client-heavy pages hurt LCP/SEO; `images.unoptimized:true`; no Redis/CDN cache; needs SSR/SSG + image pipeline |
| Scalability (§4.2) | ❌ | no DB/queue/cache to scale |
| Availability (§4.3) | ❌ | single Netlify target; no backups/RTO/RPO |
| Security (§4.4/§15) | ❌ | no auth, 2FA, CSRF, rate limit, CSP, IP hashing |
| SEO NFR (§4.5) | ❌ | no canonical/sitemap/robots/noindex-on-/go |
| Data integrity (§4.6) | ❌ | no DB constraints, no review-before-index, no link health-check |

## C. Engines / subsystems

| Subsystem | Spec § | Status | Note |
| --------- | ------ | :----: | ---- |
| Amazon Affiliate Engine | 9 | ❌ | no PA-API, no `/go`, no sync, no click DB |
| AI SEO Engine | 10 | ❌ | no queue/workers/provider/prompts/validation |
| SEO infra | 11 | ❌ | no sitemaps/robots/schema/canonical |
| Content automation | 12 | ❌ | no auto-comparison/seasonal/trend jobs |
| Analytics | 13 | ❌ | no GA4 events/GSC pull/revenue calc |
| Admin backend | 14 | 🟡 | screens exist (UI); zero wiring |
| Security | 15 | ❌ | none |
| DevOps | 16 | ❌ | adapt to Node stack |
| Performance opt | 17 | 🟡 | partial frontend; backend caching absent |
| Testing | 18 | ❌ | no tests/CI |

## D. Database models (Spec §7) — presence

Spec §7 defines ~20 tables. **Zero exist** (no DB). All ❌:
`users, roles, permissions, role_permissions, categories, brands, products,
product_price_history, guides, comparisons, affiliate_clicks, ai_queue, ai_logs, seo, redirects,
settings, audit_logs, cron_logs, sitemap_logs, media, search_queries, search_console_metrics,
revenue_reports`. Mapped to Prisma in `06`.

## E. API surface (Spec §8) — presence

**Zero endpoints exist.** All spec §8 routes (Products, Categories, Guides & Comparisons,
Search, Affiliate `/go`, AI, SEO & Analytics) are ❌. Designed in `07`.

## F. Frontend SEO/structural gaps (independent of FR list)

- ❌ `app/sitemap.ts`, `app/robots.ts`
- ❌ per-route `generateMetadata` (dynamic title/desc/OG/canonical)
- ❌ `generateStaticParams` on any `[slug]` route (no SSG/ISR)
- ❌ JSON-LD (Product, Offer, AggregateRating, FAQPage, Article, BreadcrumbList, ItemList,
  Organization, WebSite+SearchAction)
- 🟡 over-use of `"use client"` — convert detail/listing pages to Server Components fetching
  the API (SEO + perf), keep interactivity in small client islands.
- ❌ URL alignment: `/comparisons/{slug}` → `/compare/{a}-vs-{b}/`; `/categories/{slug}` →
  decision needed (keep prefix vs spec `/{category-slug}/`); add `/go/{asin}` (or proxy to
  backend); `/search` → honor `?q=`. **Preserve existing routes where possible** (user
  constraint) — so we *add* redirects/aliases rather than break existing URLs. See `12`.

## G. Things that EXIST and must be preserved (no rework)

✅ Full design system & tokens (pink-gradient palette, dark mode) · ✅ all shadcn primitives ·
✅ Navbar/Footer/MobileBottomNav · ✅ ProductCard/CategoryCard/GuideCard/ComparisonCard ·
✅ all 22 public page layouts · ✅ all 16 admin screen layouts · ✅ responsiveness · ✅ INR
formatting · ✅ custom 404. **Strategy: keep the views, replace the data source, add the
backend.**

## H. Headline gap

> The frontend is ~90% visually complete and **must be preserved**. The backend, database,
> engines, auth, SEO infrastructure, and analytics ingestion are ~0–5% complete. The project is
> **"build the entire server side and wire the existing UI to it."**
