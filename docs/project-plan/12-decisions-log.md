# 12 — Decisions Log (APPEND-ONLY, ADR-style)

> Record every architectural/scope decision here. **Append on each decision.** Format:
> ID · date · status · context · decision · consequences · alternatives. Never delete; supersede
> with a new ADR referencing the old one.

---

## ADR-001 — Separate backend package (`server/`)
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** Mandate is a Node/Express/TS backend alongside a preserved Next.js frontend.
- **Decision:** Add a standalone `server/` workspace with its own `package.json`/`tsconfig`;
  keep the existing root frontend untouched in place. Optionally add an npm workspace later.
- **Consequences:** Clean dependency isolation; independent deploy/scaling; frontend preserved.
  Slightly more tooling (two installs). 
- **Alternatives:** Next.js API routes (rejected — see ADR-002); single merged package
  (rejected — pollutes preserved frontend deps).

## ADR-002 — Express (standalone) for the API, not Next.js API routes
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** Spec §8 describes a standalone REST API + workers + scheduler; user mandates
  Express.
- **Decision:** All backend behaviour lives in the Express service; Next.js stays a frontend
  (SSR/SSG) that consumes the API. Exceptions: `app/sitemap.ts`/`app/robots.ts` may live on the
  Next side for same-origin indexing (final call in Phase 8).
- **Consequences:** Matches spec topology + user mandate; enables a separate worker process.
- **Alternatives:** Next route handlers as backend (rejected — weaker for queues/cron/long jobs,
  and contradicts the explicit Express requirement).

## ADR-003 — BullMQ (Redis) for queues + scheduling
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** Spec uses Laravel Horizon + Scheduler (PHP) — not usable here.
- **Decision:** Use **BullMQ** on Redis for all async queues (AI, imports, price/rating sync,
  sitemaps, analytics, click events) and repeatable jobs for the cron schedule (spec §16.7). Keep
  an `ai_queue` table for durable admin/audit visibility.
- **Consequences:** Native Node, mature, observable; separate worker process. 
- **Alternatives:** Agenda/node-cron only (weaker concurrency/retries); pg-boss (viable; BullMQ
  preferred for ecosystem + Redis already needed for cache).

## ADR-004 — PostgreSQL full-text (tsvector) for search
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** FR-027/028 specify MySQL FULLTEXT; we use Postgres.
- **Decision:** Implement search via a `searchVector tsvector` column + GIN index on Product
  (and content), maintained via trigger or app-side update; behaviour parity with spec.
- **Consequences:** No extra search infra at launch; meets <500ms/<200ms targets with indexes +
  cache. Can graduate to Meilisearch/OpenSearch later if needed.
- **Alternatives:** External search engine now (rejected — premature complexity).

## ADR-005 — Preserve existing UI palette over spec §6
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** Spec §6 prescribes blue `#1a56db` / green `#16a34a`; existing UI uses monochrome +
  pink→orange gradient (`#E91E8F`…). User explicitly requires preserving existing colors/design.
- **Decision:** Keep the existing palette, tokens, components, and layouts. Spec §6 color rules
  are treated as superseded by the user constraint.
- **Consequences:** Logged as a sanctioned deviation in `15`; compliance scoring treats §6 colors
  as "intentional deviation," not a defect.
- **Alternatives:** Repaint to spec (rejected — violates explicit user instruction).

## ADR-006 — Preserve existing routes; add spec-aligned aliases + redirects
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** Spec URLs differ (`/compare/{a}-vs-{b}/`, `/{category-slug}/`, `/search/?q=`,
  `/go/{asin}`); user wants existing routes preserved.
- **Decision:** Keep current routes working. **Add** spec-aligned routes/aliases with 301
  redirects via the `redirects` table/middleware; honor `?q=` on `/search`; add `/go/{asin}`.
  Category-prefix question (`/categories/{slug}` vs `/{category-slug}/`) deferred to Phase 8 —
  default to keeping the prefix and adding the bare alias only if SEO demands it.
- **Consequences:** No existing URL breaks without a redirect; spec intent satisfied additively.
- **Alternatives:** Hard URL migration (rejected — breaks preservation constraint).

## ADR-007 — Claude as primary AI provider
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** Spec §10.2 names Claude 3.5 Sonnet primary, GPT-4o fallback; building AI features
  should default to the latest capable Claude models.
- **Decision:** Provider abstraction with **Claude primary**, OpenAI fallback, model id
  configurable in settings; default to the latest available Claude model at implementation time.
- **Consequences:** Aligns with spec + platform guidance; swappable per settings.
- **Alternatives:** OpenAI-first (rejected — contradicts spec primary).

## ADR-008 — Swagger / OpenAPI for API documentation
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** User added "Swagger" to the mandated Phase 0 stack. The blueprint does not specify
  an API-docs tool.
- **Decision:** Use **swagger-jsdoc** (build the OpenAPI 3.0.3 spec from `@openapi` JSDoc
  annotations on route files) + **swagger-ui-express** (serve UI at `/docs`, raw spec at
  `/docs.json`). Annotations live next to the routes they document.
- **Consequences:** Docs stay co-located with code and version with it; zero separate spec file
  to drift. Adds two dev-light deps. Reflected in `07-api-design.md` going forward.
- **Alternatives:** Hand-written openapi.yaml (drifts); tRPC/zod-to-openapi (heavier; revisit if
  we adopt end-to-end zod contracts).

## ADR-009 — Single ioredis via npm override; accept dev-only esbuild advisories
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** (a) BullMQ bundles its own `ioredis` minor; mismatch with our top-level copy
  produced a TypeScript type-identity error when sharing a connection. (b) `npm audit` reports 5
  advisories, all in the Vitest→Vite→esbuild **dev** chain (esbuild ≤0.28.0 Deno binary-integrity
  issue) with no clean upstream fix.
- **Decision:** (a) Add `"overrides": { "ioredis": "5.10.1" }` + pin our dep to match, forcing a
  single physical ioredis copy (deduped). (b) **Accept** the esbuild advisories as dev-only and
  non-shipping (the production Docker stage never runs esbuild/vitest); do **not** run
  `npm audit fix --force` (would break the toolchain). Re-evaluate when Vite/esbuild publish a
  fixed line.
- **Consequences:** Clean typecheck/build with a shared Redis connection; security baseline is
  "0 runtime advisories, 5 accepted dev-only." Tracked in `15` §8 risks + Phase 0 report.
- **Alternatives:** Give BullMQ its own connection options object (defers but doesn't remove the
  dedupe need); downgrade Vitest (reintroduces a critical); force-fix (breaks tests).
- **Revisit trigger:** any new phase that adds runtime deps, or a Vite release on a fixed esbuild.

## ADR-010 — Re-sequence: Authentication & RBAC before the full catalog schema
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** The roadmap (`09`) put DB schema+seed at Phase 1 and auth at Phase 7. The user
  explicitly designated "Phase 1 = Authentication & RBAC".
- **Decision:** Follow the user's sequencing. Implement the auth-subset of the DB schema now
  (users/roles/permissions/sessions/tokens/audit) + RBAC seed; defer the catalog tables
  (products/categories/guides/comparisons/brands…) to a renamed "Catalog schema + seed" phase.
- **Consequences:** Admin is secured early; the catalog read path (original Phase 2) now follows
  the catalog-schema phase. Tracker/roadmap annotated. No work wasted (schema is additive).
- **Alternatives:** Insist on original order (rejected — user owns sequencing).

## ADR-011 — cuid string IDs for auth entities
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** `06-database-design.md` specified BigInt autoincrement IDs (mirroring spec §7
  MySQL). Auth tables benefit from non-enumerable IDs.
- **Decision:** Use `cuid()` string IDs for User/Role/Permission/Session/RefreshToken/
  VerificationToken/AuditLog. Catalog tables may still use BigInt; FK columns referencing User
  (e.g. guide.authorId) will be String to match.
- **Consequences:** No user/session enumeration via sequential IDs. `06` to be updated when the
  catalog schema lands. Slight heterogeneity (string auth IDs vs BigInt catalog) — acceptable.
- **Alternatives:** BigInt for users (rejected — enumeration/security); UUIDv4 (cuid preferred:
  shorter, sortable-ish, collision-resistant).

## ADR-012 — Token storage + cookie + CSRF strategy
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** Spec/user require httpOnly cookies, refresh rotation, CSRF protection, bcrypt.
- **Decision:**
  - **Access token:** JWT (HS256, 15m), httpOnly cookie `cs_access` (also accepts `Bearer`).
  - **Refresh token:** opaque random (48 bytes), stored only as **SHA-256(+pepper) hash**,
    httpOnly cookie `cs_refresh` scoped to `/api/auth`. **Rotated on every use**; replaying a
    revoked token → reuse detected → revoke all of the user's tokens/sessions.
  - **Verify/reset tokens:** opaque random, hashed at rest, single-use, TTL-bound.
  - **CSRF:** double-submit cookie — readable `cs_csrf` cookie echoed in `x-csrf-token` header,
    enforced on cookie-authenticated mutations (refresh/logout); Bearer clients exempt.
  - **Passwords:** bcrypt (cost 12). IPs stored as SHA-256 (NFR-SEC-007).
- **Consequences:** DB leak exposes no usable tokens; XSS can't read access/refresh; CSRF
  mitigated. Meets NFR-SEC-003/006/007.
- **Alternatives:** JWT refresh tokens (rejected — can't revoke server-side easily); localStorage
  tokens (rejected — XSS-exposed).

## ADR-013 — Auth API unversioned (`/api/auth`) + Next proxy rewrites
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** User specified literal paths `/api/auth/...`; the domain API is versioned at
  `/api/v1`. Cross-origin cookies (Next :3000 ↔ API :4000) are awkward.
- **Decision:** Mount the auth router at **`/api/auth`** (unversioned, matching the user's spec);
  keep domain APIs at `/api/v1`. Add `next.config.js` rewrites proxying `/api/auth/*` and
  `/api/v1/*` to the backend so the browser calls them **same-origin** → first-party httpOnly
  cookies, no CORS/SameSite issues in dev.
- **Consequences:** Auth endpoints exactly match the requested paths; cookies "just work" via the
  proxy. Slight inconsistency (auth unversioned vs domain versioned) — accepted, documented in
  `07`.
- **Alternatives:** Version auth under `/api/v1/auth` (rejected — contradicts explicit paths);
  CORS + SameSite=None;Secure (rejected — fragile on http localhost).

## ADR-014 — TOTP 2FA design (encrypted secret, two-step challenge, backup codes)
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** NFR-SEC-002 requires TOTP 2FA. Need enrollment, login challenge, recovery, and at-
  rest secret protection.
- **Decision:**
  - **otplib v12** (classic `authenticator` API — v13's pluggable functional API was needless
    complexity) + `qrcode` for the enrollment QR.
  - TOTP secret **encrypted at rest** with **AES-256-GCM** (`ENCRYPTION_KEY`-derived key).
  - **Two-step login:** step 1 (password) returns a short-lived **challenge JWT** (`typ:'2fa'`,
    5-min) — *no session*; step 2 (`/login/2fa`) exchanges challenge + code for a session.
  - **Backup codes:** 10 single-use codes, stored hashed (SHA-256+pepper), accepted at login or
    for disable; reuse rejected.
  - Dedicated 2FA rate limiter; CSRF on 2FA mutations.
- **Consequences:** Meets NFR-SEC-002; DB-leak-safe secrets; standard UX. Adds otplib/qrcode deps.
- **Alternatives:** WebAuthn/passkeys (stronger but heavier — future); SMS (insecure); plaintext
  secret (rejected).

## ADR-015 — Email via Resend with console fallback; fire-and-forget retry + audit
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** Real verification/reset email delivery was stubbed (logged) in Phase 1.
- **Decision:** Provider abstraction (`EmailProvider`): **Resend** when `RESEND_API_KEY` is set,
  else a **console** provider (dev/test/CI need no external service). Branded HTML+text templates.
  Sends are **fire-and-forget** from the auth request path (never block/fail login/reset), with
  **exponential-backoff retry** and an **audit** entry (`email.sent`/`email.failed`).
  `recordAudit` now returns an awaitable (non-rejecting) promise so delivery→audit is testable.
- **Consequences:** Production emails via Resend with one env var; flows unaffected if email
  fails; deterministic tests via the console provider. Resend chosen over SMTP/nodemailer for
  simplicity + deliverability + the user's explicit "Resend" request.
- **Alternatives:** nodemailer/SMTP (more config); blocking send (rejected — couples auth to
  email uptime).

## ADR-016 — 2FA enforcement via a Setting + soft `mustEnable2fa` flag
- **Date:** 2026-06-14 · **Status:** Accepted
- **Context:** Spec wants 2FA mandatory for privileged roles ("admin enforcement option"). Hard-
  blocking a privileged user who hasn't enrolled risks lockout (e.g. the seeded admin).
- **Decision:** Store enforced roles in a `Setting` (`auth.enforce_2fa_roles`, default
  `["admin"]`), editable by admins via `GET/PUT /api/v1/admin/security/2fa-policy`
  (`settings.view`/`settings.edit`). Enforcement is **soft**: login of an enforced-but-not-yet-
  enrolled user still issues a session but returns `mustEnable2fa: true` (the UI routes them to
  setup). Hard-blocking can be layered later.
- **Consequences:** Real, admin-configurable enforcement without lockout risk; introduces a
  minimal `Setting` model (forward-compatible with spec §7 settings).
- **Alternatives:** Hard block at login (lockout risk); env-var-only policy (not admin-editable).

---

<!-- TEMPLATE:
## ADR-00X — <title>
- **Date:** YYYY-MM-DD · **Status:** Proposed|Accepted|Superseded by ADR-00Y
- **Context:** …
- **Decision:** …
- **Consequences:** …
- **Alternatives:** …
-->
