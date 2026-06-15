# Phase 12 — Environment Variables Guide

**Date:** 2026-06-15 · **Phase:** 12 (final) · **Source of truth:** `server/src/config/env.ts` (zod-validated)

Example files: `server/.env.example` (backend), `.env.example` (frontend), `.env.production.example`
(prod stack).

## 1. Backend (`server/`)

### Core (REQUIRED in production)
| Var | Default | Notes |
| --- | ------- | ----- |
| `NODE_ENV` | development | `production` enforces secret checks |
| `DATABASE_URL` | localhost dev | **required in prod** |
| `REDIS_URL` | localhost dev | **required in prod** (BullMQ + distributed rate limit) |
| `JWT_ACCESS_SECRET` | dev secret | **required, ≥32 chars in prod** |
| `ENCRYPTION_KEY` | dev key | **required, ≥32 chars** (AES-256-GCM for 2FA/secret storage) |
| `APP_URL` | http://localhost:3000 | **required in prod** (email links, tracking) |
| `CORS_ORIGIN` | http://localhost:3000 | comma-separated allow-list |
| `PORT` / `HOST` / `API_PREFIX` / `LOG_LEVEL` | 4000 / 0.0.0.0 / /api/v1 / info | |

### Auth / cookies / 2FA
`ACCESS_TOKEN_TTL`(15m), `REFRESH_TOKEN_TTL_DAYS`(7), `EMAIL_TOKEN_TTL_HOURS`(24),
`RESET_TOKEN_TTL_MINUTES`(60), `BCRYPT_ROUNDS`(12), `TOKEN_PEPPER`, `TWO_FACTOR_ISSUER`,
`BACKUP_CODES_COUNT`(10), `TWO_FACTOR_CHALLENGE_TTL`(5m), `COOKIE_SECURE`(false → **true in prod**),
`COOKIE_SAMESITE`(lax), `COOKIE_DOMAIN`, `RATE_LIMIT_REDIS`(false → **true in prod**).

### Email (Resend → console fallback)
`RESEND_API_KEY` (blank → console/log), `EMAIL_FROM`, `EMAIL_MAX_RETRIES`(3).

### Queues / AI / Analytics / Marketing / Media
| Var | Default | Notes |
| --- | ------- | ----- |
| `QUEUE_DRIVER` | inline | `bullmq` in prod (worker required) — ADR-023 |
| `AI_DRIVER` | mock | `live` calls real providers — ADR-024 |
| `AI_PRIMARY_PROVIDER` / `AI_CONCURRENCY` | anthropic / 4 | |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_AI_API_KEY` (+ `*_MODEL`) | blank | for `AI_DRIVER=live` |
| `ANALYTICS_DRIVER` | mock | `live` forwards to PostHog/GA4/GSC — ADR-025 |
| `ANALYTICS_RETENTION_DAYS` | 180 | raw page-view/event prune |
| `REVENUE_DEFAULT_CVR` / `REVENUE_DEFAULT_COMMISSION` | 0.04 / 0.05 | §13.4 estimate |
| `POSTHOG_API_KEY`/`POSTHOG_HOST`/`GA4_MEASUREMENT_ID`/`GA4_API_SECRET`/`GSC_SITE_URL` | blank | live analytics |
| `NEWSLETTER_DOUBLE_OPT_IN` | true | ADR-026 |
| `MARKETING_FROM_NAME` / `CAMPAIGN_BATCH_SIZE` | CSLifestyle / 100 | |
| `UPLOAD_DIR` / `MEDIA_BASE_URL` / `MEDIA_MAX_FILE_MB` | uploads / '' / 10 | ADR-027 (persistent volume in prod) |

### Seed
`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`.

## 2. Frontend (repo root)
| Var | Default | Notes |
| --- | ------- | ----- |
| `BACKEND_ORIGIN` | http://localhost:4000 | server-to-server origin the rewrites + SSR fetchers use |

## 3. Production minimum (must set real values)

`POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_ACCESS_SECRET` (≥32), `ENCRYPTION_KEY` (≥32),
`SEED_ADMIN_PASSWORD`, `APP_URL`, `CORS_ORIGIN`, `COOKIE_SECURE=true`, `RATE_LIMIT_REDIS=true`,
`QUEUE_DRIVER=bullmq`. Optional for real integrations: `RESEND_API_KEY`, `AI_DRIVER=live` + provider
keys, `ANALYTICS_DRIVER=live` + GA4/PostHog/GSC keys.

## 4. Safe defaults

Every external integration **defaults to offline/mock** (`*_DRIVER=mock`, blank keys, console email,
inline queue) so dev/test/CI run with **no external dependencies or secrets** — production opts in by
setting the relevant vars.
