# CSLifestyle — Render Deployment Guide

First-production-deploy playbook for **Render (web) + Render PostgreSQL + Upstash Redis**.

This is the Render-specific counterpart to the generic Docker-Compose guide in
[`docs/project-plan/phase-reports/phase-12-deployment-guide.md`](docs/project-plan/phase-reports/phase-12-deployment-guide.md)
and the env reference in
[`phase-12-environment-variables-guide.md`](docs/project-plan/phase-reports/phase-12-environment-variables-guide.md).
It does not repeat them — it maps the app onto Render services + the exact commands/vars.

> **Verification note.** Everything below about *commands, code, migrations, health
> endpoints and env schema* is verified locally (typecheck/lint/build/tests + `prisma
> migrate deploy` on a throwaway Postgres). The *running Render deployment itself* has
> **not** been executed from this repo — treat the smoke test (§6) as the go-live gate.

---

## 1. Topology

Two services + two managed data stores:

```
 ┌─────────────────────────┐        ┌──────────────────────────┐
 │  Web: cslifestyle-web    │  /api  │  Web: cslifestyle-api    │
 │  (Next.js, port 3000)    │ ─────▶ │  (Express, port 4000)    │
 │  proxies /api/* /uploads │  rewr. │  Prisma + BullMQ(opt)    │
 └─────────────────────────┘        └────────────┬─────────────┘
                                                  │
                                   ┌──────────────┴───────────────┐
                                   │  Render PostgreSQL   Upstash │
                                   │  (DATABASE_URL)      (REDIS) │
                                   └──────────────────────────────┘
```

- The **frontend never talks to the DB/Redis** — it proxies `/api/*` and `/uploads/*` to
  the backend via `next.config.js` rewrites (server-to-server, so auth cookies stay
  first-party). It also fetches server-side (SSR) from `BACKEND_ORIGIN`.
- **Background jobs**: default `QUEUE_DRIVER=inline` runs import/marketing jobs in-process
  (no separate worker). Only set `bullmq` + add a **Background Worker** service
  (`node dist/jobs/worker.js`) if you need distributed queues.

You can deploy either from the repo (Node runtime) or the provided Dockerfiles
(`Dockerfile` frontend, `server/Dockerfile` backend). Commands below assume the **Node
runtime** (simplest on Render); the Docker path uses the same commands.

---

## 2. Render service configuration

### 2a. Render PostgreSQL
Create a **PostgreSQL** instance. Copy its **Internal Database URL** → this becomes
`DATABASE_URL` on the API service (append `?schema=public` if not present).

### 2b. Upstash Redis
Create an Upstash Redis DB (or Render Key Value). Use the **`rediss://` TLS URL** →
`REDIS_URL` on the API service. `ioredis` auto-reconnects; if Redis is down the app still
boots (cache degrades to pass-through, `/readyz` reports `redis: down`).

### 2c. Backend Web Service — `cslifestyle-api`
| Field | Value |
|---|---|
| Root directory | `server` |
| Runtime | Node |
| Build command | `npm install && npm run build` *(postinstall runs `prisma generate`)* |
| **Pre-Deploy command** | `npx prisma migrate deploy` **← required** |
| Start command | `node dist/index.js` |
| Health check path | `/readyz` |
| Instance | Starter+ recommended (free tier cold-starts; see §7) |

> **First deploy only:** after the first successful migrate, run `npm run db:seed` once
> (Render Shell) to create the admin user + baseline data. It is idempotent but should
> not run on every deploy.

### 2d. Frontend Web Service — `cslifestyle-web`
| Field | Value |
|---|---|
| Root directory | `.` (repo root) |
| Runtime | Node |
| Build command | `npm install && npm run build` |
| Start command | `npm run start` *(or `node .next/standalone/server.js` — `output: standalone`)* |
| Health check path | `/` |

### 2e. (Optional) Worker — only if `QUEUE_DRIVER=bullmq`
Background Worker, root `server`, build `npm install && npm run build`, start
`node dist/jobs/worker.js`, same env as the API.

---

## 3. Environment variables

Set on **`cslifestyle-api`** unless marked *(frontend)*. Defaults come from
`server/src/config/env.ts` (validated with zod at boot — an invalid/missing required var
**fails startup loudly**). Full local examples: `server/.env.example`, `.env.example`.

### Required in production (boot fails without them)
| Var | Where used | Consequence if missing |
|---|---|---|
| `NODE_ENV=production` | everywhere | dev defaults/looser behavior; keep `production` |
| `DATABASE_URL` | Prisma | **hard boot failure** (enforced) |
| `REDIS_URL` | cache, rate-limit store, BullMQ | **hard boot failure** (enforced) |
| `JWT_ACCESS_SECRET` (≥32 chars) | JWT signing | **hard boot failure** (enforced ≥32 in prod) |
| `ENCRYPTION_KEY` (≥32 chars) | AES-256-GCM for 2FA secrets at rest | **hard boot failure** (enforced) |
| `APP_URL` | email verify/reset links | **hard boot failure** (enforced); wrong value → broken auth-email links |
| `CORS_ORIGIN` | CORS allowlist | if wrong, browser blocks the frontend origin (defaults to `localhost:3000`) |
| `BACKEND_ORIGIN` *(frontend)* | `next.config` rewrites + SSR fetch | **detail pages + `/api` proxy break** (defaults to `127.0.0.1:4000`) |

### Production-only (strongly recommended)
| Var | Default | Consequence if unset |
|---|---|---|
| `COOKIE_SECURE=true` | `false` | auth cookies sent over plain HTTP (startup **warns**); set `true` behind HTTPS |
| `COOKIE_SAMESITE` | `lax` | `none` requires `COOKIE_SECURE=true` or browsers reject the cookie |
| `COOKIE_DOMAIN` | — | set only if sharing cookies across subdomains |
| `NEXT_PUBLIC_SITE_URL` *(frontend)* | `https://cslifestyle.in` | canonical URLs / OG tags / `sitemap.xml` / `robots.txt` point at the wrong host |
| `RESEND_API_KEY` + verified `EMAIL_FROM` | (unset → console) | **newsletter/transactional email not delivered** (prod newsletter fails clearly; startup warns). `EMAIL_FROM` must be a **Resend-verified domain** — `onboarding@resend.dev` only sends to the account owner |

### Optional (feature-gated — safe to omit)
| Var | Default | Notes |
|---|---|---|
| `AMAZON_ASSOCIATE_TAG` | `cslifestyle-21` | your real associate tag for `/go` affiliate links |
| `AMAZON_DOMAIN` | `amazon.in` | affiliate domain |
| `QUEUE_DRIVER` | `inline` | `bullmq` needs the worker service (§2e) |
| `RATE_LIMIT_REDIS` | `false` | `true` = distributed rate-limit store (needed if >1 API instance) |
| `AI_DRIVER` | `mock` | `live` requires `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_AI_API_KEY` |
| `ANALYTICS_DRIVER` | `mock` | `live` requires `POSTHOG_*` / `GA4_*` / `GSC_SITE_URL`; first-party analytics work regardless |
| `NEWSLETTER_DOUBLE_OPT_IN` | `true` | double opt-in confirm email |
| `AMAZON_PAAPI_*` | (unset) | **only** for the offline `products:fetch-amazon` script — not needed by the running app |
| `NEXT_PUBLIC_OG_IMAGE` *(frontend)* | same-origin `/og-default.png` | override social share image |
| `UPLOAD_DIR` / `MEDIA_BASE_URL` / `MEDIA_MAX_FILE_MB` | `uploads` / `''` / `10` | media library (local disk — **note §8 persistence caveat**) |

### Tunables with safe defaults (leave unless you have a reason)
`PORT` 4000 · `HOST` 0.0.0.0 · `API_PREFIX` /api/v1 · `LOG_LEVEL` info · `ACCESS_TOKEN_TTL`
15m · `REFRESH_TOKEN_TTL_DAYS` 7 · `EMAIL_TOKEN_TTL_HOURS` 24 · `RESET_TOKEN_TTL_MINUTES`
60 · `BCRYPT_ROUNDS` 12 · `TOKEN_PEPPER` '' · `TWO_FACTOR_*` · `EMAIL_MAX_RETRIES` 3 ·
`AI_CONCURRENCY` 4 · `ANALYTICS_RETENTION_DAYS` 180 · `REVENUE_DEFAULT_*` · `CAMPAIGN_BATCH_SIZE` 100.

### Dev/test-only (do **not** set in production)
The zod dev fallbacks for `DATABASE_URL`/`REDIS_URL`/`JWT_ACCESS_SECRET`/`ENCRYPTION_KEY`
exist for local boot only — production requires real values (enforced). `AI_DRIVER=mock` /
`ANALYTICS_DRIVER=mock` are the safe dev defaults.

### Naming / hygiene notes
- `BACKEND_ORIGIN` is intentionally **not** `NEXT_PUBLIC_` — it's a server-only origin used
  by the proxy + SSR; exposing it to the browser would be wrong. Correct as-is.
- `AMAZON_ASSOCIATE_TAG` vs `AMAZON_PAAPI_PARTNER_TAG` are distinct (the PA-API partner tag
  falls back to the associate tag) — related, not duplicated.
- No unused or duplicate variables were found; every var is consumed via `env.*`.

---

## 4. Release pipeline (order matters)

```
1. npm install                 # deps (+ postinstall: prisma generate)  [both services]
2. npm run build               # tsc → dist (api) / next build (web)
3. npx prisma migrate deploy   # PRE-DEPLOY on api — forward-only, idempotent
   (first deploy only) npm run db:seed
4. node dist/index.js          # start api  → listens :4000
5. npm run start               # start web  → listens :3000
6. GET /healthz  → 200         # liveness (process up)
7. GET /readyz   → 200         # readiness (Postgres + Redis reachable, else 503)
```

Render runs the **Pre-Deploy command** before switching traffic, so `migrate deploy` lands
before the new code starts — preventing the schema-mismatch crash if migrations were
skipped. There are **2 pending migrations** in this branch (`comparison_rich_schema`,
`perf_hot_path_indexes`); both are additive and verified to apply cleanly.

---

## 5. Deployment audit summary (verified locally)

| Check | Status |
|---|---|
| Frontend build (`next build`, `output: standalone`) | ✅ |
| Frontend proxy rewrites cover **all** `/api/*` prefixes (incl. `/api/admin/*`) | ✅ |
| `images: { unoptimized: true }` (no image server needed) | ✅ (deliberate) |
| SEO metadata + `robots.ts` + `sitemap.ts` build (`/robots.txt`, `/sitemap.xml`) | ✅ |
| Backend build (`tsc`) + start (`node dist/index.js`) | ✅ |
| `prisma validate` + `prisma migrate deploy` (throwaway PG) | ✅ |
| `/healthz` (liveness) + `/readyz` (DB+Redis, 2s timeout, 503 when down) | ✅ |
| Graceful shutdown on SIGTERM (drains, closes deps, 10s force-exit) + crash handlers | ✅ |
| Redis lazy-connect + auto-reconnect + safe cache fallback | ✅ |
| Helmet (CSP, HSTS 1y, nosniff, frameguard) + Permissions-Policy + CORS allowlist + rate limits | ✅ |
| Unit (164) + integration (123) tests | ✅ |

**No code deployment blockers.** The remaining go-live items are **operational config**
(the Pre-Deploy migrate command + the env vars above), not code.

---

## 6. Production smoke test (run after first deploy — go/no-go gate)

| # | Check | Pass criteria |
|---|---|---|
| 1 | `GET /healthz` (api) | 200, `{status:"ok"}` |
| 2 | `GET /readyz` (api) | 200, `database:"up"`, `redis:"up"` |
| 3 | Homepage `/` | 200, no console/server errors; featured carousel + product cards render live data |
| 4 | Product detail `/products/{slug}` | 200, correct image/title/price; "Buy Now" → `/go/{asin}` |
| 5 | Category `/categories/{slug}` | 200, shows products in that category |
| 6 | Brand `/brands/{slug}` | 200, shows that brand's products |
| 7 | Comparison `/comparisons/{slug}` | 200, spec table + winner + insights render |
| 8 | Guides `/guides` + a guide | 200, list + detail render |
| 9 | Search `/search?q=laptop` | returns laptop products; "phone" excludes headphones |
| 10 | Predictive suggestions (type ≥2 chars) | grouped dropdown appears (DB-sourced) |
| 11 | Newsletter subscribe | with Resend → "check your inbox" + email arrives; without key in prod → clear error (no false success) |
| 12 | Affiliate `/go/{valid-asin}` | 302 → `amazon.in/dp/{asin}?tag=…`; invalid ASIN → safe redirect home |
| 13 | Admin login `/login` | valid admin authenticates; sets `cs_access` (Secure, HttpOnly) |
| 14 | Admin dashboard `/admin` | overview KPIs + charts load (live `/api/admin/overview`) |
| 15 | RBAC | non-admin gets 403/redirect from `/admin/*`; unauth → `/login` |
| 16 | Import Center `/admin/import` | loads; API-import shows "Missing credentials" when PA-API unset (no fake success) |
| 17 | Admin product/category/brand pages | load + list real data |
| 18 | Analytics `/admin/analytics` | dashboard renders |
| 19 | SEO | `/robots.txt` valid + points at `/sitemap.xml`; `/sitemap.xml` lists real slugs; canonical = `NEXT_PUBLIC_SITE_URL` |
| 20 | `/404` + error boundary | not-found + error pages render |
| 21 | DB | `/readyz` up; admin lists reflect DB |
| 22 | Redis (warm cache) | 2nd read of a cached endpoint is fast; edit → cache busts within seconds |
| 23 | Email | Resend dashboard shows delivered; confirm link works |
| 24 | Queue | if `bullmq`: worker online, an import job completes |
| 25 | Logs | structured JSON (pino) with request ids; no secrets logged; 5xx logged as errors |

Any **Fail** on 1–15 is a launch blocker; 16–25 can be remediated post-launch if degraded-but-safe.

---

## 7. Cold start & the ~1.5s target
Render **free/Starter tier sleeps** idle instances — the first request pays dyno spin-up +
`prisma $connect` + Redis connect and **can exceed 1.5s**. Warm + colocated + cached
requests are well under target (public APIs measured single-digit ms locally cold; warm
Redis is faster still). To hit the target consistently: use a paid always-on instance and
**colocate** the web service, Postgres, and Upstash in the **same region**.

## 8. Operational notes
- **Media persistence:** uploads write to local disk (`UPLOAD_DIR`) — on Render's ephemeral
  filesystem these are lost on redeploy/restart. For durable media, mount a Render Disk or
  switch `MEDIA_BASE_URL` to an object store (out of current scope).
- **Backups:** enable Render PostgreSQL automated backups; test a restore before launch.
- **Rollback:** Render keeps prior deploys — roll back via the dashboard. Migrations are
  forward-only; a rollback that needs a schema revert requires a new down-migration.
- **Monitoring:** wire uptime checks to `/readyz`; add error reporting (e.g. Sentry) and log
  drains as post-launch hardening.
