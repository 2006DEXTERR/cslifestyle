# Phase 9 — Email Provider Report

**Date:** 2026-06-15 · **Phase:** 9

## 1. Abstraction (reused, ADR-015 → ADR-026)

Marketing reuses the **existing** `EmailProvider` abstraction (`lib/email/provider.ts`) rather than
adding a second integration:

| Driver | When | Behaviour |
| ------ | ---- | --------- |
| `ResendProvider` | `RESEND_API_KEY` set | Sends via Resend (primary) |
| `ConsoleProvider` | no key (default) | **Mock fallback** — logs the email, never sends (CI/dev/test) |

`createEmailProvider()` picks Resend when the key exists, else the console mock. **Offline mode works
with no keys** — exactly the task requirement (Primary: Resend, Fallback: Mock).

## 2. Marketing send layer (`services/marketing/email.ts`)

The auth mailer is fire-and-forget (returns void). Marketing needs per-recipient outcomes, so
`sendMarketingEmail(msg): Promise<boolean>` wraps `emailProvider.send` with the existing exponential-
backoff retry (`withRetry`, `EMAIL_MAX_RETRIES`) and returns **true on success / false on failure** —
feeding the campaign's delivered/failed counters. `activeEmailProvider()` reports `{ name, live }` for
the admin "Provider" view.

## 3. Configuration

| Env | Default | Purpose |
| --- | ------- | ------- |
| `RESEND_API_KEY` | unset | enables the Resend provider |
| `EMAIL_FROM` | `CSLifestyle <onboarding@resend.dev>` | From header |
| `EMAIL_MAX_RETRIES` | 3 | retry attempts |
| `MARKETING_FROM_NAME` | `CSLifestyle` | brand name in templates |
| `NEWSLETTER_DOUBLE_OPT_IN` | true | confirm-before-active |
| `CAMPAIGN_BATCH_SIZE` | 100 | delivery batch size |

## 4. Templates

Branded HTML + text (inline styles, email-client safe), reusing the existing shell style. Every
marketing email carries a one-click unsubscribe footer; campaign emails also carry an open-tracking
pixel and click-tracking links.

## 5. Verification

`GET /api/marketing/provider` returns `console` offline (asserted in tests). Test sends + campaign sends
succeed against the console provider; switching to Resend is a single env var, no code change.

## 6. Honest gaps

- Inbound ESP webhooks (real bounce/complaint signals from Resend) are not wired — `bounced`/
  `complained` are modelled but currently only settable via admin. That's a deployment-time task.
