# Phase 8 — Remaining Work Report (Honest Gaps)

**Date:** 2026-06-15 · **Phase:** 8 — Analytics & Reporting Center

What Phase 8 deliberately did not do, called out so scope is unambiguous.

## 1. In-scope but intentionally limited

| Area | Shipped | Gap / deferred |
| ---- | ------- | -------------- |
| External providers (PostHog/GA4/GSC) | **Adapters only**, offline-mock by default (per the task: "adapters only, no live creds, mock in CI") | Live GA4 client gtag, server Measurement Protocol delivery verification, and **GSC OAuth daily pull → `SearchConsoleMetric` upsert** (§13.6) are a deployment task. The `SearchConsoleMetric` table was not added this phase (no ingestion yet). |
| View tracking | First-party privacy-safe beacon on the 6 detail islands | Homepage/listing/search-page views are not beaconed yet (only detail pages). Server-side SSR view counting is intentionally avoided (ISR would undercount). |
| Bounce / sessions | Computed from `PageView` (single-pageview sessions) | No engaged-time / scroll-depth; "users" ≈ distinct session (no cross-device identity). |
| Content revenue split | Products revenue shown; guides/comparisons revenue `—` | Per-content-type revenue attribution not split. |
| Real-time | Active users = distinct sessions in last 5 min | No websocket live stream; the banner polls every 15s. |
| BullMQ analytics worker | Repeatable daily/weekly/monthly + cleanup schedules | Not exercised in CI (no Redis); shares the same `generateReport`/`pruneRawAnalytics` as the inline path that **is** tested. |

## 2. Out of scope (correctly untouched)

Per the mandate, **none** of these were started: **Marketing**, **Media Library**, **Recommendation
Engine**, **Deployment / production-infra finalization**. No framework migration, no redesign.

## 3. Data caveats

- Analytics dashboards reflect **real** data, which is **empty until traffic/events accrue** (fresh DB
  shows zeros — by design, not mock). The integration tests seed events via the collector to verify
  aggregation.
- AI cost is 0 under the default mock AI driver (tokens still recorded); real cost needs `AI_DRIVER=live`.

## 4. Testing gaps

- No Redis-backed analytics-worker test (inline path covered).
- Aggregation queries fetch capped row sets (≤50k) and aggregate in JS — fine for current scale;
  Redis-cached aggregates (spec §16.5) are a Phase-11 hardening item.

## 5. Summary

The analytics & reporting subsystem is **functionally complete** for the Phase 8 requirements (dashboard,
product/search/revenue/AI/content/traffic analytics, reporting APIs, privacy-safe tracking, RBAC, offline
external adapters). The principal honest gaps are **live GA4/GSC ingestion** (credential-dependent
deployment work) and broader (non-detail-page) view beaconing.
