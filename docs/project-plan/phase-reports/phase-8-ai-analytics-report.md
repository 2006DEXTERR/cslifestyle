# Phase 8 — AI Analytics Report

**Date:** 2026-06-15 · **Phase:** 8 · **Endpoint:** `GET /api/analytics/ai` (analytics.view)

AI usage analytics over the existing `AiLog` table (Phase 7). No new AI model — this is a reporting
layer on top of the cost/token logs the AI engine already writes.

## 1. Outputs

| Field | Meaning |
| ----- | ------- |
| `tokens` | Σ (tokensInput + tokensOutput) in range |
| `cost` | Σ `costUsd` in range (USD) |
| `generationCount` | number of AI log rows (generations) |
| `failedJobs` | count where `status = failed` |
| `byProvider` | per-provider tokens + cost + count (anthropic/openai/gemini/mock) |
| `byModel` | per-model cost + count |
| `daily` | daily tokens + cost series |

## 2. Source

`AiLog` (queueId, entityType/entityId, jobType, modelUsed, provider, tokensInput, tokensOutput,
costUsd `Decimal(10,6)`, status, createdAt) — written by `services/ai/processor.ts` for every
generation (Phase 7, FR-055).

## 3. Relationship to the AI Center

The AI Center (`/admin/ai`) shows AI usage for AI operators; the Analytics AI section provides the same
data through the analytics lens for analysts (gated by `analytics.view` rather than `ai.view`), and folds
it into the unified dashboard ("AI Cost" card) and report snapshots.

## 4. Verification

Integration test asserts the AI payload exposes `byProvider`; after Phase 7 mock generations, costs and
provider breakdowns populate. Cost figures are deterministic under `AI_DRIVER=mock` (cost 0) and real
under `live`.

## 5. Honest gaps

- Token/cost figures depend on `AiLog` data; with the default mock AI driver, cost is 0 (tokens are
  still recorded). Real costs appear when `AI_DRIVER=live`.
