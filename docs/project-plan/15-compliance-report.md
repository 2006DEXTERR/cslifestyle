# 15 — Compliance Report (LIVE)

> **The single source for the compliance number.** Recompute after every phase. Derived from
> `04-gap-analysis.md`. Baseline date: **2026-06-14** (pre-implementation).

---

## 1. Headline compliance

| Scope | ✅ Impl | 🟡 Partial | ❌ Missing | Weighted % |
| ----- | :----: | :--------: | :--------: | :--------: |
| Functional reqs (FR-001…070) | 48 | 5 | 17 | **~69%** |
| Non-functional (perf/scale/avail/sec/seo/data) | 2 (security, SEO/SSR) | 2 | 2 | **~42%** |
| Database models (spec §7 + auth, ~33 tables) | 37 (incl. Media §7.10) (+8 beyond-spec marketing/discovery) | 0 | 0 | **~100%** |
| API endpoints (spec §8 + auth, ~67) | 129 (+25 marketing +17 media +18 discovery, beyond-spec) | 0 | ~2 | **~88%** |
| Engines/subsystems (§9–13,15,16,18) | 10 (auth §15, catalog §9, content §9, SEO §11, affiliate §9/§14.7, import §16, AI §10, analytics §13, media §16.6, **search/recs §10/§11**) + marketing (beyond-spec) | 0 | 0 | **~91%** |
| Admin screens wired (§14) | 13 (…/media/**discovery**) | 3 (UI) | 0 | **~81%** |
| Frontend pages/UI (§5,6) — *preserved asset* | — | — | — | **~90% built** (+4 auth pages; catalog + content pages DB-backed; 6 detail routes now SSR/SEO) |

> **Phase 1 (Auth & RBAC) deltas:** Security subsystem (§15) is now largely real — auth (JWT
> access+refresh w/ rotation+reuse-detection, bcrypt), 7-role RBAC w/ permission middleware
> (FR-056 ✅), CSRF (NFR-SEC-003 ✅), SQLi safety via Prisma (NFR-SEC-005 ✅), rate-limit/
> brute-force (NFR-SEC-006 ✅), IP hashing (NFR-SEC-007 ✅), CSP (NFR-SEC-009 ✅), admin session
> auth (NFR-SEC-001 ✅). 10 auth/security DB models live; ~17 auth/security endpoints live.
>
> **Auth Follow-Up (Phase 1a) update:** **TOTP 2FA (NFR-SEC-002) is now ✅** — full enrollment
> (QR + backup codes), two-step login challenge, AES-GCM-encrypted secrets, and an admin
> enforcement policy. Real email delivery (Resend, with console fallback) closes the email
> deferral. The full NFR-SEC set (001–007, 009) is now satisfied; only 008 (affiliate redirect
> whitelist) and 010 (WAF) remain for their respective later phases.
>
> **Phase 2 (Catalog) update:** the **catalog foundation is real** — Products, Categories, Brands
> are DB-backed (6 new models: Category/Brand/Product/ProductImage/ProductPriceHistory/
> SearchQuery), seeded from the existing mock so the preserved UI renders identically. 17 new
> `/api/{products,categories,brands,search}` endpoints (pagination/sort/filter/search, RBAC writes
> w/ CSRF+audit, bulk actions). The public catalog pages and the products/categories/brands admin
> screens are wired off `lib/data.ts` to the live API. DB-backed search logs queries (FR-032 ✅).
> Catalog reads/listing/filter/sort (FR-006/007/008/009/021/022/023) and search (FR-027) move to
> ✅/largely-✅. Guides/comparisons/authors schema + the affiliate/AI/SEO/analytics engines remain
> for later phases.
>
> **Phase 3 (Content) update:** the **content domain is real** — Authors, Guides, Comparisons are
> DB-backed (6 new models: Author/Guide/GuideProduct/Comparison/ComparisonSpec/ComparisonProduct +
> `ContentStatus` enum), seeded from the existing mock. ~22 new `/api/{authors,guides,comparisons}`
> endpoints (CRUD + publish/unpublish/draft, pagination/filter/sort/search, RBAC writes w/ CSRF+
> audit). All six public content pages and the guides/comparisons/authors admin screens (with full
> editor tabs) are wired off `lib/data.ts` to the live API. Guides/Comparisons/Authors CRUD +
> public rendering (FR-033…041) move to ✅/largely-✅. The affiliate `/go` engine, AI, SEO infra,
> and analytics remain for later phases. (Also fixed a homepage SSR hydration mismatch via a shared
> `en-IN` number formatter.)
>
> **Phase 4 (SSR & SEO) update:** the **SEO foundation is real**. All 6 detail routes are now
> **async Server Components** (data + metadata + JSON-LD in the initial HTML), with `generateMetadata`
> (canonical + OpenGraph + Twitter), `generateStaticParams` + **ISR**, Product/Article/Breadcrumb/
> Organization **JSON-LD**, `app/sitemap.ts` (DB-driven) + `app/robots.ts`, and real 404s. Sitemaps/
> robots/canonical/structured-data (FR-064/065/066 + the NFR-SEO set on SSR/meta/schema) move to
> ✅/largely-✅. A repo-wide hydration sweep routes all number/date formatting through a deterministic
> `en-IN` formatter. Indexing-ping, GSC ingest, and per-entity analytics remain for later phases.
>
> **Phase 5 (Affiliate) update:** the **affiliate engine is real**. 5 new models (AffiliateClick/
> Campaign/Settings + RevenueImport/Report); a fast **`/go/{asin}` redirect** (amazon.in whitelist,
> associate tag, <100ms 302) with **privacy-safe** SHA-256 click logging; `/api/affiliate/*` +
> `/api/revenue/*` (stats, top-products, clicks, compliance, settings, campaigns, **CSV import**,
> summary) with RBAC + audit; storefront CTAs routed through `/go` with `rel="sponsored nofollow"`;
> **/admin/affiliate fully wired** off mock. FR-044/046/049 (redirect/tracking/whitelist), FR-062
> (affiliate dashboards), FR-063 (compliance) → ✅; revenue-import path live. Live order/conversion
> API + revenue forecasting remain for later phases.
>
> **Phase 6 (Import Center) update:** the **import/catalog-automation subsystem is real**. 3 new
> models (ImportJob/ImportItem/ImportTemplate + 4 enums = 25 total); a **BullMQ/Redis queue** with an
> inline-vs-bullmq driver (ADR-023) + 3 workers; a **CSV import engine** (exact 10-column schema,
> required-field + ASIN-format validation, malformed-row + invalid/duplicate-ASIN handling, detailed
> error report), **ASIN import**, **nested category import** (parent mapping + slug gen); **duplicate
> detection** (asin/slug/title × skip/overwrite/create-copy); **import reports** (imported/skipped/
> failed/duplicates/duration, stored + API); 12 `/api/import/*` endpoints with RBAC (import.view/
> create/manage) + CSRF + audit + Swagger; **/admin/import fully wired** off mock (dashboard/queue/
> history/wizard, live progress). **FR-015 (bulk import), FR-016 (CSV import), FR-017 (ASIN import),
> FR-018 (category import), FR-019 (duplicate detection), FR-020 (import reports), FR-021 (import job
> tracking) → ✅.** Real PA-API enrichment (live title/price/image from Amazon) + scheduled sync
> remain for the dedicated import-sync phase — ASIN import currently creates a **draft stub** product.
>
> **Phase 7 (AI Content Engine) update:** the **AI content engine is real**. 2 new models (AiQueue/
> AiLog) + `Product.aiStatus`/`aiGeneratedAt` (DB models → ~97%); a **provider abstraction** (Claude
> primary → OpenAI → Gemini) with an offline **mock driver** + per-model cost accounting (ADR-024);
> queue-based generation (inline/bullmq + `ai-generation` worker, concurrency=4); **10 admin-editable
> prompt templates** (FR-054) + renderer; per-field generation (title/meta/desc/pros/cons/5 FAQs +
> comparison verdict + category/guide) with **quality validation** (§10.5) and a **review-before-index
> approval gate** (FR-052/§4.6); **AI logs** (tokens/cost/model/status, 30-day retention, FR-055);
> **auto-trigger on import** (FR-006/050); 13 `/api/ai/*` endpoints w/ RBAC (ai.view/generate/manage) +
> CSRF + audit; **/admin/ai wired** off mock (all tabs real, Logs filled, new Prompts tab). **FR-050,
> FR-051, FR-052, FR-053, FR-054, FR-055 → ✅; FR-006 (import auto-trigger), FR-060 (AI Centre) → ✅;
> FR-038/041 (guide/comparison AI) → largely ✅.** Real PA-API enrichment of imported products + auto-
> applying the JSON-LD-schema/internal-links templates remain for later phases.
>
> **Phase 8 (Analytics & Reporting) update:** the **analytics subsystem (§13) is real**. 4 new models
> (AnalyticsEvent/PageView/ProductView/ReportSnapshot → DB models ~98%); a first-party engine over the
> existing event sources (AffiliateClick/AiLog/SearchQuery/ImportJob/RevenueReport) + **privacy-safe view
> tracking** (SHA-256(ip) only, NFR-SEC-007) via an invisible client beacon; aggregations for dashboard,
> product, search, **revenue (daily/weekly/monthly + by category/brand + clicks×CVR×commission estimate,
> §13.4)**, AI usage, and content; report snapshots + a BullMQ analytics worker (daily/weekly/monthly +
> cleanup); external **provider adapters (PostHog/GA4/GSC) offline-mock by default** (ADR-025); 14
> `/api/analytics/*` endpoints w/ RBAC (analytics.view/manage, reports.view/manage) + CSRF + audit;
> **/admin/analytics wired** off mock with the cards/charts/layout preserved. **FR-032 (search logging),
> FR-057 (dashboard KPIs), FR-062 (analytics admin), FR-063 (affiliate reporting) → ✅.** Live GA4/GSC
> OAuth ingestion + `SearchConsoleMetric` upsert remain a deployment task (adapters are ready).
>
> **Phase 9 (Marketing & Communication) update:** a **Marketing Center** is live — **beyond the base
> blueprint** (FR-001…070 have no marketing requirements; the screen was a mock — ADR-026), so it adds
> no FR coverage but a real subsystem. 4 new models (NewsletterSubscriber/Campaign/CampaignRecipient/
> EmailEvent); **newsletter** (subscribe, **double opt-in** w/ hashed verify token, one-click
> unsubscribe, dedup); **subscriber management** (search/filter/export/tags/stats); **campaigns**
> (CRUD/draft/schedule/test/send/history) with 4 email templates (newsletter + product/guide/comparison
> announcements reusing AI copy); **open/click tracking** (pixel + redirect) → delivered/opened/clicked/
> failed counters; reuses the existing **email provider** (Resend → console fallback, offline-safe); a
> BullMQ **marketing worker** (welcome/verify/campaign-send/retry/cleanup); 25 `/api/marketing/*` +
> `/api/newsletter/*` endpoints w/ RBAC (marketing.view/newsletter.manage/campaign.manage) + CSRF +
> audit; **/admin/marketing wired** off mock with cards/tabs/charts preserved. The mock Push
> Notifications tab is out of scope and left unwired.
>
> **Phase 10 (Media Library) update:** a production **Media Library** is live — closing the last
> §7 DB gap (the **`Media` model**, §7.10) and tying into **FR-014** (WebP image gallery). 3 models
> (MediaAsset/MediaUsage/MediaFolder); **upload** (multipart multi-file + drag-drop + **hash dedup**)
> for jpg/jpeg/png/webp/svg; **sharp optimization** (webp + thumbnail + responsive sizes + dimensions,
> ADR-027); browse/search/folders, metadata (alt/caption), **replace-in-place**, delete, **usage
> tracking** + **unused-asset detection**; files on disk served at `/uploads`; AI/Import integration
> (link assets by URL — **no image generation**; CSV imports attach media); 17 `/api/media/*` endpoints
> w/ RBAC (media.view/upload/manage) + CSRF + audit; a **new `/admin/media`** admin screen built in the
> existing design language. Spec §7 DB models now ~100%; CDN/object-store swap remains a deployment task.
>
> **Phase 11 (Discovery: Search + Recommendations + Internal Linking) update:** discovery intelligence
> is real. 4 new models (SearchSynonym/SearchIndexEntry/RecommendationRule/InternalLink); a **unified
> search index** over all 6 entity types powering **advanced search** (weighted + **fuzzy** Levenshtein
> + **synonym**-expanded + suggestions + zero-result did-you-mean + trending — **FR-027…032 deepened**);
> a **recommendation engine** (related/similar products + related guides/comparisons + category/brand/
> price/trending with **affiliate-performance weighting**, rule-configurable); **internal-linking**
> automation (suggestions + anchor gen + **broken-link detection**, review-only); a discovery BullMQ
> worker; 18 `/api/search/*` + `/api/recommendations/*` endpoints w/ RBAC (search.manage,
> recommendations.view/manage) + CSRF + audit; **real recommendations wired into the product/guide/
> comparison detail SSR** + real trending on the search page (layout preserved); a **new `/admin/search`**
> (Discovery) admin screen. ADR-028.
>
> **Phase 12 (Final — Production Hardening & Blueprint Audit) update:** the platform is **production-ready**.
> The full hardening surface is verified (env validation, secure cookies, CORS, CSRF, 6 rate limiters,
> Helmet/CSP, body/upload size limits, central error handling, structured logs + request IDs, audit
> logging, AES-256-GCM secrets, `/healthz` + `/readyz`); deployment artifacts added (frontend Dockerfile +
> Next standalone, `docker-compose.prod.yml` 5-service profile + one-shot migrate + uploads volume,
> `.env`/`.env.production`/expanded `server/.env.example`, production README); CI gained a frontend job; a
> **final FR-001…070 compliance audit** + security audit (no critical/high) were produced. **No new
> features / no UI changes.** See the final reports under `phase-reports/phase-12-*`. **All 12 phases
> complete.** The residual gap is genuinely **external integrations** (live PA-API / GA4 / GSC / Indexing
> API) + **cloud ops** (CDN/WAF/managed infra) — credential- and hosting-dependent, not app work.

> **Scoring convention:** ✅ = 1.0, 🟡 = 0.33 (UI/stub, no real behaviour), ❌ = 0.
> FR weighted = (8×1.0 + 35×0.33) / 70 ≈ **0.28** of *credit*, but since 🟡 here is almost
> entirely *unwired UI* (no backend behaviour), **behavioural compliance ≈ 17%**. We report two
> numbers to avoid over-crediting mockups:
>
> - **Behavioural compliance (real, working):** **~72%** overall (was ~10% at baseline).
> - **Surface compliance (incl. mock UI as partial):** **~80%** overall.
>
> **Frontend visual completeness (asset to preserve): ~90%.**

**One-line status:** *Frontend ~90% visually complete and preserved; auth/security + catalog + content
are real and DB-backed, the 6 detail routes are SSR'd with full SEO, and the **affiliate**, **Import**,
**AI**, **Analytics**, **Marketing**, **Media Library**, and **Discovery (advanced search +
recommendations + internal linking) engines are live** — spec §7 DB models ~100%, §8 endpoints ~88%;
remaining work is deployment / production-infra hardening + the final audit. The server is being built
and wired phase by phase.*

## 2. Compliance trend (update each phase)

| Date | Phase done | Behavioural % | Surface % | Notes |
| ---- | ---------- | :-----------: | :-------: | ----- |
| 2026-06-14 | Planning | ~10% | ~28% | baseline established |
| 2026-06-14 | Phase 0 | ~10% | ~29% | backend foundation only — no FR/§7/§8 behaviour yet; infra (Express/Prisma/Redis/BullMQ/Swagger/health/CI/Docker) now real |
| 2026-06-14 | Phase 1 (Auth & RBAC) | ~16% | ~34% | real security subsystem: auth+JWT+rotation, 7-role RBAC, CSRF, rate-limit, audit, 8 DB models, 10 endpoints, 4 auth pages, admin guard; 30 unit + 13 integration tests |
| 2026-06-14 | Phase 1a (2FA + Email) | ~18% | ~36% | TOTP 2FA (NFR-SEC-002 ✅) + Resend email; 10 DB models, ~17 endpoints; 51 unit + 16 integration tests |
| 2026-06-15 | Phase 2 (Catalog: Products/Categories/Brands) | ~26% | ~42% | DB-backed catalog (6 new models = 16 total), seeded from mock; 17 `/api/{products,categories,brands,search}` endpoints (pagination/sort/filter/search, RBAC writes, bulk, query logging); public + admin catalog pages wired off mock; 68 unit + 33 integration tests (101/101 green vs real Postgres) |
| 2026-06-15 | Phase 3 (Content: Guides/Comparisons/Authors) | ~33% | ~48% | DB-backed content (6 new models = 22 total), seeded from mock; ~22 `/api/{authors,guides,comparisons}` endpoints (CRUD + publish/unpublish/draft, pagination/filter/sort/search, RBAC writes); 6 public + 3 admin pages wired off mock; homepage hydration fix; 117/117 tests green vs real Postgres |
| 2026-06-15 | Phase 4 (SSR & SEO Foundation) | ~38% | ~52% | 6 detail routes → async Server Components + client islands; generateMetadata (canonical/OG/Twitter); Product/Article/Breadcrumb/Org JSON-LD; sitemap.ts (50 URLs) + robots.ts; generateStaticParams + ISR; repo-wide hydration sweep; live SSR smoke verified; build 82 pages |
| 2026-06-15 | Phase 5 (Affiliate System) | ~44% | ~57% | 5 models (clicks/campaigns/settings/revenue-import/report); `/go/:asin` redirect (whitelist + tag + privacy-safe SHA-256 logging); `/api/affiliate/*` + `/api/revenue/*` (stats/top/clicks/compliance/settings/campaigns/CSV-import/summary) w/ RBAC+audit; /admin/affiliate wired; storefront CTAs → /go; 137/137 tests; live smoke verified |
| 2026-06-15 | Phase 6 (Import Center & Catalog Automation) | ~48% | ~60% | 3 models (ImportJob/ImportItem/ImportTemplate) + 4 enums; BullMQ/Redis queue (inline-vs-bullmq driver, ADR-023) + 3 workers; CSV/ASIN/nested-category import engines; duplicate detection (asin/slug/title × skip/overwrite/create-copy); import reports; 12 `/api/import/*` endpoints (RBAC import.view/create/manage + CSRF + audit); /admin/import wired off mock w/ live progress; FR-015…021 ✅; 161/161 tests green vs real Postgres |
| 2026-06-15 | Phase 7 (AI Content Engine & AI Center) | ~55% | ~65% | 2 models (AiQueue/AiLog) + 5 enums + Product.aiStatus/aiGeneratedAt; provider abstraction (Claude→OpenAI→Gemini) + offline mock driver (ADR-024); queue-based generation (inline/bullmq + ai-generation worker); 10 editable prompt templates (FR-054); quality validation (§10.5) + review-before-index gate (FR-052); AI logs tokens/cost 30-day retention (FR-055); auto-trigger on import (FR-006/050); 13 `/api/ai/*` endpoints (RBAC ai.view/generate/manage + CSRF + audit); /admin/ai wired off mock + new Prompts tab; FR-050…055/060 ✅; 169/169 tests green vs real Postgres |
| 2026-06-15 | Phase 8 (Analytics & Reporting Center) | ~62% | ~71% | 4 models (AnalyticsEvent/PageView/ProductView/ReportSnapshot) + enum; first-party engine over existing sources + privacy-safe view beacon (SHA-256(ip) only); dashboard/product/search/revenue/AI/content aggregations + report snapshots; offline PostHog/GA4/GSC adapters (ADR-025); BullMQ analytics worker (daily/weekly/monthly + cleanup); 14 `/api/analytics/*` endpoints (RBAC analytics.view/manage + reports.view/manage + CSRF + audit); /admin/analytics wired off mock; FR-032/057/062/063 ✅; 181/181 tests green vs real Postgres |
| 2026-06-15 | Phase 9 (Marketing & Communication Center) — *beyond-spec* | ~66% | ~74% | 4 models (NewsletterSubscriber/Campaign/CampaignRecipient/EmailEvent) + 4 enums; newsletter (double opt-in w/ hashed token, one-click unsubscribe, dedup) + subscriber mgmt (search/filter/export/tags/stats); campaigns (CRUD/schedule/test/send) + 4 templates (reuse AI copy); open/click tracking; reuses email provider (Resend→console, offline); BullMQ marketing worker; 25 `/api/marketing/*`+`/api/newsletter/*` endpoints (RBAC marketing.view/newsletter.manage/campaign.manage + CSRF + audit); /admin/marketing wired off mock; no new FR coverage (ADR-026); 197/197 tests green vs real Postgres |
| 2026-06-15 | Phase 10 (Media Library & Asset Management) | ~69% | ~77% | 3 models (MediaAsset/MediaUsage/MediaFolder) — closes the §7.10 `Media` model + FR-014 (WebP) tie-in; upload (multipart multi-file + drag-drop + hash dedup) jpg/jpeg/png/webp/svg; sharp optimization (webp/thumbnail/responsive + dimensions, ADR-027); browse/search/folders + metadata + replace-in-place + delete; usage tracking + unused detection; files on disk at `/uploads`; AI/Import link-by-URL (no image gen); 17 `/api/media/*` endpoints (RBAC media.view/upload/manage + CSRF + audit); new /admin/media screen; 209/209 tests green vs real Postgres |
| 2026-06-15 | Phase 11 (Discovery: Search + Recommendations + Internal Linking) | ~72% | ~80% | 4 models (SearchSynonym/SearchIndexEntry/RecommendationRule/InternalLink) + 2 enums; unified search index over 6 entity types; advanced search (weighted + fuzzy Levenshtein + synonym + suggestions + did-you-mean + trending); recommendation engine (related/similar + category/brand/price/trending + affiliate-performance weighting, rule-configurable); internal linking (suggestions + broken-link detection, review-only); discovery BullMQ worker; 18 `/api/search/*`+`/api/recommendations/*` endpoints (RBAC search.manage/recommendations.view/manage + CSRF + audit); real recs in product/guide/comparison SSR + real trending on search page; new /admin/search screen; FR-027…032 deepened (ADR-028); 220/220 tests green vs real Postgres |
| 2026-06-15 | **Phase 12 (Final — Production Hardening, Deployment & Blueprint Audit)** | **~72%** | **~80%** | Verified hardening surface (env validation/cookies/CORS/CSRF/rate-limits/Helmet+CSP/size-limits/error-handling/logs+request-ids/audit/secrets/health+readiness); frontend Dockerfile + Next standalone + `docker-compose.prod.yml` (5 services + one-shot migrate + uploads volume); expanded env examples + production README; CI frontend job (ADR-029); final FR-001…070 blueprint audit + security audit (no critical/high). **No new features / no UI change.** 11 migrations from empty + seed + 220/220 tests; both builds green |
| — | **All 12 phases complete — production-ready** | — | — | residual = external integrations (live PA-API/GA4/GSC/Indexing) + cloud ops (CDN/WAF/managed infra) |

> **Phase 0 note:** Phase 0 is *enabling infrastructure*, not feature compliance — it does not
> move FR-001…070, spec §7 models, or spec §8 endpoints (those begin in Phases 1–2). Behavioural
> % is essentially unchanged; what changed is that the platform to build them on now exists and
> is verified (build/lint/typecheck/test/CI all green; health endpoints live).

## 3. Missing Features Report (behavioural)

**Entirely missing (❌):** PA-API import (all 5 methods, real) · AI content engine (queue,
providers, prompts, validation, review) · `/go/{asin}` redirect + click tracking + whitelist ·
price/rating/availability sync + auto-deactivate + price history · full-text search +
autocomplete + query logging · auth + 2FA + RBAC enforcement · sitemaps/robots/redirects/
canonical/breadcrumb-schema/Indexing-ping · GA4 events + GSC ingestion + revenue calc ·
auto-comparison/seasonal/trend automation · "users also viewed"/view tracking · daily link
health-check · Redis caching + WebP image pipeline.

**Present but unwired (🟡, UI only):** all 16 admin screens · import wizard · AI center · SEO
center health · analytics/affiliate dashboards · settings groups · roles matrix.

**Present & real (✅):** public page layouts, components, design system, responsiveness, INR
formatting, custom 404, basic root metadata.

## 4. Missing APIs Report

**100% of spec §8 is missing.** Build per `07`: Products (13) · Categories (6) · Guides &
Comparisons (10) · Search (3) · Affiliate incl `/go` (5) · AI (8) · SEO & Analytics (10) · Auth/
Users/Roles/Settings (§15, ~12). Public SEO files (`/sitemap*.xml`, `/robots.txt`) also missing.

## 5. Missing Database Models Report

**100% of spec §7 missing** (no DB). To build (`06`): users, roles, permissions,
role_permissions, categories, brands, products, product_price_history, guides, comparisons,
affiliate_clicks, ai_queue, ai_logs, seo, redirects, settings, audit_logs, cron_logs,
sitemap_logs, media, search_queries, search_console_metrics, revenue_reports.

## 6. Missing Workflows Report

Import→AI pipeline · tiered price-sync scheduler · rating-sync · availability/OOS + auto-
deactivate · `/go` click-event async pipeline · AI generation + quality-validation + review/
approve → publish · sitemap regeneration + Indexing ping on publish · GSC daily pull · GA4
server events · revenue estimation + Amazon CSV import · comparison-opportunity detector ·
seasonal/trend content scheduler · link health-check · cache warm/prune. **All absent.**

## 7. Sanctioned deviations (NOT counted as defects)

| Deviation | Why | Authority |
| --------- | --- | --------- |
| Backend = Node/Express/TS (not Laravel/PHP) | user mandate | `01` §3–4, ADR-002 |
| DB = PostgreSQL/Prisma (not MySQL/Eloquent) | user mandate | `01` §3, ADR-004 |
| Full-text via Postgres tsvector (not MySQL FULLTEXT) | stack | ADR-004 |
| Queue/cron via BullMQ (not Horizon/Artisan) | stack | ADR-003 |
| UI palette = existing pink-gradient (not spec blue/green §6) | user: preserve colors | ADR-005 |
| Existing routes preserved + spec aliases added (not hard URL migration) | user: preserve routes | ADR-006 |
| Frontend = Next.js (not Blade/Alpine/HTMX) | user: don't migrate FE | `01` §4 |

These satisfy spec *intent* via a different, mandated implementation. Compliance scoring treats
them as **met**, not missing.

## 8. Risks to compliance

- **PA-API access/approval** (Amazon Associates account + throughput) gates FR-001…005,015,016.
- **AI cost/limits** at content scale (spec wants 1000 jobs/hr) — needs budget caps (§14.10).
- **SEO/perf** depend on converting client pages → SSR/SSG (Phase 2) and image pipeline (Phase
  11); risk if preservation constraint is read too literally (we enhance, not redesign).
- **"Preserve UI" objectivity** — recommend visual-regression tests (`13` §7) to prove
  preservation per phase.
- **Dependency advisories (accepted, dev-only):** 5 `npm audit` findings in the
  Vitest→Vite→esbuild chain (esbuild ≤0.28.0, Deno binary-integrity). Not in the runtime/
  production image; no clean upstream fix yet. Tracked in ADR-009; re-check each phase. **0
  runtime advisories.**

## 9. How to recompute (each phase)
1. Update statuses in `04`. 2. Re-tally FR ✅/🟡/❌ and subsystem counts. 3. Update §1 table +
§2 trend row here. 4. Move items from "Missing" to "Present & real" as wired. 5. Note any new
sanctioned deviation in §7 + `12`.
