# Auth Follow-Up — Security Compliance Report

> Consolidated security posture after the Authentication follow-up (2FA + email).
> Supersedes the Phase 1 security report for NFR-SEC status. Date: 2026-06-14.

---

## 1. NFR-SEC compliance (§4.4 / §15)

| ID | Requirement | Status | How |
| -- | ----------- | :----: | --- |
| NFR-SEC-001 | Admin auth; 8h session | ✅ | JWT access (15m) + rotating refresh (7d) |
| NFR-SEC-002 | **TOTP 2FA for privileged roles** | ✅ **(closed)** | otplib TOTP, QR, backup codes, encrypted secret, two-step login, admin enforcement policy |
| NFR-SEC-003 | CSRF on state-changing routes | ✅ | double-submit cookie (auth + 2FA + admin policy mutations) |
| NFR-SEC-004 | XSS prevention | 🟡 | API returns data; React escapes. AI-HTML sanitisation pending content phase |
| NFR-SEC-005 | SQLi prevention | ✅ | Prisma parameterised; no raw SQL |
| NFR-SEC-006 | Rate limiting / brute-force | ✅ | login (5 failed/15m), 2FA codes (10/15m), general auth (100/15m) |
| NFR-SEC-007 | IP stored as SHA-256 only | ✅ | sessions + audit |
| NFR-SEC-008 | Affiliate redirect whitelist | ⏳ | affiliate phase |
| NFR-SEC-009 | CSP headers | ✅ | helmet |
| NFR-SEC-010 | Cloudflare WAF | ⏳ | deploy/edge phase |

**Net:** NFR-SEC 001–003, 005–007, 009 ✅ · 004 🟡 (content-phase) · 008/010 ⏳ (later phases).
2FA was the headline open item from Phase 1 and is now fully implemented.

## 2. New security controls in this follow-up

- **TOTP 2FA** end-to-end (enroll → challenge login → recover) — ADR-014.
- **AES-256-GCM** encryption of 2FA secrets at rest (`ENCRYPTION_KEY`; ≥32 chars enforced in prod).
- **Backup codes**: single-use, hashed (SHA-256+pepper), reuse-rejected.
- **2FA challenge token**: short-lived (5m), typed (`typ:'2fa'`), cannot be used as an access token.
- **Admin 2FA enforcement policy** (Setting-backed, RBAC-gated) with audited changes — ADR-016.
- **Email security**: opaque tokens only (already hashed/single-use), delivery audited, fire-and-
  forget so email outages can't affect auth — ADR-015.
- **Rate limiting** extended to 2FA code attempts.

## 3. Secrets & configuration (production checklist)

- `JWT_ACCESS_SECRET` ≥32 chars · `ENCRYPTION_KEY` ≥32 chars (both **required + length-checked in
  production** at boot).
- `RESEND_API_KEY` + verified `EMAIL_FROM` domain for real email.
- `COOKIE_SECURE=true`, appropriate `COOKIE_SAMESITE`/`COOKIE_DOMAIN`.
- `TOKEN_PEPPER` set (hashes of refresh/backup/verify tokens + IPs).
- Same `JWT_ACCESS_SECRET` in API and Next runtime (admin edge guard).

## 4. Audit coverage (security events)

`auth.login`, `auth.login_failed`, `auth.login_2fa_challenge`, `auth.2fa_failed`,
`auth.2fa_enabled`, `auth.2fa_disabled`, `auth.2fa_backup_regenerated`,
`auth.refresh_reuse_detected`, `auth.password_reset*`, `auth.email_verified`,
`security.2fa_policy_updated`, `email.sent`, `email.failed` — all to `audit_logs` with hashed IP/UA.

## 5. Test evidence

51 unit + 16 integration tests (16/16 verified vs real embedded Postgres). Security-specific:
AES-GCM round-trip/tamper; TOTP generate/verify; backup-code hashing/normalisation; challenge
token type-enforcement; 2FA enroll→login→backup→reuse-reject→disable; admin policy; brute-force
(login 429) + reuse-detection (refresh 401) from Phase 1 still green.

## 6. Residual risk / follow-ups

| Item | Priority | Note |
| ---- | :------: | ---- |
| AI-HTML sanitisation (NFR-SEC-004) | Medium | DOMPurify when AI/content lands |
| Affiliate redirect whitelist (NFR-SEC-008) | Medium | affiliate phase |
| Cloudflare WAF (NFR-SEC-010) | Medium | deploy phase |
| Hard 2FA enforcement (block until enrolled) | Low | currently soft (`mustEnable2fa`) |
| Email via durable queue (BullMQ) + bounces | Low | currently in-process retry |
| Edge silent-refresh for `/admin/*` | Low | UX/security polish |
| Remove unused root `@supabase/supabase-js` | Low | deferred since Phase 0 |
| Dependency advisories | — | 5 dev-only (Vitest→Vite→esbuild), accepted (ADR-009); **0 runtime-path** added this phase |
