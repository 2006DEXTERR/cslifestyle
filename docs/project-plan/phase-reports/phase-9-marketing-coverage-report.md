# Phase 9 — Marketing Coverage Report

**Date:** 2026-06-15 · **Phase:** 9 — Marketing & Communication Center · **Status:** Complete

Maps the Phase 9 requirements to the shipped implementation. **Note:** marketing is **beyond the base
blueprint** (no FR-001…070 cover it; the `/admin/marketing` screen was a mock — see ADR-026). The
user's task feature list is used as the requirement set.

## 1. Requirement coverage

| Required feature | Status | Where |
| ---------------- | :----: | ----- |
| Newsletter management | ✅ | `newsletter.service.ts`: subscribe/verify/unsubscribe + admin mgmt |
| Subscriber management | ✅ | list/search/filter/tag/export/stats + add/update/delete |
| Campaign management | ✅ | `campaign.service.ts`: CRUD/draft/schedule/test/send/history |
| Communication automation | ✅ | `marketing` BullMQ worker: welcome/verify/campaign-send/retry/cleanup |
| Email provider abstraction (Resend + mock fallback) | ✅ | reuses `lib/email/provider` (Resend → console), offline-safe |
| Double opt-in + email verification | ✅ | pending → emailed token (hashed) → confirm → active |
| Duplicate protection | ✅ | unique email + idempotent subscribe |
| Email templates (newsletter + 3 announcements) | ✅ | `templates.ts` (announcements reuse AI copy) |
| Open/Click/Delivered/Failed tracking | ✅ | pixel + click redirect → `CampaignRecipient` + `EmailEvent` counters |
| Public subscribe/unsubscribe endpoints | ✅ | `POST /api/newsletter/subscribe`, `POST/GET /api/newsletter/unsubscribe` |
| RBAC + CSRF + audit on writes | ✅ | marketing.view / newsletter.manage / campaign.manage |
| Swagger | ✅ | **Marketing** tag |

## 2. Database (4 models)

`NewsletterSubscriber`, `Campaign`, `CampaignRecipient`, `EmailEvent` + enums (SubscriberStatus,
CampaignStatus, CampaignRecipientStatus, EmailEventType). Migration `20260615195416_marketing_communication`.

## 3. Subscriber management surfaced

Total / Active / Pending / Unsubscribed / Bounced counts, 30-day growth series, tag segments, search +
filter + tag filter, CSV export, and admin add/update(tags,status)/delete.

## 4. Email templates (4)

`newsletter` (free-form), `product_announcement`, `guide_announcement`, `comparison_announcement` — the
announcement templates pull the entity's copy (incl. AI-generated description/verdict from Phase 7) and
add a tracked CTA (`/go/{asin}` or the content URL).

## 5. Verification

- **Unit (8):** email normalisation, verify-token hashing (`sha256(token) === hash`), template rendering
  (unsubscribe + pixel injection), product-announcement CTA, offline provider.
- **Integration (8):** RBAC (401/403/200), CSRF, subscribe (double opt-in → pending) + dedup, verify
  token → active, unsubscribe, subscriber add/list/export, campaign create→test→send (inline) + open/
  click tracking counters, provider/templates.
- **Result:** 197/197 tests green vs embedded Postgres (migrate → seed → test). No regressions across
  auth/affiliate/import/AI/analytics/catalog/content/SSR suites.

## 6. Preservation

`/admin/marketing` keeps its exact cards, charts, tabs, colors and layout — only the data source changed
(mock arrays → live `/api/marketing/*`), and the Compose form + Campaigns table are now functional. The
out-of-scope Push Notifications tab is left as-is.
