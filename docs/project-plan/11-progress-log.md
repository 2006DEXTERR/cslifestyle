# 11 — Progress Log (APPEND-ONLY)

> Chronological record of work. **Append a dated entry after every phase / significant session.**
> Newest at top. Never rewrite history; correct via a new entry.

---

## 2026-06-14 — Auth Follow-Up complete: TOTP 2FA + Resend Email
**By:** Claude · **Phase:** 1a (Authentication follow-up)

- **Scope:** the two deferred security items from Phase 1 — TOTP 2FA and real email delivery.
  No CMS/catalog work started.
- **TOTP 2FA:**
  - Libs: `crypto.ts` (AES-256-GCM for secrets at rest), `totp.ts` (otplib v12 + QR via
    `qrcode`), `backup-codes.ts` (single-use, hashed). Challenge token in `jwt.ts`.
  - DB: User gains `twoFactorEnabled/twoFactorPending/twoFactorSecret(enc)/twoFactorVerifiedAt`;
    new `TwoFactorBackupCode` + `Setting` models. Migration `20260614010000_2fa_email_settings`.
  - Flows (`twofactor.service.ts`): setup (secret+QR), enable (verify→backup codes), disable,
    regenerate; two-step login (`login` returns a challenge when 2FA on → `login/2fa` completes
    with TOTP **or** a single-use backup code). Backup-code reuse rejected.
  - **Admin enforcement option:** `Setting` `auth.enforce_2fa_roles` (default `["admin"]`) +
    `GET/PUT /api/v1/admin/security/2fa-policy`; soft-enforced via `mustEnable2fa` flag on login.
  - Endpoints: `/api/auth/2fa/{status,setup,enable,disable,backup-codes}`, `/api/auth/login/2fa`,
    policy GET/PUT. CSRF on mutations; dedicated 2FA rate limiter. Swagger updated (7 new paths).
- **Resend email integration:**
  - `lib/email/{provider,templates,retry}.ts` + rewritten `mailer.ts`. Provider abstraction:
    **Resend** when `RESEND_API_KEY` set, else **console** fallback. Branded HTML+text templates
    (verification + reset). Retry with exponential backoff; **audit** `email.sent`/`email.failed`
    (recordAudit now returns an awaitable promise). Fire-and-forget from the auth path
    (non-blocking). Existing verify/reset flows unchanged.
- **Frontend (existing design system, preserved):** login page now handles the 2FA challenge
  step; new `/account/security` page (enable w/ QR + secret + code → backup codes; disable);
  `lib/auth.ts` gains 2FA methods + `LoginResponse` union. No existing page restyled.
- **Tests:** +21 unit (crypto/totp/backup-codes/email templates+retry+provider/challenge) = 51
  unit total; +3 integration (full 2FA enroll→TOTP login→backup-code login→reuse-reject→disable;
  admin policy GET/PUT + mustEnable2fa; email→audit). **16/16 integration verified vs real
  embedded Postgres** (incl. all 13 Phase-1 tests — no regression).
- **Verification:** typecheck ✅ · lint ✅ · build ✅ · 51 unit ✅ · 16 integration ✅ · frontend
  `next build` ✅ (login + `/account/security`; all existing pages intact) · no-DB smoke ✅ (2FA
  routes 401 unauth; 7 2FA/security paths in Swagger).
- **New ADRs:** 014 (2FA design), 015 (Resend + console fallback + fire-and-forget retry/audit),
  016 (2FA enforcement via Setting + soft `mustEnable2fa`).
- **Compliance:** NFR-SEC-002 (2FA) **deferred → ✅**. Email delivery deferral closed.
- **Still deferred:** SMTP-less means real sends need a `RESEND_API_KEY` (console fallback
  otherwise); nav link to `/account/security` not added (page reachable directly); edge
  silent-refresh; removing unused root `@supabase/supabase-js`.

**Next:** Phase 1b — catalog schema + seed. **Stopping after this follow-up per instruction.**

---

## 2026-06-14 — Phase 1 complete: Authentication & RBAC
**By:** Claude · **Phase:** 1 (Auth & RBAC, user-sequenced — see ADR-010)

- **Re-sequencing:** user designated Auth & RBAC as "Phase 1" (was roadmap Phase 7). Built the
  auth-subset of the DB schema now; catalog tables deferred to the renamed "Catalog schema +
  seed" phase. Recorded in ADR-010.
- **Database (Prisma):** added `User, Role, Permission, RolePermission, Session, RefreshToken,
  VerificationToken (enum type), AuditLog`. cuid string IDs for auth entities (ADR-011).
  Generated a real migration offline via `migrate diff` (`prisma/migrations/20260614000000_
  auth_init`, 183 lines) + `migration_lock.toml`. Seed (`prisma/seed.ts`): 63 permissions, 5
  named roles (admin/editor/analyst/author/user) with mapped permissions, default admin user.
- **Security libs:** bcrypt password hash/verify; JWT access tokens (HS256, 15m); opaque
  refresh/verify/reset tokens stored **hashed (SHA-256 + pepper)**; cookie helpers (httpOnly
  access+refresh, readable CSRF) (ADR-012).
- **Services:** `auth.service` (register/login/logout/refresh/me/forgot/reset/verify/resend) with
  **refresh-token rotation + reuse detection** (revokes all on theft); `rbac.service` (load
  user+role+permissions, permission/role checks).
- **Middleware:** `authenticate` (cookie/Bearer → fresh DB load), `requireRole`,
  `requirePermission` (AND, returns missing), `auditLogger`, `rateLimiter` (general 100/15m +
  login brute-force 5 failed/15m, memory or Redis store), `requireCsrf` (double-submit),
  `validateBody` (zod).
- **API:** 9 endpoints at `/api/auth/*` (unversioned per spec) + protected `/api/v1/admin/ping`
  RBAC probe. Full Swagger annotations (9 auth paths in `/docs.json`). Standard envelope.
- **Frontend (preserved design system):** `/login`, `/signup`, `/forgot-password`,
  `/reset-password` using shadcn Form + RHF + zod + BrandButton + brand gradient; `lib/auth.ts`
  client (credentials + CSRF header). `next.config.js` rewrites proxy `/api/*` → backend
  (first-party cookies). Root `middleware.ts` guards `/admin/*` (Edge JWT verify via `jose` +
  `admin.access` RBAC redirect). **No existing UI/page modified.**
- **Tests:** 30 unit (password/jwt/tokens/permissions/authorize/validation/health) + 13
  integration/RBAC (register/login/logout/refresh-rotation-&-reuse/me/forgot-reset/verify/
  brute-force-429/CSRF-403/RBAC-401-403-200). Integration DB-gated (`RUN_DB_TESTS`); **verified
  13/13 green against a real embedded Postgres locally**; CI runs them (migrate+seed+Postgres
  service). CI updated.
- **Verification:** typecheck ✅ · lint ✅ (0 warnings) · build ✅ · unit 30/30 ✅ · integration
  13/13 ✅ (embedded PG) · frontend `next build` ✅ (all existing pages intact, 4 new pages) ·
  no-DB smoke ✅ (validation 400, 401s, Swagger).
- **New ADRs:** 010 (re-sequence), 011 (cuid auth IDs), 012 (cookie+CSRF token strategy), 013
  (unversioned `/api/auth` + Next proxy rewrites).
- **Deferred:** TOTP 2FA enforcement (schema/flows are 2FA-ready; full TOTP enrollment/verify is
  a follow-up — NFR-SEC-002 partial); real email delivery (mailer stubbed/logged); removing
  unused root `@supabase/supabase-js`.

**Next:** Phase 1b — catalog schema + seed (remaining spec §7), then public read API + frontend
wiring. **Stopping after Phase 1 per instruction.**

---

## 2026-06-14 — Phase 0 complete: backend foundation & tooling
**By:** Claude · **Phase:** 0

- Scaffolded the standalone backend under `server/` (separate `package.json`/`tsconfig`,
  ADR-001) — **frontend untouched** (only additive change to root was `.gitignore`).
- **Stack stood up:** Express 4 + TypeScript, Prisma (Postgres datasource; zero models —
  Phase 1 adds them), ioredis (Redis client), BullMQ (queue registry + worker entrypoint),
  Swagger (OpenAPI at `/docs`, JSON at `/docs.json`), pino logging (pretty in dev), zod env
  validation (`src/config/env.ts`), standard response envelope + `ApiError`, requestId
  correlation, helmet + cors, central error/404 handlers.
- **Health endpoints:** `GET /healthz` (liveness), `GET /readyz` (checks Postgres + Redis with
  2s timeouts, 503 when degraded), `GET /api/v1/health` (versioned base ping).
- **Infra/tooling:** root `docker-compose.yml` (Postgres 16 + Redis 7, optional `app` profile
  for API+worker), `server/Dockerfile` (multi-stage), `.github/workflows/ci.yml`
  (typecheck → lint → build → test with Postgres/Redis services), ESLint flat config +
  Prettier, Vitest + Supertest.
- **Verification (all green):** `npm install` (Prisma client generated via postinstall) ·
  `typecheck` · `lint` · `build` (→ `dist/`) · `test` 4/4 · **live smoke test**: `/healthz` 200,
  `/api/v1/health` 200, `/readyz` 503 degraded (no DB/Redis in sandbox — correct), `/docs` 200,
  `/docs.json` served.
- **Fixes during build:** (1) BullMQ bundled a different `ioredis` minor → type-identity clash;
  resolved with an npm `override` pinning a single `ioredis@5.10.1` (deduped). (2) Bumped Vitest
  2→3 to clear a critical dev advisory.
- **Known accepted risk:** 5 esbuild advisories remain, all **dev-only** (Vitest→Vite→esbuild
  chain; Deno-specific binary-integrity issue, range ≤0.28.0). No clean upstream fix yet; never
  runs in the production image. Documented in ADR-009 + the Phase 0 report; re-check next phase.
- New ADRs: **008** (Swagger/OpenAPI), **009** (ioredis override + accepted dev-only audit risk).
- Decision deferred (not in Phase 0 scope): removing the unused root `@supabase/supabase-js`
  dep — left untouched to keep Phase 0 from modifying frontend deps.

**Next:** Phase 1 — Prisma schema (spec §7 → `06`) + seed (port `lib/data.ts` + roles/permissions/
settings/super-admin).

---

## 2026-06-14 — Planning system established
**By:** Claude · **Phase:** Planning (pre-Phase-0)

- Read the full repository (113 tracked files, commit `f4651ea`) and the entire 83-page
  blueprint (`CSLifestyle_V2_Blueprint.pdf`).
- Ran three parallel deep audits: public frontend, admin panel, data/infra. Synthesized into
  `03-current-state-audit.md`.
- Key findings:
  - Frontend is a polished Next.js 13.5 App Router + shadcn/Tailwind shell — **22 public routes
    + 16 admin pages, all mock data, almost all `"use client"`.**
  - **No backend, no DB, no Prisma, no API, no auth, no engines.** `@supabase/supabase-js`
    present but unused.
  - Design system = monochrome + pink-gradient palette (differs from spec's blue/green);
    **preserved per user constraint.**
  - SEO infra absent (no sitemap/robots/canonical/JSON-LD/generateMetadata/generateStaticParams).
- Produced full requirement mapping (`04-gap-analysis.md`): FR tally ✅8 / 🟡35 / ❌27;
  all DB models, all APIs, all engines, all NFRs essentially Missing.
- Authored all 15 planning docs, including target architecture (Node/Express/TS + Postgres/
  Prisma monorepo), DB design (spec §7 → Prisma), API design (spec §8 → Express), security
  design, 12-phase roadmap, testing & deployment strategy, and the initial compliance report.
- Recorded foundational decisions ADR-001…006 in `12-decisions-log.md`.
- **No implementation code written** (per the user's "plan first" instruction).

**Next:** Phase 0 — backend foundation & tooling (await user go-ahead).

---

<!-- TEMPLATE for future entries — copy above this line:

## YYYY-MM-DD — <short title>
**By:** <who> · **Phase:** <#/name>

- What was done (deliverables shipped, files touched at a high level)
- DB migrations added
- API endpoints added/changed
- Tests added; CI status
- Decisions made (cross-ref `12` ADR ids)
- Compliance delta (old % → new %)
- Deviations from `09` plan + why
- Blockers / risks

**Next:** <what's next>
-->
