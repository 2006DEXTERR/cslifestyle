# Phase 12 — Deployment Guide

**Date:** 2026-06-15 · **Phase:** 12 (final)

## 1. Topology

```
            ┌─────────── web (Next.js standalone, :3000) ───────────┐
 Internet ▶ │  proxies /api/* + /uploads/* (BACKEND_ORIGIN)         │
            └───────────────────────┬──────────────────────────────┘
                                    ▼
                         api (Express, :4000) ── Prisma ▸ PostgreSQL
                                    │            BullMQ ▸ Redis
                         worker (BullMQ jobs/crons) ──┘
            one-shot:  migrate (prisma migrate deploy + seed) before api/worker start
```

## 2. One-command production bring-up

```bash
cp .env.production.example .env.production      # then edit — set real secrets
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Order is automatic: Postgres + Redis become healthy → **migrate** runs (`prisma migrate deploy` +
`tsx prisma/seed.ts`) and exits → **api** + **worker** start (they `depend_on` migrate completion) →
**web** starts after api. Uploaded media persists on the `uploads` named volume (mounted into api +
worker at `/data/uploads`).

## 3. Services

| Service | Image | Command | Port |
| ------- | ----- | ------- | ---- |
| `web` | root `Dockerfile` | `node server.js` | 3000 |
| `api` | `server/Dockerfile` | `node dist/index.js` | 4000 |
| `worker` | `server/Dockerfile` | `node dist/jobs/worker.js` | — |
| `migrate` | `server/Dockerfile` | `prisma migrate deploy && tsx prisma/seed.ts` | — |
| `postgres` | `postgres:16-alpine` | — | (internal) |
| `redis` | `redis:7-alpine` | — | (internal) |

## 4. Manual / non-Docker deploy

```bash
# Backend
cd server && npm ci && npx prisma generate && npm run build
npx prisma migrate deploy && npm run db:seed
QUEUE_DRIVER=bullmq node dist/index.js        # API
QUEUE_DRIVER=bullmq node dist/jobs/worker.js  # worker (separate process)

# Frontend
cd .. && npm ci && npm run build
BACKEND_ORIGIN=http://api-host:4000 node .next/standalone/server.js
```

## 5. Migrations & seed

- **Apply migrations:** `npm run prisma:deploy` (= `prisma migrate deploy`) — idempotent, forward-only.
- **Seed:** `npm run db:seed` — idempotent upserts (permissions/roles/catalog/content + builds the search
  index). Safe to re-run.
- **Fresh DB:** all 12 migrations apply cleanly from empty (verified each phase).

## 6. Health & rollout

- Liveness: `GET /healthz` → 200 when the process is up.
- Readiness: `GET /readyz` → 200 only when PostgreSQL **and** Redis are reachable (else 503). Wire both
  into the orchestrator (k8s livenessProbe → `/healthz`, readinessProbe → `/readyz`).
- Zero-downtime: run `migrate` first (forward-compatible migrations), then roll api/worker/web.

## 7. Scaling

- `api` and `web` are **stateless** → scale horizontally behind a load balancer. Set
  `RATE_LIMIT_REDIS=true` so limits are shared across instances.
- Run **one or more** `worker` replicas (BullMQ distributes jobs).
- Move `uploads` to **object storage (S3/R2) + CDN** for multi-instance media (swap the storage/URL layer
  — `MEDIA_BASE_URL`).

## 8. Operational hardening (hosting layer)

- Front with **Cloudflare (CDN + WAF + TLS)**; cache static + `/uploads`.
- Use **managed PostgreSQL + Redis** with backups (RPO < 1h) for production.
- Inject secrets via the platform secret store (not `.env` files in images).
- Set `COOKIE_SECURE=true` + a `COOKIE_DOMAIN`; configure `CORS_ORIGIN` + `APP_URL` to the real domain.
