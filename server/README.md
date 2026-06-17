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

## Product data & affiliate links (real data import)

The seeded catalog ships with **placeholder data** — `B0SEED####` ASINs and generic
stock images — because the source mock has no real Amazon ASINs/images. The system
is built so you can load real data later **without inventing anything**:

- **Affiliate URLs are generated, never typed.** The public `affiliateUrl` is built from
  the product's real ASIN as `https://www.amazon.in/dp/{ASIN}?tag=<AMAZON_ASSOCIATE_TAG>`
  (`src/lib/affiliate.ts → resolveAffiliateUrl`). A placeholder/fake ASIN yields **no**
  affiliate URL — so you only ever supply an ASIN, never a link.
- **Write validation** (`POST/PUT /api/products`) rejects fake ASINs, the
  `amazon.in/dp/example` placeholder URL, and empty/non-URL/stock images.
- **Admin warnings.** Products with placeholder data stay visible; the Admin → Products
  table shows an amber ⚠ with the exact issues (hover for details). The API exposes the
  same as `product.dataWarnings`.

### Load real product images + Amazon links (one CSV, 4 commands)

You only paste real **ASINs** and **image URLs** into one CSV — affiliate links are
generated for you. This matches by `slug` (updates existing rows only — never scrapes
Amazon, never calls the PA-API).

```bash
cd server

# 1. See every product + which ones still need real data
npm run products:list

# 2. Generate ./my-products.csv (slug + name prefilled; NEEDS_ASIN / NEEDS_IMAGE marked)
npm run products:template          # add -- --force to overwrite an existing file

# 3. Open my-products.csv and replace every NEEDS_ASIN / NEEDS_IMAGE with the real
#    value (paste the 10-char Amazon ASIN and a real image URL). Leave affiliateUrl blank.

# 4. Check, then apply
npm run products:validate          # no writes; fails if any value is invalid
npm run products:bulk              # apply the updates
```

A ready-to-edit `my-products.csv` (all 12 seeded products) is already committed at the
`server/` root, so you can skip straight to editing it if you prefer. A 2-row example
is at `scripts/products.sample.csv`.

Rules:
- **Blank cells and unfilled `NEEDS_ASIN` / `NEEDS_IMAGE` placeholders are left unchanged**
  — fill the CSV gradually across multiple runs.
- A real-but-invalid value (fake ASIN, non-URL/stock image, `dp/example` link) makes the
  row an **error**; `products:validate` exits non-zero until it's fixed.
- `affiliateUrl` is generated from the ASIN automatically — leave it blank.
- Apply a different file with `npm run products:bulk -- ./other.csv` (add `--dry` to preview).

### Relevant env vars

| Var | Default | Purpose |
| --- | ------- | ------- |
| `AMAZON_ASSOCIATE_TAG` | `cslifestyle-21` | Tag used to generate public affiliate URLs |
| `AMAZON_DOMAIN` | `amazon.in` | Amazon domain for generated URLs (whitelist-safe) |

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
