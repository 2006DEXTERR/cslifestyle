# 09 — Feature Roadmap (Phased)

> Engineering sequencing to close the gaps in `04`. Each phase is a coherent, shippable
> increment with **Goals · Deliverables · Files affected · DB changes · API changes · Testing ·
> Completion criteria**. Live status is tracked in `10-phase-tracker.md`; do not duplicate
> status here. Ordering favors: foundation → data → public read path (SEO value) → affiliate
> revenue → AI → admin wiring → analytics → hardening.

---

## Phase 0 — Backend foundation & tooling
- **Goals:** stand up the Node/Express/TS + Prisma/Postgres skeleton; dev environment; CI shell.
- **Deliverables:** `server/` scaffold (Express app, config via zod env, pino logger, error +
  envelope middleware, healthcheck); Prisma init + Postgres via Docker Compose; root API-client
  stub; remove unused Supabase dep; ESLint/Prettier/tsconfig for server; GitHub Actions skeleton
  (typecheck+lint+test).
- **Files:** `server/**` (new), `docker-compose.yml`, `.github/workflows/ci.yml`, root
  `lib/api/` stub, `package.json` (server).
- **DB:** Prisma datasource + first empty migration.
- **API:** `GET /healthz`, envelope helper.
- **Testing:** boot test; healthcheck test; CI green.
- **Done when:** `server` builds, connects to Postgres+Redis, CI passes, frontend still runs
  unchanged.

## Phase 1 — Database schema + seed
- **Goals:** implement full `schema.prisma` from `06`; seed mock data + roles/permissions/settings.
- **Deliverables:** all models, enums, indexes, tsvector migration; `seed.ts` porting
  `lib/data.ts`; seeded 7 roles + permission matrix + Super Admin + default settings.
- **Files:** `server/prisma/**`.
- **DB:** all tables created via migration.
- **API:** none yet.
- **Testing:** migration up/down; seed idempotency; constraint tests (ASIN unique).
- **Done when:** `prisma migrate` + `seed` reproduce the catalog in Postgres.

## Phase 2 — Public read API + frontend wiring (SSR/SEO)
- **Goals:** serve catalog/content via API; repoint frontend off mock; convert read pages to
  Server Components with metadata/SSG.
- **Deliverables:** GET products/categories/guides/comparisons/brands/authors endpoints +
  filters/sort/pagination; `lib/api/*` client; convert `products/[slug]`, `categories/[slug]`,
  `guides/[slug]`, `comparisons/[slug]`, listing pages to Server Components + `generateMetadata`
  + `generateStaticParams`; JSON-LD helpers (Product/Article/Breadcrumb/ItemList); preserve
  markup/styles.
- **Files:** `server/src/routes|controllers|services/*`, `app/**` (read pages), `lib/api/**`,
  `app/sitemap.ts`/`app/robots.ts` (initial).
- **DB:** read-only.
- **API:** §2.1–2.4 GET routes.
- **Testing:** API contract tests; page render/SEO tests (title, canonical, JSON-LD present);
  visual parity check vs current.
- **Done when:** public site renders identical UI from the DB, with per-page SEO, no mock import.

## Phase 3 — Affiliate engine (revenue path)
- **Goals:** `/go` redirect + click tracking + disclosure + whitelist; associate-tag config.
- **Deliverables:** `/go/{asin}` (302, <100ms, async event), `AffiliateLinkService`,
  click-event worker → `affiliate_clicks` (IP/UA SHA-256), whitelist validation, auto disclosure
  injection, `rel`/new-tab on outbound; admin affiliate read endpoints + wire Affiliate Center.
- **Files:** `server/src/engines/amazon/affiliate*`, `routes/go.ts`, `jobs/click*`, frontend CTA
  link updates, `app/admin/affiliate` wiring.
- **DB:** `affiliate_clicks` writes; settings (tag).
- **API:** §2.5.
- **Testing:** 302 + Location host; whitelist reject; IP hashed; click logged with source
  (spec §18.7 checklist); redirect latency.
- **Done when:** clicks route through `/go`, tracked, compliant; Affiliate Center shows real data.

## Phase 4 — Amazon PA-API import & sync
- **Goals:** real product ingestion + scheduled price/rating/availability sync + price history.
- **Deliverables:** PA-API 5.0 client (SigV4, 1 req/s limiter), GetItems/SearchItems/
  BrowseNodes; ASIN/URL/CSV/category/one-click importers (FR-001–005,007,008); BullMQ +
  scheduler: tiered price sync (FR-015), rating sync (FR-016), availability+OOS (FR-017),
  auto-deactivate 30d (FR-018), price history (FR-019); wire Import Center + queue/history.
- **Files:** `server/src/engines/amazon/**`, `jobs/**`, `app/admin/import` wiring.
- **DB:** products upsert, `product_price_history`, `cron_logs`.
- **API:** import + sync-prices endpoints (§2.1).
- **Testing:** ASIN regex/dup; SigV4 signing (mocked PA-API); importer idempotency; scheduler
  tier selection; sync updates timestamps.
- **Done when:** an ASIN/CSV/URL import creates real products; prices refresh on schedule.

## Phase 5 — AI content engine
- **Goals:** queue-based AI generation with provider abstraction, prompts, validation, review.
- **Deliverables:** provider abstraction (**Claude primary**, OpenAI fallback); prompt templates
  (title/meta/desc/pros/cons/FAQ/guide/comparison/category/schema/internal-links) editable in
  settings (FR-054); AI queues + workers (FR-050/051); content store + view/edit/approve/
  regenerate (FR-052); `ai_logs` cost/token (FR-055); quality validation (§10.5); auto-trigger
  on import (FR-006); wire AI Center (incl. **new prompt editor**).
- **Files:** `server/src/engines/ai/**`, `jobs/ai*`, `app/admin/ai` wiring.
- **DB:** `ai_queue`, `ai_logs`, settings (prompts/provider).
- **API:** §2.6 + generate-ai endpoints.
- **Testing:** provider mock; prompt render; validation rules; approval gate blocks indexing;
  cost logging.
- **Done when:** import auto-generates reviewable AI content; admin can edit prompts + approve.

## Phase 6 — Search & autocomplete
- **Goals:** real full-text search, autocomplete, trending, query logging.
- **Deliverables:** Postgres tsvector search (FR-027/028); `/search` honoring `?q=&type=&page=`
  with filter/sort parity (FR-030); autocomplete ≤200ms (FR-029); trending + no-results
  suggestions (FR-031); `search_queries` logging (FR-032); wire navbar + `/search` page.
- **Files:** `server/src/services/search*`, `app/search` + Navbar updates, `lib/api/search`.
- **DB:** tsvector index; `search_queries`.
- **API:** §2.4.
- **Testing:** relevance; autocomplete latency; query logged; URL `?q=` SSR.
- **Done when:** site search + autocomplete are real and logged.

## Phase 7 — Auth, RBAC, 2FA + admin write wiring
- **Goals:** secure the admin; wire CRUD across all admin screens.
- **Deliverables:** auth (JWT, bcrypt/argon2), TOTP 2FA (mandatory roles), RBAC middleware +
  enforcement, login throttle, audit logging; wire Products/Categories/Brands/Guides/
  Comparisons/Authors/Users/Roles/Settings CRUD; dashboard KPIs (FR-057); rich-text guide editor
  (FR-033/034).
- **Files:** `server/src/middleware/auth|rbac|2fa|audit`, `routes/auth*`,`/admin/*`, all
  `app/admin/**` wiring.
- **DB:** users/roles/permissions, audit_logs writes.
- **API:** §2.8 + all admin write routes.
- **Testing:** auth/2fa/rbac (positive+negative), audit entries, CRUD round-trips.
- **Done when:** admin requires login+2FA, role-gated, and every screen performs real CRUD.

## Phase 8 — SEO infrastructure
- **Goals:** sitemaps, robots, redirects, canonical, schema, indexing ping.
- **Deliverables:** split sitemaps + index (FR-064/065, 10k/file), admin robots editor served
  (FR-066), redirect manager + middleware (FR-061 + route reconciliation), canonical everywhere
  (FR-067), breadcrumb schema (FR-068), OG/Twitter per page (FR-069), Indexing API ping on
  publish (FR-070); `/compare/{a}-vs-{b}/` alias + `?q=` + category-prefix decision; wire SEO
  Center (sitemap/robots/redirect managers).
- **Files:** `app/sitemap*`, `app/robots.ts`, `server/src/engines/seo/**`, redirect middleware,
  `app/admin/seo` wiring.
- **DB:** `seo`, `redirects`, `sitemap_logs`.
- **API:** §2.7 + public SEO files.
- **Testing:** sitemap validity + pagination; robots served; redirect 301; canonical/JSON-LD
  validate (Rich Results); `/go` excluded+noindex.
- **Done when:** full SEO surface live and admin-controllable.

## Phase 9 — Analytics & revenue
- **Goals:** GA4 events, GSC ingestion, revenue estimation, dashboards real.
- **Deliverables:** GA4 client events + server Measurement Protocol (§13.2/13.3); GSC daily pull
  (§13.6) → `search_console_metrics`; revenue calc (clicks×CVR×commission) + Amazon CSV import
  (§13.4) → `revenue_reports`; wire Analytics + Revenue (split from Affiliate per spec §14.9).
- **Files:** `server/src/jobs/analytics*`, `engines/seo|analytics`, `app/admin/analytics`,
  new `app/admin/revenue` wiring.
- **DB:** `search_console_metrics`, `revenue_reports`.
- **API:** §2.7 analytics routes.
- **Testing:** GA4 event payloads; GSC upsert; revenue math; dashboard data.
- **Done when:** admin analytics/revenue show real, ingested data.

## Phase 10 — Content automation
- **Goals:** auto-comparison detector, seasonal/trend scheduling, comparison auto-gen (FR-043).
- **Deliverables:** nightly comparison-opportunity detector (§12.3), seasonal content calendar
  (§12.5), category/guide refresh triggers (§12.4), 2–5 product comparison support (FR-039).
- **Files:** `server/src/jobs/content*`, services.
- **DB:** comparisons, schedule tables.
- **API:** internal/admin triggers.
- **Testing:** detector query; schedule firing; dedup vs existing.
- **Done when:** comparisons/guides auto-proposed and queued.

## Phase 11 — Performance, hardening, deploy
- **Goals:** hit NFR targets; production deploy; backups; monitoring.
- **Deliverables:** Redis caching (§16.5), image/WebP pipeline (FR-014) + re-enable Next image
  opt, Core Web Vitals tuning (§17), load tests (k6, §18.5), CSP/headers, backups+RTO/RPO,
  deploy per `14`, launch checklist (§19).
- **Files:** caching middleware, image pipeline, infra configs, `14` artifacts.
- **DB:** retention/prune jobs; indexes review.
- **API:** cache layer.
- **Testing:** k6 thresholds (p95<2s, <1% err); Lighthouse ≥90/95; security review.
- **Done when:** prod live, NFRs met, monitored, backed up.

---

## Cross-phase notes
- Preserve UI/markup/colors/routes throughout (user constraint); enhancements only.
- After **every** phase: update `10`, `11`, `12`, `15`.
- Re-sequencing allowed if dependencies shift — record the change in `12` + `11`.
