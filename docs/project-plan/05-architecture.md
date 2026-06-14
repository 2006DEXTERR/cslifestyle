# 05 — Target Architecture

> Re-expresses the blueprint (Laravel/MySQL/Blade) in the mandated **Node.js + Express + TS /
> PostgreSQL + Prisma / preserved Next.js** stack. See `01` §3–4 for the mandate.

---

## 1. High-level topology

```
                         ┌────────────────────────┐
   Browser / Googlebot ─▶│  Cloudflare (CDN/WAF)  │
                         └───────────┬────────────┘
                    ┌────────────────┴─────────────────┐
                    ▼                                   ▼
        ┌────────────────────────┐          ┌────────────────────────────┐
        │  Next.js frontend      │  HTTP    │  Express API (TypeScript)  │
        │  (App Router, SSR/SSG) │ ───────▶ │  /api/v1/*  +  /go/{asin}  │
        │  preserved UI          │  JSON    │  + sitemap/robots routes   │
        └────────────────────────┘          └─────────────┬──────────────┘
                                                           │ Prisma
                                          ┌────────────────┼─────────────────┐
                                          ▼                ▼                 ▼
                                   ┌────────────┐   ┌────────────┐   ┌──────────────┐
                                   │ PostgreSQL │   │   Redis    │   │ Object store │
                                   │ (Prisma)   │   │ cache+queue│   │ (images/WebP)│
                                   └────────────┘   └─────┬──────┘   └──────────────┘
                                                          │ BullMQ
                                                   ┌──────┴───────┐
                                                   │ Worker procs │  AI gen · PA-API sync ·
                                                   │ + scheduler  │  sitemaps · imports ·
                                                   └──────┬───────┘  analytics pulls
                                            external:  Amazon PA-API 5.0 · Claude/OpenAI ·
                                                       GA4 · Search Console · Indexing API
```

## 2. Repository shape (monorepo, additive — frontend untouched in place)

```
cslifestyle/
├─ app/  components/  lib/  hooks/        # EXISTING Next.js frontend (preserve)
│   └─ lib/api/                           # NEW: typed API client (replaces lib/data.ts getters)
├─ server/                               # NEW backend (Node + Express + TS)
│   ├─ src/
│   │  ├─ index.ts                       # Express bootstrap
│   │  ├─ app.ts                         # middleware pipeline (helmet, cors, csrf, rate-limit)
│   │  ├─ config/                        # env schema (zod), constants
│   │  ├─ routes/                        # express routers per domain (mirror spec §8)
│   │  ├─ controllers/                   # thin HTTP layer
│   │  ├─ services/                      # business logic (AffiliateLinkService, AiService…)
│   │  ├─ engines/
│   │  │  ├─ amazon/                     # PA-API client, importers, sync, sigv4
│   │  │  ├─ ai/                         # provider abstraction, prompts, validation
│   │  │  └─ seo/                        # sitemap/robots/schema generators
│   │  ├─ jobs/                          # BullMQ processors + scheduler defs
│   │  ├─ middleware/                    # auth, rbac, 2fa, error, audit
│   │  ├─ lib/                           # prisma client, redis, logger, hashing
│   │  └─ types/
│   ├─ prisma/
│   │  ├─ schema.prisma                  # spec §7 → Prisma (see 06)
│   │  ├─ migrations/
│   │  └─ seed.ts                        # migrate lib/data.ts mock → DB
│   ├─ tests/
│   ├─ package.json                      # separate from root; Express/Prisma deps
│   └─ tsconfig.json
├─ docs/project-plan/                    # THIS planning system
└─ package.json                          # existing Next deps (add API-client/env only)
```

**Decision (see `12` ADR-001):** two `package.json` (root = frontend, `server/` = backend).
Keeps deps isolated, lets each deploy independently, avoids polluting the preserved frontend.
A root npm workspace may be added later for unified scripts.

## 3. Layered backend design

1. **Routes** (Express routers) — URL + method + auth middleware; mirror spec §8.
2. **Controllers** — validate (zod), call services, shape the spec response envelope
   `{ status, data, meta, message, errors }`.
3. **Services** — domain logic; the only layer allowed to touch Prisma + engines.
4. **Engines** — Amazon, AI, SEO (heavy, externally-integrated subsystems).
5. **Jobs** — async/scheduled work via BullMQ (replaces Horizon/Artisan scheduler).
6. **Data** — Prisma client (singleton), Redis client, object storage adapter.

Cross-cutting: structured logging (pino), error middleware → envelope, audit middleware →
`audit_logs`, request-id correlation.

## 4. Frontend integration strategy (preserve, don't migrate)

- Keep all routes, components, styles, and layouts.
- **Replace `lib/data.ts` getters with `lib/api/*`** functions that fetch the Express API
  (server-side `fetch` in Server Components; client fetch only for interactive islands).
- **Convert listing/detail pages from `"use client"` to Server Components** where they only
  render data, fetching via the API and adding `generateMetadata` + `generateStaticParams`
  (SEO + perf). Interactive bits (filters, gallery zoom, tabs, search box) become small client
  child components. This is *enhancement*, not redesign — markup/classes preserved.
- Add `app/sitemap.ts`, `app/robots.ts` (proxy backend SEO data) and per-page JSON-LD helpers.
- Affiliate clicks: links point at backend `/go/{asin}` (same-origin via rewrite or
  `NEXT_PUBLIC_API` origin) so the spec 302 + tracking happens server-side.

**Routing reconciliation (user wants existing routes preserved):** keep current paths working;
*add* spec-aligned aliases + 301 redirects (`/comparisons/{slug}` ↔ `/compare/{a}-vs-{b}/`),
honor `?q=` on `/search`, decide category prefix in `12`. No existing URL breaks without a
redirect.

## 5. Data flow examples

- **Product page render:** Next Server Component → `GET /api/v1/products/{slug}` → controller →
  ProductService → Prisma → response; page emits Product+Offer+AggregateRating+Breadcrumb
  JSON-LD; ISR revalidate.
- **Affiliate click:** user clicks CTA → `GET /go/{asin}` (Express) → validate ASIN+whitelist →
  enqueue async click event (BullMQ) → **302** to `amazon.in?tag=...` in <100ms. Worker writes
  `affiliate_clicks` (IP/UA SHA-256) + fires GA4 Measurement Protocol.
- **Import → AI:** admin import → ImportService validates ASIN, calls PA-API GetItems, upserts
  product → enqueues AI jobs (title/meta/desc/pros/cons/FAQ) → AI workers call provider, store
  results `pending` review → admin approves → published → SEO sitemap/indexing jobs fire.

## 6. Async / scheduling (replaces Horizon + Laravel Scheduler)

- **BullMQ on Redis.** Queues mirror spec §10.3: `ai-critical, ai-product, ai-guide,
  ai-comparison, ai-category, ai-schema, ai-links`, plus `imports, price-sync, rating-sync,
  sitemaps, analytics, default`.
- **Scheduler** (BullMQ repeatable jobs / node-cron) maps spec §16.7 cron table: tiered price
  sync (6/12/24/72h), rating sync, sitemap gen, indexing ping, GSC/GA4 pulls, comparison
  detector, seasonal scheduler, cache warm, prune jobs.
- Worker process(es) run separately from the web process (independent scaling).

## 7. Caching (replaces Redis full-page cache + Cloudflare)

- Redis: API response cache (category/product/listing), nav tree, sitemap URL set, analytics
  aggregates, rate-limit counters, sessions. TTLs per spec §16.5.
- Next.js ISR + Cloudflare edge cache for public HTML; `/go/` and `/admin/` bypass cache.

## 8. External integrations

Amazon PA-API 5.0 (SigV4, 1 req/s, sliding-window limiter) · Claude (primary) + OpenAI
(fallback) via provider abstraction · GA4 (gtag client + server Measurement Protocol) · Search
Console API (daily pull) · Google Indexing API (publish ping). Credentials in env + encrypted
`settings` rows.

## 9. Environments

`local` (Docker Compose: Postgres+Redis) → `staging` → `production`. Twelve-factor config via
env (validated by zod at boot). See `14`.

## 10. Key architectural decisions (full ADRs in `12`)

- ADR-001 separate `server/` package. · ADR-002 Express (not Next API routes) for the backend,
  to match the spec's standalone API + independent scaling + worker process. · ADR-003 BullMQ
  for queue/cron. · ADR-004 Prisma + Postgres `tsvector` for FR-027/028 full-text. · ADR-005
  preserve frontend palette over spec §6. · ADR-006 preserve existing URLs + add spec aliases.
