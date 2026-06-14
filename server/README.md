# CSLifestyle — Backend (`server/`)

Node.js + Express + TypeScript API for CSLifestyle, backed by PostgreSQL (Prisma)
and Redis (BullMQ). This is the standalone backend; the Next.js frontend at the
repo root is preserved and consumes this API. See `docs/project-plan/` for the
full plan (architecture `05`, DB `06`, API `07`).

## Stack

| Concern | Tech |
| ------- | ---- |
| Runtime / framework | Node 20+ · Express 4 · TypeScript |
| Database | PostgreSQL · Prisma |
| Cache / queue | Redis · BullMQ |
| Docs | Swagger (OpenAPI) at `/docs` |
| Logging | pino (pretty in dev) |
| Config | zod-validated env (`src/config/env.ts`) |
| Tests | Vitest · Supertest |

## Phase 0 scope

Foundation only — **no business features yet**: Express app, env validation,
logging, error/response-envelope handling, Prisma + Redis + BullMQ wiring,
Swagger docs, and health endpoints.

## Quick start (local)

```bash
# 1. From the repo root, start Postgres + Redis
docker compose up -d

# 2. Backend setup
cd server
cp .env.example .env
npm install                 # runs `prisma generate` via postinstall

# 3. Run
npm run dev                 # API on http://localhost:4000  (docs at /docs)
npm run worker              # BullMQ worker (separate terminal)
```

> No Docker? Point `DATABASE_URL` / `REDIS_URL` in `.env` at your own
> Postgres/Redis. The API still boots without them — `/readyz` will just report
> `degraded` until they are reachable.

## Endpoints (Phase 0)

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/healthz` | Liveness (always 200 if process up) |
| GET | `/readyz` | Readiness (checks Postgres + Redis; 503 if down) |
| GET | `/api/v1/health` | Versioned API base ping |
| GET | `/docs` | Swagger UI |
| GET | `/docs.json` | Raw OpenAPI JSON |

All JSON responses use the envelope `{ status, data, meta, message, errors }`.

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Run API with hot reload (tsx) |
| `npm run worker` | Run BullMQ worker with hot reload |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled API |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Create/apply a dev migration (Phase 1+) |

## Layout

```
server/
├─ src/
│  ├─ index.ts            # API bootstrap + graceful shutdown
│  ├─ app.ts              # Express app factory (middleware pipeline)
│  ├─ config/env.ts       # zod-validated environment
│  ├─ lib/                # logger, prisma, redis, queue, http envelope
│  ├─ middleware/         # requestId, error/404 handlers
│  ├─ routes/             # health + versioned api router
│  ├─ docs/swagger.ts     # OpenAPI spec
│  └─ jobs/worker.ts      # BullMQ worker entrypoint
├─ prisma/schema.prisma   # datasource + generator (models added in Phase 1)
└─ tests/                 # Vitest + Supertest
```
