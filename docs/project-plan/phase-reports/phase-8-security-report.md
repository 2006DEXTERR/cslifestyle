# Phase 8 — Security Report

**Date:** 2026-06-15 · **Phase:** 8 — Analytics & Reporting Center

## 1. Privacy-safe tracking (NFR-SEC-007)

- The public collector hashes the client IP with **SHA-256** (`lib/tokens.sha256`) before storage; the
  **raw IP is never written**. `AnalyticsEvent.ipHash` / `PageView.ipHash` hold only the hash.
- The events presenter **never returns** `ipHash` (or any IP) — verified by an integration test asserting
  no `ip`/`ipHash` field in `GET /api/analytics/events`.
- No PII is sent from the client: the beacon transmits only `{ type, entityType, entityId, url, referrer,
  sessionId }`; device + country + ipHash are derived server-side. `sessionId` is a random client-generated
  id (localStorage), not an identity.
- Retention: the cleanup worker (`pruneRawAnalytics`) deletes raw `PageView`/`AnalyticsEvent` beyond
  `ANALYTICS_RETENTION_DAYS` (default 180).

## 2. Permission model

| Permission | Grants | Endpoints |
| ---------- | ------ | --------- |
| `analytics.view` | Read all analytics dashboards/sections/events | all GET `/api/analytics/*` (except reports) |
| `analytics.manage` | Manage analytics config/providers (future) | reserved |
| `reports.view` | Read report snapshots | GET `/analytics/reports`, `/reports/:id` |
| `reports.create` / `reports.manage` | Generate/delete reports | POST `/reports`, DELETE `/reports/:id` |

Role mapping is seed-driven (config `PERMISSIONS` + `ROLE_PERMISSIONS`): editor gets analytics.view/
manage + reports.view/create/manage; analyst gets analytics.view + reports.view; admin gets all.

## 3. Write-operation controls

Every reporting write (`POST /analytics/reports`, `DELETE /analytics/reports/:id`) goes through:
**authenticate (JWT)** → **requirePermission(reports.manage)** → **requireCsrf** → **validateBody** →
**auditLogger** (`analytics.report_generated` / `analytics.report_deleted`). Verified: plain user →
`403`, missing CSRF → `403`, admin → `201/200`.

## 4. Public collector hardening

The `/api/analytics/collect` beacon is intentionally unauthenticated (anonymous page-view tracking
cannot carry an admin JWT) but is defended by:
- **zod validation** + a **public event allow-list** — only view/search types; a forged `affiliate_click`
  / `ai_generation` / `revenue_import` → `400` (privileged events are recorded server-side only).
- **rate limiting** (`publicCatalogLimiter`).
- **privacy-by-construction** (IP hashed; no PII accepted).
- **fire-and-forget** — failures never block the response; recording errors are swallowed + logged.

## 5. External providers

`ANALYTICS_DRIVER=mock` (default) means **no data leaves the process** — CI/dev send nothing to PostHog/
GA4/GSC. `live` forwards only to providers with explicit credentials; credentials live in env (encrypted
`Setting` rows are available via `lib/crypto` for the deployment phase).

## 6. Preservation / SQLi

All DB access via Prisma (parameterised — NFR-SEC-005). No existing security control was changed; the
admin guard, CSP, rate-limit, and audit middleware are unchanged.

## 7. Outstanding

- Bot/spam filtering on the collector beyond rate-limiting (e.g. signed beacons) is deferred to hardening.
- Live GA4/GSC OAuth + token storage is a deployment concern (adapters are offline-ready).
