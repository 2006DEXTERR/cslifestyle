# Phase 9 — Security Report

**Date:** 2026-06-15 · **Phase:** 9 — Marketing & Communication Center

## 1. Permission model

New permissions (added to the RBAC catalog, seed-driven): `marketing.view`, `marketing.manage`,
`newsletter.manage`, `campaign.manage` (+ a `marketing` CRUD module). Grants: editor → all marketing
perms; analyst → `marketing.view`; admin → all.

| Permission | Grants | Endpoints |
| ---------- | ------ | --------- |
| `marketing.view` | Read dashboard/subscribers/campaigns/events/templates/provider | GET `/api/marketing/*` |
| `newsletter.manage` | Add/update/delete subscribers | POST/PATCH/DELETE `/marketing/subscribers` |
| `campaign.manage` | Create/edit/schedule/test/send/retry/delete campaigns | `/marketing/campaigns/*` writes |

## 2. Write-operation controls

Every admin write goes through **authenticate (JWT)** → **requirePermission** → **requireCsrf** →
**validateBody** → **auditLogger** (`marketing.campaign_*` / `marketing.subscriber_*`). Verified:
plain user → `403`, missing CSRF → `403`, admin → `201/200`.

## 3. Public endpoints (unauthenticated by necessity)

`subscribe`, `unsubscribe`, `verify`, and the open/click trackers cannot carry an admin JWT. They are
defended by:
- **zod validation** (email format, lengths) on subscribe/unsubscribe.
- **rate limiting** (`publicCatalogLimiter`) on subscribe/unsubscribe.
- **hashed verify tokens** (SHA-256) — never stored or transmitted in plaintext server-side.
- **capability-token unsubscribe** (per-subscriber, unique) for one-click links.
- **no open redirect**: the click tracker only 302-redirects to **same-origin** (`APP_URL`) targets;
  anything else falls back to the site root.
- **idempotency**: re-subscribe/re-unsubscribe are safe no-ops.

## 4. Privacy / compliance

- **Double opt-in** by default (confirm-before-active) + **one-click unsubscribe** on every send
  (CAN-SPAM-style) + a cleanup job pruning stale unconfirmed subscribers.
- No raw secrets stored; subscriber PII is limited to email + status + tags. The email provider key
  lives in env (encrypted `Setting` storage available for the deployment phase).
- Email sending reuses the audited mailer pipeline; SQLi-safe via Prisma.

## 5. Outstanding

- CAPTCHA / bot-defence on the public subscribe form beyond rate-limiting is deferred to hardening.
- Real ESP bounce/complaint webhooks (to auto-mark `bounced`/`complained`) are a deployment task.
