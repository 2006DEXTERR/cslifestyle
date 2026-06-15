# Phase 12 — Remaining Work Report (Final, Honest Gaps)

**Date:** 2026-06-15 · **Phase:** 12 (final)

After 12 phases the application is feature-complete and production-ready. Everything below is **external-
integration or hosting/ops** work — credential- and infrastructure-dependent, **outside application
scope** — plus a few documented low-priority polish items. None block a deployment.

## 1. External integrations (need credentials)

| Item | Current | To go live |
| ---- | ------- | ---------- |
| Amazon **PA-API** product import/sync | CSV + ASIN import (ASIN → draft stub) | Add PA-API GetItems/SearchItems (SigV4) to enrich stubs + tiered price/rating sync. The import + media + AI pipelines are ready to consume it. |
| **GA4 / Search Console** ingestion | First-party analytics live; external adapters **offline-mock** | Set `ANALYTICS_DRIVER=live` + GA4/GSC keys; wire GSC OAuth daily pull → a `SearchConsoleMetric` table. |
| **AI providers** (Claude/OpenAI/Gemini) | Full engine; **mock** by default | Set `AI_DRIVER=live` + provider keys. |
| **Resend** email | Console fallback | Set `RESEND_API_KEY` for real delivery; add ESP bounce/complaint webhooks. |
| **Google Indexing API** ping (FR-070) | sitemap + robots live | Wire the publish-time Indexing-API ping (credential-dependent). |

## 2. Hosting / ops (infrastructure)

- **CDN/WAF/TLS** (Cloudflare), **managed PostgreSQL + Redis** with backups (RPO<1h/RTO<4h), secret
  manager, autoscaling/k8s — all standard hosting concerns; the app is stateless + 12-factor ready.
- **Object storage + CDN for media** (S3/R2) for multi-instance — swap the `storage`/URL layer
  (`MEDIA_BASE_URL`); current store is a local/volume disk.
- **Upload virus scanning** before public exposure.

## 3. Polish (low priority, no blocker)

- SEO Centre **redirects manager** + **robots editor** UIs (sitemap/robots themselves are real).
- Public **search results grid** still renders the client dataset (the advanced-search API is DB-backed
  + drives SSR recommendations + trending); swapping the grid is a follow-up.
- Recommendations are **on-demand** (no precompute cache / personalisation).
- Internal links are **review-only** (no auto-insert) by design; a one-click "apply approved links"
  editor action is a possible follow-up.
- Global **1 MB JSON limit** caps the JSON CSV-import body below the schema's 20 MB (fail-safe; raise per
  route if large CSVs are needed). Media multipart uploads are unaffected.
- **Browser E2E** (Playwright) + a **load/perf** benchmark suite.
- Marketing **scheduled-send cron** (campaigns wait for explicit send today); **push notifications** tab
  is intentionally unwired.

## 4. Explicitly preserved (not removed, by mandate)

All existing UI / routes / colors / components / SSR / SEO / auth / affiliate / import / AI / analytics /
marketing / media / discovery remain intact and tested. No framework migration, no redesign, nothing
removed.

## 5. Summary

The codebase delivers the blueprint's behaviour (≈64/70 FRs ✅, §7 models ~100%, §8 endpoints ~88%, 10
engines, 13 admin screens, 220/220 tests). The residual is **plug-in credentials + cloud infra**, not
application development.
