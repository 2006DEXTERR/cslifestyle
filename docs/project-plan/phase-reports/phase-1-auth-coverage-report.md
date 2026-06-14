# Phase 1 — Auth Coverage Report

> What authentication/authorization surface exists, and how each piece is tested.
> Date: 2026-06-14.

---

## 1. Endpoint coverage

| Endpoint | Method | Auth | Validation | Rate limit | CSRF | Tested |
| -------- | ------ | ---- | ---------- | ---------- | ---- | ------ |
| `/api/auth/register` | POST | public | ✅ zod | general | — | unit (schema) + integ (201, 409, 400) |
| `/api/auth/login` | POST | public | ✅ zod | **login brute-force** | — | integ (200/401) + integ (429) |
| `/api/auth/logout` | POST | cookie | — | general | ✅ | integ (403 w/o CSRF) |
| `/api/auth/refresh` | POST | cookie | — | general | ✅ | integ (rotation 200 + reuse 401) |
| `/api/auth/me` | GET | bearer/cookie | — | general | — | integ (200 w/ session) + smoke (401) |
| `/api/auth/forgot-password` | POST | public | ✅ zod | general | — | integ (200 + devResetToken) |
| `/api/auth/reset-password` | POST | public (token) | ✅ zod | general | — | integ (200, old pw invalidated) |
| `/api/auth/verify-email` | POST | public (token) | ✅ zod | general | — | integ (200, emailVerified=true) |
| `/api/auth/resend-verification` | POST | public | ✅ zod | general | — | covered by service + schema unit |
| `/api/v1/admin/ping` | GET | **JWT + RBAC** | — | — | — | integ (401/403/200) |

All endpoints return the standard envelope `{ status, data, meta, message, errors }` and are
documented in Swagger (`/docs`, `/docs.json` — 9 auth paths verified present).

## 2. Flow coverage

| Flow | Implemented | Verified |
| ---- | :---------: | -------- |
| Register → session (cookies) → role `user` | ✅ | integ |
| Duplicate email rejected (409) | ✅ | integ |
| Login success / wrong password (401) / disabled account (403) | ✅ | integ (200/401); 403 path in service |
| Access token via httpOnly cookie **and** `Authorization: Bearer` | ✅ | smoke (Bearer) + integ (cookie) |
| `/me` returns user + role + permissions | ✅ | integ |
| **Refresh rotation** (new token each use) | ✅ | integ |
| **Refresh reuse detection** (revoke-all on theft) | ✅ | integ (401) |
| Logout (revoke refresh + delete session + clear cookies) | ✅ | integ (CSRF-gated) |
| Forgot password (no enumeration; always 200) | ✅ | integ |
| Reset password (single-use token; revokes all sessions) | ✅ | integ (old pw → 401) |
| Verify email (single-use token) | ✅ | integ (emailVerified flips) |
| Resend verification (no enumeration) | ✅ | service + schema |

## 3. RBAC coverage

- **Roles seeded:** admin (63 perms), editor (31), analyst (10), author (12), user (0).
- **Permission catalog:** 63 permissions (`<module>.<action>` for 14 modules + specials:
  `admin.access`, `*.publish`, `products.import`, `ai.generate`, `seo.manage`).
- **Middleware:** `requireRole(...roles)` and `requirePermission(...perms)` (AND-semantics,
  returns `{ missing }` on 403).
- **Enforcement boundary:** server-side on every protected route; the Next `/admin/*` edge
  middleware is the coarse UI gate (`admin.access`).
- **Tested:** unit (`authorize.test.ts`: allow/deny/401/403 + missing list; `permissions.test.ts`:
  role→permission matrix invariants) + integration (`/api/v1/admin/ping`: 401 no-auth, 403 plain
  user, 200 admin).

## 4. Test inventory

**Unit (30 tests, run everywhere):**
`password` (3) · `jwt` (3) · `tokens` (3) · `permissions` (6) · `authorize` (6) ·
`validation` (5) · `health` (4, Phase 0).

**Integration + RBAC (13 tests, DB-gated `RUN_DB_TESTS`):** register/duplicate/weak-pw/login/
me/refresh-rotation+reuse/csrf/forgot-reset/verify-email/brute-force + RBAC 401/403/200.
**Verified 13/13 against a real embedded Postgres locally; run in CI vs Postgres service.**

## 5. Coverage gaps (tracked in the Remaining Work Report)

- TOTP 2FA flows (enrollment, challenge, verify) — **not implemented**.
- Disabled-account login (403) — implemented in service; no dedicated integration test yet.
- Email delivery — stubbed (logged); no email-provider integration test.
- Token-expiry edge cases (access expiry → silent refresh at the edge) — not handled.
- Frontend auth pages — no component/E2E tests yet (forms validated via shared zod rules).
