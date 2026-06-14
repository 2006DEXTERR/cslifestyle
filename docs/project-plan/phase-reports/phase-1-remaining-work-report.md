# Phase 1 — Remaining Work Report

> Work explicitly out of scope, deferred, or newly surfaced after Auth & RBAC.
> Date: 2026-06-14. Feeds the next planning cycle.

---

## 1. Auth/security follow-ups (carry into a hardening pass)

| Item | Priority | Note |
| ---- | :------: | ---- |
| **TOTP 2FA** enrollment + challenge + verify (NFR-SEC-002) | High | Mandatory for Super Admin + SEO Manager per spec. Add `twoFactorSecret`/`twoFactorEnabled` to User; `otplib`; enforce in login + `/admin` |
| **Real email delivery** | High | Replace `mailer.ts` stub (currently logs links) with SMTP/provider; remove dev-token-in-response |
| Edge **silent refresh** for `/admin/*` on access-token expiry | Medium | Today: expired access → redirect to /login. Add refresh attempt or client interceptor |
| Disabled-account login (403) integration test | Medium | Path implemented; add explicit test |
| Frontend auth **component/E2E tests** (Playwright) | Medium | Pages validated via shared zod; no UI tests yet |
| AI-HTML **sanitisation** (NFR-SEC-004) | Medium | DOMPurify when AI/content lands |
| Account lockout / progressive backoff beyond 5/15m | Low | Optional defense-in-depth |
| Refresh-token **device/session management UI** (list/revoke) | Low | Sessions table supports it |
| Remove unused root `@supabase/supabase-js` | Low | Deferred since Phase 0 (touches frontend deps) |

## 2. Deferred from this phase (by design)

- Catalog DB schema (products/categories/guides/comparisons/brands/etc., spec §7) — **next phase
  (1b)**.
- All domain `/api/v1` endpoints (spec §8) — auth-only surface exists today.
- 2FA, email provider, affiliate whitelist, WAF — later phases per roadmap.

## 3. Newly surfaced (discovered while building)

- **Two TS projects, one repo:** root `tsconfig.json` now excludes `server/` + `docs/` so
  `next build` doesn't typecheck the backend. Keep this boundary as the backend grows.
- **`jose` Edge warning:** `next build` logs a benign Edge-runtime warning from jose's JWE
  deflate path (unused by our `jwtVerify`). No action needed; revisit if it ever errors.
- **ioredis dedupe** (ADR-009) still required; confirm on each dependency change.
- **Cookie config for production:** set `COOKIE_SECURE=true`, choose `COOKIE_SAMESITE`
  (`lax`/`strict`), and `COOKIE_DOMAIN` for the real domain; set matching `JWT_ACCESS_SECRET` in
  **both** the API and the Next runtime (the `/admin` edge middleware needs it).

## 4. Test/infra debt

- Integration tests require a DB and are **gated** (`RUN_DB_TESTS`); they run in CI (Postgres
  service) but are skipped on a bare local checkout. A `docker compose up` + `RUN_DB_TESTS=true`
  run is the documented local path (verified this phase via a throwaway embedded Postgres).
- No coverage thresholds enforced yet (target ≥80% services/engines per `13`).
- No load test for auth endpoints (k6) yet — defer to the performance phase.

## 5. Compliance snapshot after Phase 1

Behavioural ~16% · Surface ~34% (see `15-compliance-report.md`). Security subsystem (§15) is the
big mover: most NFR-SEC controls now real; **2FA the notable open item**. DB ~26% (auth subset);
API ~15% (auth + probe). Frontend remains ~90% preserved (+4 auth pages).

## 6. Recommended next step

Proceed to **Phase 1b — Catalog schema + seed** (remaining spec §7 → Prisma; seed `lib/data.ts`),
then **public read API + frontend wiring** (the original Phase 2 — biggest SEO/quality unlock).
Schedule a short **security hardening pass** (2FA + email) before exposing admin write APIs
broadly.
