# Phase 9 — Newsletter Report

**Date:** 2026-06-15 · **Phase:** 9 · **Service:** `services/marketing/newsletter.service.ts`

## 1. Subscribe flow (double opt-in)

`POST /api/newsletter/subscribe { email, source?, tags? }` (public, validated, rate-limited):
1. Normalise email (lowercase + trim); look up existing.
2. If already **active** → return `already_subscribed` (dedup; no duplicate row — email is unique).
3. **Double opt-in** (default, `NEWSLETTER_DOUBLE_OPT_IN=true`): create/refresh a **pending** subscriber
   with a random verify token (stored **SHA-256 hashed**), enqueue a verification email → status
   `pending`, response "check your inbox".
4. **Single opt-in** (config off): status `active` immediately + welcome email.

## 2. Verify (email confirmation)

`GET /api/newsletter/verify?token=…` (public): hashes the token, finds the matching **pending**
subscriber, sets `active` + `verifiedAt`, clears the verify hash, enqueues a welcome email. Invalid/
expired token → `400`. Tokens are never stored in plaintext.

## 3. Unsubscribe (one-click)

`POST /api/newsletter/unsubscribe { email | token }` and `GET /api/newsletter/unsubscribe?token=…`
(the one-click link embedded in every marketing email). Sets `unsubscribed` + `unsubscribedAt`, writes
an `unsubscribed` EmailEvent. **Idempotent** (re-unsubscribe is a no-op). Capability token is per-
subscriber + unique.

## 4. Duplicate protection

`email` is `@unique`; subscribe upserts/refreshes the existing row instead of inserting a duplicate.
Re-subscribing after unsubscribe re-enters the opt-in flow.

## 5. Subscriber management (admin, marketing.view / newsletter.manage)

- **List** `GET /api/marketing/subscribers` — paginated; filter by status, search by email, filter by tag.
- **Stats** `GET /api/marketing/subscribers/stats` — total / active / pending / unsubscribed / bounced,
  30-day growth series, tag segments.
- **Export** `GET /api/marketing/subscribers/export` — CSV (email,status,source,tags,subscribedAt).
- **Add / Update / Delete** — admin create (active), update tags/status, delete (newsletter.manage,
  CSRF + audit).

## 6. Privacy & compliance

- Verify tokens hashed (SHA-256); one-click unsubscribe on every send (CAN-SPAM-style).
- Cleanup worker prunes **stale `pending`** subscribers (unconfirmed > 30 days) and old email events.

## 7. Verification

Integration tests cover subscribe→pending + dedup, verify token → active (+ hash cleared), unsubscribe
idempotency, and admin add/list/export. All green.
