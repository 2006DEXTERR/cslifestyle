# 14 — Deployment Strategy

> Re-expresses spec §16 (Hetzner VPS + Nginx + PHP-FPM + Supervisor) and §19 (launch) for the
> **Node/Express/TS + Next.js + Postgres/Prisma** stack. Current state: single Netlify target,
> no DB/CI.

---

## 1. Runtime components (prod)

| Component | Tech | Notes |
| --------- | ---- | ----- |
| Frontend | Next.js (SSR/SSG/ISR) | preserved app; Netlify *or* Node host (decision in `12` later) |
| API | Express/TS (Node 20+) | PM2/systemd or container; stateless, horizontally scalable |
| Worker | same image, worker entrypoint | BullMQ processors + scheduler (separate process) |
| DB | PostgreSQL 16 | managed (e.g. RDS/Neon/Supabase-PG) or VPS; PgBouncer pooling |
| Cache/Queue | Redis 7 | cache + BullMQ + rate-limit + sessions (logical DB separation per §16.4) |
| Object storage | S3-compatible | product images + generated WebP |
| Edge | Cloudflare | CDN, WAF, TLS, cache rules; `/admin/*` & `/go/*` bypass cache (§16.3) |

> Spec's Nginx/PHP-FPM/Supervisor map to: reverse proxy (Nginx/Cloudflare) → Node web process;
> Supervisor → PM2/systemd; Horizon → BullMQ worker; Artisan scheduler → BullMQ repeatable jobs.

## 2. Environments

- **local:** Docker Compose (Postgres + Redis); `.env.local`; seed DB; both apps via dev scripts.
- **staging:** prod-like; auto-deploy from `develop`; safe for PA-API sandbox / mocked providers.
- **production:** deploy from `main` after CI + approvals; real credentials via secrets manager.

Twelve-factor config; all env validated by zod at boot (fail fast). Secrets never in repo
(`.gitignore` covers `.env*`); provider keys also storable encrypted in `settings` (§14.10).

## 3. CI/CD (replaces spec §16.8 GitHub Actions for PHP)

```
on push:
  test:  checkout → setup-node 20 → install (root + server)
         → typecheck → lint → unit + integration (Postgres+Redis services)
  build: build server (tsc) + next build
  deploy (main, after test): run prisma migrate deploy → deploy API+worker → deploy frontend
         → cache:warm → smoke tests
```
- **`prisma migrate deploy`** on release (replaces `php artisan migrate --force`).
- Zero-downtime: migrate (backward-compatible) → roll API → roll worker → roll frontend.
- Rollback: previous image + (if needed) down-migration / restore (see §6).

## 4. Build & caching

- Next: ISR + Cloudflare edge for public HTML; re-enable image optimization + WebP pipeline in
  Phase 11 (currently `images.unoptimized:true`).
- API: Redis response/page cache with TTLs per §16.5; cache-warm cron for homepage/nav.

## 5. Scaling (spec §16.9)
- Phase 1 (≤100k sessions/mo): modest API + single worker + managed PG + Redis.
- Phase 2 (100k–500k): horizontal API replicas (stateless), read replica, more workers.
- Phase 3 (500k–1M+): autoscale API, partition `affiliate_clicks`, dedicated search if needed.

## 6. Backups & DR (spec §4.3, §15.7)
- PG: daily full + PITR (WAL); retention 30d; **RPO <1h, RTO <4h**. Redis RDB/AOF snapshots.
- Object storage versioning. Monthly restore test to staging. Backups to India region.

## 7. Observability
- pino structured logs → aggregator; request IDs; uptime + healthcheck probes; queue depth +
  job failure alerts; error tracking (Sentry); security alerts (failed logins, whitelist rejects).

## 8. Launch checklist (spec §19, condensed)
- **Infra:** DB + Redis + storage provisioned; backups verified; Cloudflare rules (`/admin`,
  `/go` bypass; WAF on); TLS; rate limits live.
- **App:** migrations applied; seed/initial catalog imported; auth+2FA working; env validated.
- **Content:** initial products/guides published & AI-reviewed.
- **SEO:** sitemaps generated + submitted; robots correct; canonical/JSON-LD validated; `/go`
  noindex + disallow; GA4/GSC connected; Indexing API wired.
- **Compliance:** affiliate disclosure on all `/go` pages; §18.7 checklist green.
- **Post-launch (T+7):** monitor CWV, crawl errors, click tracking, revenue ingestion.

## 9. Decisions / open items → `12`
Frontend host (keep Netlify vs move to Node host for tighter SSR/API colocation) · container vs
PM2 · managed vs self-hosted Postgres · where `/go` + sitemap/robots terminate (Next vs Express,
same-origin/SEO) · secrets manager choice.
