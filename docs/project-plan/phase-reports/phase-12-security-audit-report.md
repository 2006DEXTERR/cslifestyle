# Phase 12 — Security Audit Report

**Date:** 2026-06-15 · **Phase:** 12 (final) · **Result:** No critical or high-severity issues.

Audited each surface the spec calls out; "fix critical/high only" — none found requiring a code change.
Findings below are low/medium (documented, deployment-time) or confirmations.

## 1. Surface-by-surface

| Surface | Verdict | Evidence / control |
| ------- | ------- | ------------------ |
| **Auth** | ✅ secure | bcrypt (rounds 12), JWT access (15m) httpOnly cookie, generic error messages, login rate-limit + brute-force guard |
| **Refresh tokens** | ✅ secure | opaque + SHA-256 stored, scoped to `/api/auth`, **rotation + reuse-detection → revoke-all** (`auth.service.ts`) |
| **2FA** | ✅ secure | TOTP, AES-256-GCM-encrypted secret, hashed backup codes, two-step login challenge |
| **RBAC** | ✅ secure | `requirePermission` on every privileged route; 87 perms / 5 roles; `admin.access` edge guard on `/admin/*` |
| **Admin APIs** | ✅ secure | JWT + RBAC + CSRF + audit on all writes (verified across import/ai/analytics/marketing/media/discovery) |
| **Uploads** | ✅ secure | mime allow-list, size limit, **hash-based filenames (no path traversal)**, in-memory→sharp, read-only static serve |
| **Affiliate `/go`** | ✅ secure | amazon.in whitelist, URL built from ASIN (not stored arbitrary URLs) → **open-redirect-proof**; privacy-safe click log |
| **Import inputs** | ✅ secure | zod-validated; CSV parsed safely; Prisma parameterised; drafts (`isPublished:false`) — no silent publish |
| **AI outputs** | ✅ secure | treated as untrusted; stored as data (never HTML); quality-validated; **review gate blocks indexing** (NFR-SEC-004/§4.6) |
| **Newsletter endpoints** | ✅ secure | public subscribe/unsubscribe validated + rate-limited; **double opt-in**; hashed verify tokens; one-click unsubscribe; no open redirect on tracking |
| **Analytics collection** | ✅ secure | public beacon validated + rate-limited; **SHA-256(ip) only** (NFR-SEC-007); view/search events only (privileged events server-side, forged → 400) |
| **Search endpoints** | ✅ secure | public reads validated + rate-limited; parameterised index queries; published-only visibility |

## 2. Cross-cutting controls (confirmed)

- **SQLi:** all DB access via Prisma (parameterised) — NFR-SEC-005.
- **XSS:** API returns data not HTML; React escapes; AI content sanitised + review-gated — NFR-SEC-004.
- **CSRF:** double-submit token on all state-changing routes (incl. multipart uploads) — NFR-SEC-003.
- **Transport/headers:** Helmet + CSP + HSTS + `X-Content-Type-Options` etc. (verified on responses).
- **Privacy:** IPs/UAs stored as SHA-256 only across affiliate/search/analytics — NFR-SEC-007.
- **Secrets:** validated in prod, AES-256-GCM at rest, kept out of images (`--env-file`).
- **Rate limiting:** 6 limiters incl. auth/login/2FA/public/search/go.

## 3. Low/medium findings (documented, no code change this phase)

1. **JSON body limit vs CSV import** — global `express.json({limit:'1mb'})` caps the JSON `{ csv }`
   import body below the schema's 20 MB. Effect: large JSON CSV imports get `413` (fail-safe, not a
   vuln). *Remediation if needed:* a per-route higher limit for `/api/import/csv`. Media multipart
   uploads are unaffected (multer limit).
2. **Upload virus/content scanning** — not performed (deployment-time concern; add a scanner in the
   pipeline before public exposure).
3. **Inline SVG** — SVGs are stored as-is and rendered via `<img src>` (safe); never inline `innerHTML`.
4. **External-provider keys** — when `AI_DRIVER/ANALYTICS_DRIVER=live`, ensure keys are injected via
   secrets, not env files in the image.

## 4. NFR-SEC coverage

NFR-SEC-001 (admin auth) ✅ · 002 (2FA) ✅ · 003 (CSRF) ✅ · 004 (XSS/untrusted AI) ✅ · 005 (SQLi) ✅ ·
006 (rate-limit/brute-force) ✅ · 007 (IP hashing) ✅ · 008 (redirect whitelist) ✅ · 009 (CSP) ✅ ·
010 (WAF) 🟡 — deployment (Cloudflare).

## 5. Conclusion

No critical/high issues. The application enforces auth/RBAC/CSRF/audit on every privileged action, hashes
all PII-adjacent identifiers, is open-redirect-proof, and gates untrusted AI content behind review.
Remaining items are deployment-layer (WAF, virus scanning) or fail-safe limitations (CSV body size).
