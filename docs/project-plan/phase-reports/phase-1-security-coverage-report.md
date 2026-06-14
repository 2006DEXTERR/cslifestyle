# Phase 1 — Security Coverage Report

> Security controls delivered in Phase 1, mapped to the blueprint's NFR-SEC requirements
> (§4.4 / §15). Date: 2026-06-14.

---

## 1. NFR-SEC mapping

| ID | Requirement | Status | How |
| -- | ----------- | :----: | --- |
| NFR-SEC-001 | Admin auth; 8h session | ✅ | JWT access (15m) + rotating refresh (7d cap); `/admin/*` + admin APIs require auth |
| NFR-SEC-002 | TOTP 2FA for Super Admin + SEO Manager | 🟡 **deferred** | Not built this phase; schema/flows are 2FA-ready. Tracked in Remaining Work |
| NFR-SEC-003 | CSRF on state-changing routes | ✅ | Double-submit cookie (`cs_csrf` + `x-csrf-token`) on cookie-auth mutations (refresh/logout) |
| NFR-SEC-004 | XSS prevention | 🟡 | API returns data not HTML; React escapes. AI-HTML sanitisation arrives with AI phase |
| NFR-SEC-005 | SQLi prevention | ✅ | Prisma parameterised everywhere; **no raw SQL** in auth |
| NFR-SEC-006 | Rate limiting (60/min public, 300/min auth, **5 logins/15m**) | ✅ | `express-rate-limit`: login brute-force (5 failed/15m, skips successes) + general auth (100/15m); memory or Redis store |
| NFR-SEC-007 | IP stored as SHA-256 only | ✅ | `sha256()` (+pepper) for session.ipAddress & audit.ipAddress; never plaintext |
| NFR-SEC-008 | Affiliate redirect whitelist | ⏳ | Out of scope (affiliate phase) |
| NFR-SEC-009 | CSP headers | ✅ | helmet CSP active (verified in responses) |
| NFR-SEC-010 | Cloudflare WAF | ⏳ | Infra/edge (deploy phase) |

## 2. Credential & token security

- **Passwords:** bcrypt, cost **12** (configurable `BCRYPT_ROUNDS`, min 10). Random per-hash
  salt (verified: two hashes of same password differ). Never logged.
- **Access token:** JWT HS256, 15-min expiry, issuer-checked, httpOnly cookie `cs_access` (also
  accepts `Bearer`). Secret ≥32 chars enforced in production (zod boot check).
- **Refresh token:** 48-byte random, **stored only as SHA-256(+pepper) hash**, httpOnly cookie
  scoped to `/api/auth`, 7-day expiry. **Rotated on every use.** Replaying a revoked token →
  **reuse detected → all of the user's tokens + sessions revoked** (token-theft mitigation).
- **Verify/reset tokens:** random, hashed at rest, **single-use** (`usedAt`), TTL-bound
  (email 24h, reset 60m). Reset/verify revoke or flip state atomically (`$transaction`).
- **Pepper:** optional `TOKEN_PEPPER` mixed into all token/IP hashes.

## 3. Session & cookie security

- httpOnly on access + refresh (XSS cannot read them). `SameSite` configurable (default `lax`);
  `Secure` configurable (prod). Refresh cookie path-scoped to `/api/auth`. CSRF cookie readable
  by design (double-submit). Cookies cleared on logout / password reset.
- First-party in dev via Next proxy rewrites (no cross-site cookie pitfalls).

## 4. Authorization

- Server-side RBAC on every protected route (`requireRole`/`requirePermission`); the Next edge
  middleware is a coarse UI gate only. Permissions are loaded **fresh from the DB** on each
  authenticated request, so role/permission changes and account disabling take effect
  immediately (not just at token issue).

## 5. Auditing & abuse protection

- **Audit log** (`audit_logs`) records auth events (login, login_failed, register, logout,
  refresh, **refresh_reuse_detected**, password_reset_requested/reset, email_verified) and
  mutating admin requests, with hashed IP + UA. Fire-and-forget (never blocks requests).
- **Brute-force:** 5 failed logins / 15 min / (IP+email) → 429 (verified). Successful logins are
  not counted (correct semantics). **No account enumeration** on forgot-password / register-error
  / resend (uniform responses).

## 6. Validation & transport

- All auth input validated with zod (length, email normalisation, password complexity:
  ≥8 chars + lower + upper + digit). Invalid → 400 with structured field errors.
- helmet security headers (CSP, X-Content-Type-Options, X-Frame-Options SAMEORIGIN,
  Referrer-Policy, HSTS) on every response.
- Error responses never leak secrets; stack traces only outside production.

## 7. Tests covering security behaviour

bcrypt roundtrip + wrong-password reject + salt-uniqueness; JWT tamper/malformed reject; token
hash determinism + non-reversibility + constant-time compare; RBAC allow/deny/401/403;
integration: reuse-detection 401, CSRF 403, brute-force 429, RBAC 401/403/200, reset
invalidates old password.

## 8. Residual risk / follow-ups

- **2FA not enforced** (NFR-SEC-002) — highest-priority security follow-up.
- **AI-generated HTML sanitisation** (NFR-SEC-004) — pending content phase (DOMPurify planned).
- **Affiliate redirect whitelist** (NFR-SEC-008) & **WAF** (NFR-SEC-010) — later phases.
- **Edge silent-refresh** for `/admin/*` on access-token expiry — UX/security polish.
- **Dependency advisories:** 5 dev-only (Vitest→Vite→esbuild) accepted per ADR-009; **0
  runtime-path advisories** introduced this phase.
- **Secret management:** dev defaults are present for `JWT_ACCESS_SECRET`; production boot
  *requires* a ≥32-char secret. Ensure real secrets via env/secrets-manager at deploy.
