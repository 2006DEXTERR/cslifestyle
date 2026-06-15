# Phase 9 — Remaining Work Report (Honest Gaps)

**Date:** 2026-06-15 · **Phase:** 9 — Marketing & Communication Center

What Phase 9 deliberately did not do, called out so scope is unambiguous.

## 1. In-scope but intentionally limited

| Area | Shipped | Gap / deferred |
| ---- | ------- | -------------- |
| Scheduled campaigns | Stored as `scheduled` with a time; `send` delivers | No **time-triggered auto-send cron** — a scheduled campaign waits for an explicit send (or a future scheduler). The send path is ready. |
| Bounce / complaint | Modelled (status + counters) | No **inbound ESP webhooks** — `bounced`/`complained` are only admin-settable today; real signals need a Resend webhook (deployment). |
| Email revenue | — | Per-campaign **revenue attribution** is not tracked (the original mock card showed it). The marketing dashboard shows real subscriber + open/click metrics instead. |
| Public signup UI | Public `subscribe`/`unsubscribe` APIs live | The **footer/homepage newsletter placeholder is not wired** (kept untouched to preserve the shared layout). `subscribeNewsletter()` client helper is ready to wire later. |
| Push Notifications | — | The mock **Push Notifications tab** is **out of scope** (not a Phase 9 required feature) and left unwired. |
| Segments | Tag-based segments (from subscriber tags) | No rule-based dynamic segments (e.g. "opened last 3 campaigns"); tags cover the required tag management. |
| BullMQ path | Inline path tested in CI | Marketing worker not exercised in CI (no Redis); shares the same `runMarketingJob`. |

## 2. Out of scope (correctly untouched)

Per the mandate, **none** of these were started: **Media Library**, **Recommendation Engine**,
**Deployment / production-infra finalization**. No framework migration, no redesign.

## 3. Data caveats

- Marketing dashboards reflect **real** data — empty until subscribers/campaigns exist (a fresh DB shows
  zeros, by design, not mock). Integration tests seed subscribers/campaigns to verify aggregation.
- Email "sends" succeed against the **console** provider offline (no real delivery); set `RESEND_API_KEY`
  for real sends.

## 4. Summary

The Marketing & Communication Center is **functionally complete** for the Phase 9 requirements (newsletter
+ double opt-in, subscriber management, campaigns + templates + tracking, automation, RBAC, offline email
provider). The principal honest gaps are a **scheduled-send cron**, **ESP bounce webhooks**, and wiring
the **public footer signup** — all incremental, none blocking.
