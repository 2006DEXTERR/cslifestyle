# Phase 6 — Queue System Report

**Date:** 2026-06-15 · **Phase:** 6 — Import Center & Catalog Automation · **Status:** Complete

Covers the BullMQ/Redis queue system built for import processing, the inline-vs-bullmq driver, the
workers, and the progress/retry/failure/completion handling. See **ADR-023** for the rationale.

## 1. Architecture

```
POST /api/import/{csv,asins,categories}
        │  (create ImportJob + ImportItems, status=pending)
        ▼
   dispatchImport(jobId, type)            queues/importQueue.ts
        ├─ QUEUE_DRIVER=inline  → await processImportJob(jobId)          (in-process)
        └─ QUEUE_DRIVER=bullmq  → getImportQueue(type).add(jobId)        (queues/bullmq.ts)
                                       │
                                       ▼
                          csv|asin|category-import.worker.ts            (queues/*.worker.ts)
                                       │  processImportJob(jobId, onProgress)
                                       ▼
                            services/import/processor.ts                (single source of truth)
```

`processImportJob` is the **only** code that mutates import state; both drivers and all three workers
call it, so behaviour is identical regardless of how the job is dispatched.

## 2. Driver (ADR-023)

- Env: `QUEUE_DRIVER` ∈ `{ inline, bullmq }`, **default `inline`** (`config/env.ts`).
- **inline** — runs the processor in-process and `await`s it. No Redis. Tests/dev get a deterministic,
  already-`completed` job in the POST response.
- **bullmq** — lazily (`dynamic import`) constructs a per-type BullMQ `Queue` (so ioredis/bullmq are
  never loaded under the inline driver) and enqueues `{ jobId }`. Production sets this and runs the
  worker process.

## 3. Queues & workers

| Type | Queue name | Worker file | Started in |
| ---- | ---------- | ----------- | ---------- |
| `csv_product` | `import:csv` | `queues/csv-import.worker.ts` | `jobs/worker.ts` |
| `asin` | `import:asin` | `queues/asin-import.worker.ts` | `jobs/worker.ts` |
| `category` | `import:category` | `queues/category-import.worker.ts` | `jobs/worker.ts` |

Each `start*Worker()` creates a BullMQ `Worker` bound to its queue, calls `processImportJob(jobId,
pct => job.updateProgress(pct))`, and is registered in `jobs/worker.ts` for graceful shutdown
(`Promise.all` of `worker.close()` on SIGTERM/SIGINT).

## 4. Reliability

- **Retry:** BullMQ jobs use `attempts: 3` with **exponential backoff** (`queues/bullmq.ts`). At the
  domain level, `POST /api/import/jobs/:id/retry` resets `failed` items to `pending` and re-dispatches
  (only failed items reprocess — already-success/duplicate items are skipped by the processor).
- **Progress tracking:** the processor updates `ImportJob.processedItems` (and emits `onProgress`)
  every 10 items; the presenter derives a `progress` percentage. `/admin/import` polls every 4s while
  any job is pending/processing so the bar advances live.
- **Failure handling:** per-item errors are captured on `ImportItem.errors`; a job whose items **all**
  fail is marked `failed` (with `error`), otherwise `completed`. Unexpected throws are caught and recorded.
- **Completion handling:** on finish the processor writes the final `ImportReport`, sets
  `successCount/failedCount/skippedCount`, `completedAt`, and the terminal status.
- **Cancellation:** `POST /api/import/jobs/:id/cancel` sets `cancelled` for a pending/processing job.

## 5. Why no Redis in tests

The default `inline` driver means the full integration suite (and CI) runs the real import code path
end-to-end against embedded Postgres with **zero Redis dependency** and **deterministic** assertions
(the job is `completed` synchronously). This mirrors the existing rate-limiter's memory-vs-Redis driver.

## 6. Verification

- Integration tests exercise the inline path end-to-end (CSV/ASIN/category → completed job + report).
- `npx tsc --noEmit` and `eslint` clean across `queues/*` and `services/import/*`.
- BullMQ path is structurally identical (same processor); it activates by setting `QUEUE_DRIVER=bullmq`
  + `REDIS_URL` and running `npm run worker`.

## 7. Honest gaps

- The BullMQ path is **not** exercised in CI (no Redis in the harness) — it is covered indirectly by
  sharing the single processor with the inline path that *is* tested. A Redis-backed smoke test is a
  candidate for the deployment-hardening phase.
- Pause/resume of a running job is not implemented (the UI's Pause control is disabled); cancel + retry
  are. Live worker concurrency tuning is left to the deployment phase.
