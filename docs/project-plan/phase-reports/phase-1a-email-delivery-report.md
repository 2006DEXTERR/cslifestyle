# Auth Follow-Up — Email Delivery Report

> Resend email integration for verification + password-reset emails. Date: 2026-06-14.

---

## 1. Architecture

```
auth.service (register / forgot-password / resend-verification)
        │  sendVerificationEmail / sendPasswordResetEmail  (fire-and-forget, void)
        ▼
mailer.deliverEmail(msg, type)
        │  render branded template (HTML + text)
        ▼
withRetry( emailProvider.send )   ── exponential backoff (EMAIL_MAX_RETRIES, default 3)
        │                               ▲
        ▼                               │
  EmailProvider                  recordAudit('email.sent' | 'email.failed')
   ├─ ResendProvider   (RESEND_API_KEY set)
   └─ ConsoleProvider  (fallback — dev/test/CI)
```

## 2. Capabilities delivered

| Capability | Status | Detail |
| ---------- | :----: | ------ |
| Verification emails | ✅ | sent on register + `resend-verification` |
| Password reset emails | ✅ | sent on `forgot-password` |
| Email templates | ✅ | branded HTML (gradient header) + plaintext, inline-styled, client-safe |
| Provider integration (Resend) | ✅ | `resend` SDK; `EMAIL_FROM` configurable |
| Dev/test fallback | ✅ | console provider when `RESEND_API_KEY` unset (no external dep in CI) |
| Retry handling | ✅ | `withRetry` exponential backoff; configurable attempts |
| Audit logging | ✅ | `email.sent` / `email.failed` with type, recipient, provider, attempts |
| Non-blocking delivery | ✅ | fire-and-forget — email never blocks/fails the auth response |
| Token security | ✅ | links carry opaque tokens (hashed at rest, single-use, TTL-bound — unchanged) |

## 3. Configuration (env)

| Var | Default | Purpose |
| --- | ------- | ------- |
| `RESEND_API_KEY` | _(unset)_ | enables Resend; unset → console provider |
| `EMAIL_FROM` | `CSLifestyle <onboarding@resend.dev>` | sender |
| `EMAIL_MAX_RETRIES` | `3` | retry attempts on transient failure |
| `APP_URL` | `http://localhost:3000` | base for verify/reset links |

## 4. Test coverage

**Unit (`email.test.ts`):** templates contain the link/subject/CTA (verification + reset);
`withRetry` returns on first success, retries-then-succeeds, and throws after exhausting attempts;
provider selection falls back to `console` without an API key.

**Integration:** `deliverEmail(...)` writes an `email.sent` audit row (verified vs real Postgres;
`recordAudit` made awaitable for deterministic assertion). Existing register/forgot/reset flows
remain green (no regression) — email failures cannot break them (fire-and-forget).

## 5. Operational notes

- **Production:** set `RESEND_API_KEY` + a verified `EMAIL_FROM` domain in Resend. Without the
  key, emails are logged (console) — safe default, but real users won't receive mail.
- Reset/verify flows also return a `devVerificationToken`/`devResetToken` **only outside
  production**, so the flows remain testable without inbox access.
- Failed deliveries are captured in `audit_logs` (`email.failed`) for ops visibility.

## 6. Gaps / follow-ups

- No queue/worker for email yet (BullMQ exists from Phase 0) — current sends are in-process
  fire-and-forget with retry; move to a queue for at-least-once delivery + dead-letter at scale.
- No bounce/complaint webhook handling.
- Only transactional auth emails; marketing/newsletter (spec §12/§14 marketing) is out of scope.
- Templates are minimal-branded; richer templating (MJML/react-email) can come later.
