# 08 — Security Design

> Spec §4.4 (NFR-SEC-001…010) + §15, re-expressed for **Express/TS + Postgres/Prisma**.
> Current state: **zero security** (no auth, no 2FA, open admin). Everything here is greenfield.

---

## 1. Authentication (NFR-SEC-001, §15.1)

- Email + password; **bcrypt/argon2** password hashing (replaces Laravel Hash).
- **JWT** access token (short, ~15min) + refresh token (rotating, httpOnly cookie); session
  concept enforced at 8h max (NFR-SEC-001) via refresh expiry.
- Login throttle: **5 attempts / 15 min / IP** (NFR-SEC-006) — Redis counter.
- `/admin/*` requires authenticated, active user.

## 2. Two-factor (NFR-SEC-002, §15.1)

- **TOTP** (RFC 6238) via `otplib`; secret stored encrypted in `users.two_factor_secret`.
- **Mandatory for Super Admin + SEO Manager** — these roles cannot complete login or hold an
  admin session without a verified TOTP step. Optional for others. QR provisioning on setup.

## 3. Authorization / RBAC (§15.2)

- 7 roles seeded (super_admin, admin, seo_manager, content_writer, affiliate_manager,
  analytics_viewer, developer) with the spec §15.2.1 permission matrix in `role_permissions`.
- `rbac(permission)` middleware per route (`07` §4). Frontend admin nav also gates by role, but
  **server is the enforcement boundary** (never trust the client).

## 4. Input / output safety

- **SQLi (NFR-SEC-005):** Prisma parameterises all queries; **no raw string interpolation**.
  Any raw SQL (tsvector search) uses parameter binding.
- **XSS (NFR-SEC-004):** API returns data, not HTML; React escapes by default. AI-generated
  guide HTML (`dangerouslySetInnerHTML`) is **sanitized** server-side (DOMPurify/sanitize-html)
  before store + on render allow-list. Validate all input with zod.
- **CSRF (NFR-SEC-003):** Bearer-token APIs are not cookie-CSRF-prone; for any cookie-based
  refresh, use SameSite=Strict + CSRF token on state-changing routes.
- **CSP (NFR-SEC-009):** helmet CSP — restrict scripts to self + GA/GTM; block inline
  (nonce-based) where feasible; frame-ancestors none.

## 5. Affiliate / privacy controls (§9, §4.6)

- **IP & UA stored as SHA-256 only** (NFR-SEC-007) — never plaintext; salt/pepper from env.
- **Redirect whitelist** (NFR-SEC-008/FR-049): only `amazon.in` (+ configured marketplaces)
  destinations; reject/200-fallback otherwise; validate before publish (§4.6).
- **302 not 301** for `/go/` (affiliate compliance). `rel="noopener noreferrer sponsored"`,
  `target="_blank"` on outbound links (FR-047). Disclosure auto-injected (FR-048).

## 6. Rate limiting & abuse (NFR-SEC-006, §15.5)

| Surface | Limit |
| ------- | ----- |
| Public API | 60/min/IP |
| Search | 30/min/IP |
| `/go/{asin}` | 60/min/IP (bot/scrape protection) |
| Admin API | 300–600/min/user |
| Login | 5/15min/IP |
| Contact form | 3/hour/IP (+ honeypot — current form lacks it; add) |

Edge layer: Cloudflare WAF (NFR-SEC-010) for SQLi/XSS/traversal + `/go/*` challenge.

## 7. Secrets & config

- All secrets in env (validated by zod at boot); **never committed** (`.gitignore` already
  excludes `.env*`). Provider/API credentials also storable **encrypted** in `settings`
  (Amazon, AI) per §14.10 — AES-256-GCM with a key from env/KMS.
- Drop the unused `@supabase/supabase-js` dependency (reduces surface).

## 8. Auditing & monitoring (§15.6, §15.8)

- **Audit middleware** writes create/update/delete/login/export to `audit_logs` (user, model,
  old/new values, IP, UA). Prisma `$extends`/middleware on admin models.
- Structured logs (pino) + request IDs; security events (failed logins, rbac denials, whitelist
  rejections) flagged. Alerting hooks in `14`.

## 9. Headers & transport

helmet defaults (X-Content-Type-Options, X-Frame-Options SAMEORIGIN, Referrer-Policy
strict-origin-when-cross-origin — matches §16.2 Nginx). HTTPS only (HSTS at edge). Secure,
httpOnly, SameSite cookies for refresh.

## 10. Data integrity (§4.6)

ASIN UNIQUE constraint (DB-level); AI content `aiStatus`/review flag gates public indexing;
redirect targets validated pre-publish; daily link health-check job on top 500 (cron, §16.7) →
admin notify on breakage.

## 11. Security testing (→ `13`)

- Auth/RBAC/2FA unit + integration tests; negative tests (role escalation, missing token).
- `/go` whitelist + 302 + IP-hash tests (spec §18.7 checklist).
- Dependency scanning (npm audit / Snyk) + `/security-review` on PRs touching auth/affiliate.
- Rate-limit and CSP regression tests.

## 12. Gaps vs spec & open items → `12`

- argon2 vs bcrypt choice. · JWT vs server-session for admin (lean JWT + short refresh). · CSP
  strictness vs GA/GTM/recharts inline needs. · KMS vs env for settings encryption key.
