# Phase 9 — Automation Report

**Date:** 2026-06-15 · **Phase:** 9 · **Queue:** `marketing` (BullMQ, reuses ADR-023 driver)

## 1. Jobs

| Job | Trigger | Action |
| --- | ------- | ------ |
| `verification` | subscribe (double opt-in) | send the confirm-subscription email |
| `welcome` | verify / single opt-in | send the welcome email + `sent` EmailEvent |
| `campaign-send` | `POST /campaigns/:id/send` | deliver the campaign to its audience |
| `campaign-retry` | `POST /campaigns/:id/retry` | re-send failed recipients |
| `cleanup` | daily cron (`0 4 * * *`) | prune old EmailEvents + stale pending subscribers |

These cover the task's required automation jobs: welcome email, verification email, newsletter/campaign
delivery, cleanup, retry failed.

## 2. Driver (inline vs BullMQ, ADR-023)

`dispatchMarketingJob` runs the job **in-process** when `QUEUE_DRIVER=inline` (dev/test/CI — no Redis,
deterministic: a subscribe/send returns after the email is processed) or **enqueues** to the BullMQ
`marketing` queue when `bullmq` (production). `runMarketingJob` is the single source of truth used by
both paths and the worker — identical behaviour regardless of driver.

## 3. Worker (`marketing.worker.ts`)

`startMarketingWorker()` (concurrency 4) processes the queue and registers the repeatable daily cleanup;
it is started + gracefully shut down by `jobs/worker.ts` alongside the import/AI/analytics workers.

## 4. Reliability

- BullMQ jobs: `attempts: 3` + exponential backoff.
- Email sends use the existing `withRetry` (backoff) under each job.
- `campaign-retry` re-delivers only `failed` recipients and adjusts counters.
- Delivery is batched (`CAMPAIGN_BATCH_SIZE`) to bound load.

## 5. Verification

The inline path is exercised end-to-end by the integration suite (subscribe → verification job; campaign
send → delivery job → recipients + tracking). The BullMQ path shares the same `runMarketingJob`.

## 6. Honest gaps

- A **scheduler that auto-sends `scheduled` campaigns at their time** is not wired (campaigns sit in
  `scheduled` until `send` is called) — a deployment cron task; the send path is ready.
- BullMQ path is not exercised in CI (no Redis), consistent with prior phases.
