# Phase 9 — Campaign Report

**Date:** 2026-06-15 · **Phase:** 9 · **Service:** `services/marketing/campaign.service.ts` + `delivery.ts`

## 1. Lifecycle

| Action | Endpoint | Permission | Notes |
| ------ | -------- | ---------- | ----- |
| Create / draft | `POST /api/marketing/campaigns` | campaign.manage | `draft` (or `scheduled` if `scheduledAt`) |
| Edit | `PATCH /api/marketing/campaigns/:id` | campaign.manage | only `draft`/`scheduled` |
| Schedule | `POST /api/marketing/campaigns/:id/schedule` | campaign.manage | sets `scheduled` + time |
| Send test | `POST /api/marketing/campaigns/:id/test` | campaign.manage | one-off email, no counters |
| Send | `POST /api/marketing/campaigns/:id/send` | campaign.manage | enqueues `campaign-send` |
| Retry failed | `POST /api/marketing/campaigns/:id/retry` | campaign.manage | re-sends failed recipients |
| Delete | `DELETE /api/marketing/campaigns/:id` | campaign.manage | |
| List / get | `GET /api/marketing/campaigns[/:id]` | marketing.view | history + per-campaign metrics |

## 2. Delivery (`delivery.ts`)

`deliverCampaign` runs via the inline driver (dev/test) or the BullMQ marketing worker (prod):
1. Mark `sending`.
2. Audience = **active** subscribers, optionally filtered by `segmentTag` (JSON `array_contains`).
3. Batched (`CAMPAIGN_BATCH_SIZE`, default 100): upsert a `CampaignRecipient`, render the per-recipient
   email (template + tracking pixel + one-click unsubscribe + tracked CTA), send via the email provider
   (with retry), mark `delivered`/`failed`, write an `EmailEvent`.
4. Final: status `sent` (or `failed` if all failed), with `recipientCount` / `deliveredCount` /
   `failedCount`.

## 3. Templates

`newsletter` (subject + content) and three **announcement** templates that reuse the entity's copy
(product/guide/comparison — incl. AI-generated description/verdict from Phase 7) with a tracked CTA.

## 4. Tracking (delivered / opened / clicked / failed / bounced)

- **Open:** a 1×1 pixel `GET /api/marketing/track/open/:id.gif` sets `openedAt` + increments
  `openedCount` (once) + writes an `opened` EmailEvent.
- **Click:** `GET /api/marketing/track/click/:id?url=…` sets `clickedAt`, increments `clickedCount`
  (+ `openedCount` if not yet opened), writes a `clicked` EmailEvent, then **302-redirects to the
  same-origin target only** (no open redirect).
- **Delivered/Failed:** set during delivery; **bounced** is modelled (status + counter) for ESP-webhook
  wiring later.
- Per-campaign `openRate` / `clickRate` are derived from `deliveredCount`.

## 5. Dashboard

`GET /api/marketing/dashboard`: total/active subscribers, avg open/click rate across sent campaigns, a
7-day delivered/opened/clicked performance series, tag segments, delivery rate — drives `/admin/marketing`.

## 6. Verification

Integration test: create → send test → send (inline) → assert `sent` + `deliveredCount>0`, then hit the
open pixel + click redirect and assert the campaign's `openedCount`/`clickedCount` increment. Green.

## 7. Honest gaps

- Scheduled campaigns are stored as `scheduled`; a time-triggered auto-send cron is a deployment task
  (the worker + `sendCampaign` are ready). Per-campaign **revenue** attribution is not tracked.
