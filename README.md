# CSLifestyle

AI-powered, SEO-first Amazon-affiliate commerce platform — a preserved **Next.js 13 App Router**
storefront on a **Node.js + Express + TypeScript + PostgreSQL (Prisma) + Redis (BullMQ)** backend.

Built phase-by-phase (auth → catalog → content → SSR/SEO → affiliate → import → AI → analytics →
marketing → media → discovery → hardening). See [`docs/project-plan/`](docs/project-plan) for the full
plan, decisions log, and per-phase reports.

## Architecture

```
Next.js frontend (3000)  ──proxy /api/* + /uploads/*──▶  Express API (4000)
                                                          │  Prisma ▸ PostgreSQL
                                                          │  BullMQ ▸ Redis
                                                          └  Worker process (jobs/crons)
```

- **Frontend** (`app/`, `components/`, `lib/`): preserved storefront + admin. SSR + ISR + JSON-LD on the
  6 detail routes; `app/sitemap.ts` + `app/robots.ts`. Server Components fetch the API server-to-server.
- **Backend** (`server/`): Express app, Prisma schema (12 migrations), BullMQ workers, Swagger at `/docs`.

## Quick start (local dev)

```bash
# 1. Infra (Postgres + Redis)
docker compose up -d

# 2. Backend
cd server
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed            # admin@cslifestyle.in / ChangeMe!2026
npm run dev                # API on :4000  (Swagger at /docs)
npm run worker             # (optional) BullMQ worker — only needed with QUEUE_DRIVER=bullmq

# 3. Frontend (repo root, new shell)
cp .env.example .env.local
npm install
npm run dev                # storefront + admin on :3000
```

## Production (Docker Compose)

```bash
cp .env.production.example .env.production    # fill in real secrets
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Brings up **5 services** — PostgreSQL, Redis, the Express **api**, the BullMQ **worker**, and the
Next.js **web** frontend — plus a one-shot **migrate** job that applies migrations + seeds before the API
starts. Uploaded media persists on a named volume. See
[`docs/project-plan/phase-reports/phase-12-deployment-guide.md`](docs/project-plan/phase-reports/phase-12-deployment-guide.md)
and [`phase-12-environment-variables-guide.md`](docs/project-plan/phase-reports/phase-12-environment-variables-guide.md).

## Health

- `GET /healthz` — liveness (process up).
- `GET /readyz` — readiness (PostgreSQL + Redis; `503` if degraded).

## Testing

```bash
cd server && npm run typecheck && npm run lint && npm run build && npm test   # RUN_DB_TESTS=true for DB suites
cd ..     && npm run typecheck && npm run build
```

CI (`.github/workflows/ci.yml`) runs install → migrate → seed → typecheck → lint → build → tests for the
backend (with Postgres + Redis services) and typecheck + build for the frontend.

## Default admin

`admin@cslifestyle.in` / `ChangeMe!2026` — **change immediately** in any real environment.
