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

## ADR-017 — Catalog entities use cuid() string IDs (not BigInt autoincrement)
- **Date:** 2026-06-15 · **Status:** Accepted (refines `06` §1)
- **Context:** `06-database-design.md` §1 sketched spec §7 catalog tables as
  `BigInt @id @default(autoincrement())`. Phase 2 implements the first catalog tables (products,
  categories, brands).
- **Decision:** Catalog entities (`Category`, `Brand`, `Product`, `ProductImage`,
  `ProductPriceHistory`, `SearchQuery`) use **`cuid()` string IDs**, matching the auth entities.
- **Consequences:** (1) **JSON-safe** — `BigInt` is not natively JSON-serialisable and would force
  custom serialisers on every response; (2) parity with existing auth models (one ID convention);
  (3) the existing frontend `lib/types.ts` already types `id` as `string`, so presenters map
  cleanly; (4) non-enumerable IDs. Slugs remain the public URL identifier regardless.
- **Alternatives:** BigInt autoincrement (JSON-serialisation friction, mixed ID conventions);
  UUID (larger, same benefit as cuid).

## ADR-018 — DB→frontend "presenter" superset shape for catalog reads
- **Date:** 2026-06-15 · **Status:** Accepted
- **Context:** The preserved frontend components consume specific shapes (`Product` with
  `name/brand/currentPrice/discount/…`), while the DB stores normalised columns
  (`title/brandId/current_price/discount_percent/…`). The admin panel additionally needs raw
  editable fields (`asin`, `categoryId`, `isPublished`, `seoTitle`…).
- **Decision:** Public GET endpoints return a **presenter superset**: the exact frontend
  `Product`/`Category`/`Brand` fields **plus** the raw admin fields. Public components read only
  the fields they know (extras ignored); the admin panel reads the extras for editing. One
  serialiser serves both surfaces. `Decimal` columns are converted to `number` in the presenter.
- **Consequences:** Components stay unchanged (preservation constraint met); a single mapping
  layer; no second "admin detail" endpoint. Minor field duplication (`name`+`title`,
  `discount`+`discountPercent`) accepted for clarity. UI-preservation columns added to `Product`
  (`highlights`, `features`, `isTrending`, `isEditorsPick`, `dealExpiresIn`/`dealSavings`) and
  `Category.subcategories` (display labels), `Brand.rating`.
- **Alternatives:** Two serialisers (public vs admin) — more endpoints; map in the frontend client
  — pushes DB-shape knowledge into the UI layer.

## ADR-019 — Catalog API mounted at unversioned `/api/{resource}` per the Phase 2 contract
- **Date:** 2026-06-15 · **Status:** Accepted (notes deviation from ADR-013)
- **Context:** ADR-013 placed the domain API at `/api/v1`. The Phase 2 task specified the catalog
  endpoints **explicitly** as `/api/products`, `/api/categories`, `/api/brands`, `/api/search`
  (with create/update/delete on the same base path, RBAC-guarded by HTTP method).
- **Decision:** Honour the explicit contract — mount the catalog router at **`/api`** (unversioned),
  alongside the already-unversioned `/api/auth`. Public reads use `optionalAuthenticate` (so
  editors additionally see drafts/inactive rows); writes require `authenticate` + `requirePermission`
  + `requireCsrf` + `auditLogger`. Next.js rewrites proxy `/api/{products,categories,brands,search}`
  to the backend (first-party cookies for admin mutations).
- **Consequences:** Matches the requested URLs exactly; consistent with the unversioned `/api/auth`
  precedent. `/api/v1` remains for the rest of the domain API. Bulk product actions added at
  `POST /api/products/bulk` (publish/unpublish/delete); delete additionally checks `products.delete`.
- **Alternatives:** `/api/v1/...` + `/api/v1/admin/...` (consistent with ADR-013 but contradicts the
  explicit Phase 2 endpoint list).

## ADR-020 — Content schema: status enum + UI-preservation columns
- **Date:** 2026-06-15 · **Status:** Accepted
- **Context:** Phase 3 implements Authors, Guides, Comparisons. The Phase-3 spec schema is the
  authority, but the preserved frontend (`lib/types.ts` BuyingGuide/Comparison/Author) consumes a
  few fields the bare spec schema omits.
- **Decision:** (1) Guide/Comparison `status` is a Prisma **enum `ContentStatus { draft, published }`**;
  publish/unpublish/draft are explicit actions that also set `publishedAt`. (2) Added
  **UI-preservation columns** beyond the spec list so the existing UI renders unchanged (cf.
  ADR-018): `Guide.tags`; `GuideProduct.reason`/`isTopPick`; `Comparison.summary`/`prosCons`;
  `ComparisonSpec.details`. (3) `Comparison` keeps both the convenience FKs `productAId`/`productBId`
  (the 2-way UI) **and** a `ComparisonProduct` join (spec's N-product table), kept in sync on write.
  (4) Authors have no `rating` and Comparisons have no `authorId` (not in the spec domain), so the
  author page's "comparisons" tab shows recent comparisons (mirrors the prior mock) and admin author
  stats show guides/topics rather than a fabricated rating. (5) Presenters map rows → the frontend
  shapes (a superset incl. admin fields); `getGuideBySlug` backfills the embedded author's real
  published-guide count.
- **Consequences:** Components stay byte-for-byte unchanged; status is type-safe; no fabricated
  data. Slight redundancy (`productAId`/`productBId` vs `ComparisonProduct`) accepted to satisfy
  both the 2-way UI and the spec's N-product model.
- **Alternatives:** Free-string status (no integrity); store recommendation reason in JSON on the
  guide (loses the normalised join); add `authorId` to comparisons (not in the spec; deferred).

## ADR-021 — SSR via Server Component + client island; SSR data over BACKEND_ORIGIN; ISR
- **Date:** 2026-06-15 · **Status:** Accepted
- **Context:** Phase 4 needs the 6 detail routes server-rendered (data + metadata + JSON-LD in the
  initial HTML) for SEO, while **preserving the existing interactive UI** (galleries, tabs, filters,
  framer-motion). The detail pages were `'use client'` + `useEffect`-fetch.
- **Decision:** (1) **Page/island split** — `page.tsx` becomes an async **Server Component**
  (`generateMetadata` + `generateStaticParams` + data fetch + JSON-LD), and the entire existing
  interactive UI moves **verbatim** into a colocated `*-detail.tsx` **Client Component** that takes
  data via props (no fetching). UI is byte-for-byte preserved. (2) **SSR transport** — Server
  Components fetch the existing API at an **absolute `BACKEND_ORIGIN`** (the next.config rewrite is
  browser-only); requests are anonymous, so the public API returns published/active rows (correct
  for public SSR). Fetches are resilient (`try/catch → null/[]`) so `next build` succeeds even with
  the backend down (pages then render on-demand via ISR). (3) **ISR** — `export const revalidate =
  3600` + `generateStaticParams` (published slugs, paginated at the API's 100/page cap). (4) Real
  **404** via `notFound()` (replaces the prior soft-404 that returned 200). (5) Shared
  `lib/seo.ts` (metadata + JSON-LD) and `lib/format.ts` (deterministic `en-IN` number/date) keep
  output identical on server and client (no hydration mismatch).
- **Consequences:** SEO-ready HTML (data, canonical, OG/Twitter, Product/Article/Breadcrumb/Org
  JSON-LD, sitemap, robots) with the existing UI untouched; APIs/RBAC unchanged; new public
  read-path dependency on `BACKEND_ORIGIN` for SSR. Verified live (82 build pages, 6 routes SSG/ISR).
- **Alternatives:** Direct Prisma calls from Next (couples the frontend to the DB + a second Prisma
  client — rejected; keeps API as the single contract); keep pages client-only (no SEO — rejected);
  full static export (no ISR/freshness — rejected).

## ADR-022 — Affiliate redirect on the Express backend (`/go`); privacy-safe async logging
- **Date:** 2026-06-15 · **Status:** Accepted
- **Context:** The affiliate system needs a fast `/go/{asin}` redirect (FR-044, <100ms), click
  tracking (FR-046), an amazon.in whitelist (FR-049 / NFR-SEC-008), and IP/UA privacy (NFR-SEC-007),
  while preserving the existing UI/SSR.
- **Decision:** (1) The redirect lives on the **Express backend** at root `/go/:asin`; a Next rewrite
  `/go/:path*` proxies the browser request and transparently returns the 302. This keeps all affiliate
  logic server-side (single source) and fast (in-process). (2) The target URL is **always built from
  the ASIN + the (whitelisted) configured domain + associate tag** — never from arbitrary stored
  URLs — so it is **whitelist-safe by construction** (open-redirect-proof; invalid ASIN → fallback to
  the site). (3) `AffiliateSettings` is a singleton with a 60s in-memory cache → no awaited DB on the
  hot path. (4) Click logging is **fire-and-forget after the 302** and **privacy-safe**: only
  SHA-256(ip) / SHA-256(ua) are stored, plus coarse device type + country; hashes are never exposed by
  the API. (5) Storefront CTAs point to `/go/{asin}?src=…` with `rel="nofollow sponsored"` (FTC/SEO
  compliance) — visually identical. (6) Revenue CSV import is accepted as a **JSON `{ csv }` body**
  (client reads the file via `FileReader`) — no `multer`/multipart dependency.
- **Consequences:** A real, compliant affiliate engine with no PII at rest and no UI redesign; the
  storefront link target changed (invisible) from the raw amazon URL to the tracked `/go` path.
  Conversions/revenue come from imported Amazon Associates CSVs (no live order API).
- **Alternatives:** Redirect as a Next route handler (more hops, splits logic — rejected); store/honour
  arbitrary affiliate URLs (open-redirect risk — rejected); multipart upload via multer (extra dep —
  rejected); log clicks synchronously (slows the redirect — rejected).

## ADR-023 — Import jobs via an inline-vs-BullMQ queue driver
- **Date:** 2026-06-15 · **Status:** Accepted
- **Context:** The Import Center (FR-015…021) needs background processing for CSV/ASIN/category
  imports with progress, retry, and failure/completion handling (a BullMQ + Redis queue per the
  spec). But the test harness (embedded Postgres, no Redis) and local dev must run imports without a
  Redis dependency, and integration tests need a **deterministic, awaited** result (assert the job is
  `completed` immediately after the POST).
- **Decision:** A single `QUEUE_DRIVER` env (`inline` | `bullmq`, default `inline`). `dispatchImport
  (jobId, type)` branches: **inline** → `await processImportJob(jobId)` in-process (no Redis; the POST
  returns a finished job); **bullmq** → dynamic-import the BullMQ layer and `getImportQueue(type).add`
  (attempts 3, exponential backoff). The actual work lives in **one** `processImportJob` used by both
  paths and by the 3 BullMQ workers (`csv/asin/category-import.worker.ts`), so behaviour is identical
  regardless of driver. Workers are started from `jobs/worker.ts` and shut down gracefully. BullMQ/
  ioredis are only imported when the driver is `bullmq`, so inline runs pull in no Redis client.
- **Consequences:** Tests + dev are zero-infra and deterministic; production gets a real distributed
  queue by setting `QUEUE_DRIVER=bullmq` + running the worker process — no code change. One processor
  is the single source of truth for import semantics (progress, dedup, report). Mirrors the existing
  rate-limit driver pattern (memory vs Redis).
- **Alternatives:** Always-BullMQ (forces Redis in CI/dev, and tests would have to poll for async
  completion — rejected); a fake/in-memory BullMQ shim (extra surface, drifts from real behaviour —
  rejected); process imports synchronously inside the request with no job abstraction (no retry/
  progress/large-file support — rejected).

## ADR-024 — AI provider abstraction with an offline mock driver + review-before-index gate
- **Date:** 2026-06-15 · **Status:** Accepted
- **Context:** The AI content engine (FR-050…055, spec §10) needs queue-based generation across
  multiple providers (Claude primary / OpenAI fallback / Gemini), cost/token logging (FR-055), and a
  guarantee that AI content is reviewed before it can be indexed (FR-052, §4.6). But CI/dev have no
  provider API keys and must run the full engine deterministically, and unreviewed AI output must never
  reach public fields.
- **Decision:** (1) A **provider abstraction** (`services/ai/providers.ts`) behind a single `generate()`
  call. `AI_DRIVER=mock` (default) produces deterministic, zero-cost content **offline** — used in dev/
  test/CI; `live` calls Anthropic → OpenAI → Gemini REST APIs in `AI_PRIMARY_PROVIDER`-first order with
  ordered fallback. Cost is computed from a per-model price table. This mirrors the inline-vs-bullmq
  (ADR-023) and memory-vs-Redis rate-limit driver patterns. (2) Generation is **two-phase with a review
  gate**: the processor stores the validated result on the `AiQueue` row as `done` + `approved=false`
  and writes an `AiLog`; the content is applied to the entity **only** on an explicit `POST /api/ai/
  queue/approve/:id` (`ai.manage`), which is the single code path that mutates public fields. Unreviewed
  output therefore cannot be indexed. (3) **Quality validation** (§10.5) runs before a job can be `done`
  — JSON shape for pros/cons/faq, length bounds, and placeholder/refusal guards; a failure logs a
  `failed` AiLog and marks the job for retry. (4) Job processing reuses the ADR-023 inline/bullmq queue
  driver + a dedicated `ai-generation` worker (concurrency `AI_CONCURRENCY`, default 4 — FR-051).
- **Consequences:** The whole engine — queue, prompts, validation, cost logging, approval — is testable
  with zero external dependencies and is deterministic in CI; production switches to real providers via
  env only. The review gate is structurally enforced (one apply path), satisfying §4.6 without per-call
  policy checks. Prompt templates are admin-editable Settings rows (FR-054) with built-in defaults.
- **Alternatives:** Call providers directly from controllers (no fallback, no testability — rejected);
  apply AI content immediately and rely on `isPublished` alone (no review of the *content*, violates
  §4.6 intent — rejected); a single hard-coded provider (fails FR-053 — rejected); fake provider HTTP in
  tests via network mocks (brittle, drifts from real shapes — rejected in favour of the explicit driver).

## ADR-025 — Analytics: first-party privacy-safe tracking + offline-mock external provider abstraction
- **Date:** 2026-06-15 · **Status:** Accepted
- **Context:** Phase 8 needs a real analytics engine (spec §13) — dashboards, product/search/revenue/AI/
  content analytics, reporting APIs — over the existing event sources plus new page/entity view tracking.
  Constraints: privacy-safe (no raw IP, NFR-SEC-007), CI must run with no external credentials, all
  existing UI/cards/layout preserved, and all write operations JWT+RBAC+CSRF+audited.
- **Decision:** (1) **First-party tracking via an invisible beacon.** A `<AnalyticsBeacon>` client
  component that renders `null` is mounted in the existing detail islands and POSTs to a public,
  validated, rate-limited `POST /api/analytics/collect`. Because it renders nothing, the existing UI/
  colors/layout are untouched. The collector hashes the IP (`sha256`) server-side and stores **only**
  the hash; the events presenter never returns it. The public endpoint accepts **view/search events
  only** — privileged events (clicks, AI, revenue, imports) are recorded server-side from their trusted
  flows, so they can't be forged. This public beacon is intentionally unauthenticated (a page-view
  beacon cannot carry an admin JWT); the JWT+RBAC+CSRF+audit mandate applies to the **reporting/admin**
  writes (report generate/delete), which are fully guarded. (2) **Offline-mock external provider
  abstraction** (PostHog/GA4/GSC) mirroring ADR-023/024: `ANALYTICS_DRIVER=mock` (default) makes every
  adapter a no-op (nothing leaves the process — CI-safe); `live` forwards only to providers whose
  credentials are present. First-party DB analytics never depend on external providers, so the dashboards
  are real regardless of driver. (3) **One report path**: `generateReport` builds a snapshot consumed by
  both the on-demand API (`reports.manage`) and the BullMQ analytics worker (daily/weekly/monthly +
  cleanup), reusing the ADR-023 inline/bullmq driver.
- **Consequences:** Real, privacy-safe analytics with zero UI change and zero external dependency in CI;
  production can enable GA4/PostHog/GSC by setting credentials + driver. The dashboard cards keep their
  exact design — fabricated trend percentages are replaced by **real** intra-period deltas.
- **Alternatives:** GA4-only client tracking (couples dashboards to an external account, unavailable in
  CI — rejected); server-side view tracking in the catalog/content GET handlers (ISR caching would
  severely undercount, and it edits existing APIs — rejected); requiring auth on the beacon (impossible
  for anonymous page views — rejected); a visible analytics widget (violates UI preservation — rejected).

## ADR-026 — Marketing Center as a beyond-spec feature: reuse the email provider + double opt-in + first-party tracking
- **Date:** 2026-06-15 · **Status:** Accepted
- **Context:** Phase 9 implements a Marketing & Communication Center (newsletter, subscribers, campaigns,
  automation). Unlike Phases 1–8, this is **not in the base blueprint** — FR-001…070 contain no
  marketing requirements; only a mock `/admin/marketing` UI existed (03 audit). So there is design
  freedom, but it must integrate coherently and preserve the UI. Email/CI must work with no provider
  keys, and subscriber data must be privacy- and compliance-safe (double opt-in, one-click unsubscribe).
- **Decision:** (1) **Reuse the existing email provider abstraction** (ADR-015: Resend when
  `RESEND_API_KEY` is set, else a console fallback) for marketing sends — no second integration, and
  offline/CI works out of the box. A thin `sendMarketingEmail` adds per-recipient success tracking
  (delivered vs failed) on top of the fire-and-forget auth mailer. (2) **Double opt-in by default**
  (`NEWSLETTER_DOUBLE_OPT_IN`): subscribe creates a `pending` subscriber + emails a confirmation link;
  only confirming makes them `active`. The verification token is stored **hashed (SHA-256)**; the
  unsubscribe capability token enables **one-click unsubscribe** (CAN-SPAM-style). Email is unique →
  dedup. (3) **First-party open/click tracking** via a 1×1 pixel + a same-origin click-redirect (no open
  redirect), updating `CampaignRecipient` + `Campaign` counters + `EmailEvent` — no external ESP
  webhooks needed. (4) **Delivery via the existing inline/BullMQ queue driver** (ADR-023): a `marketing`
  worker handles welcome/verification/campaign-send/retry/cleanup; inline runs them in dev/test/CI.
  (5) **UI preserved**: `/admin/marketing` keeps its exact cards/tabs/charts; the Compose form and
  Campaigns table are wired to real APIs, and trend chips show real values. The out-of-scope Push
  Notifications tab is left unwired.
- **Consequences:** A real newsletter + campaign system with no new external dependency, offline-testable,
  privacy/compliance-aware, and visually unchanged. Because it is beyond-spec, it adds **no** FR coverage
  to the blueprint compliance number — it is tracked as an extra subsystem.
- **Alternatives:** A dedicated ESP SDK (Mailchimp/SendGrid) — extra dependency + unavailable offline,
  rejected; single opt-in only — weaker compliance, rejected (kept as a configurable fallback); ESP
  webhook-based tracking — requires a public callback + provider account, rejected in favour of
  first-party pixel/redirect; a visible marketing redesign — violates UI preservation, rejected.

## ADR-027 — Media Library: local-disk storage + sharp optimization + asset/usage split + hash dedup
- **Date:** 2026-06-15 · **Status:** Accepted
- **Context:** Phase 10 needs a production-ready Media Library — upload, optimization (webp/thumbnail/
  responsive), browse/search, replace, delete, usage tracking, unused detection. The blueprint sketches
  a polymorphic `Media` model (06 §7.10) and a CDN/object-store image pipeline (05), but there was no
  model/API/UI. CI must run with no external object store, and the existing frontend must be preserved.
- **Decision:** (1) **Storage on local disk** under `UPLOAD_DIR`, served statically at `/uploads`
  (`MEDIA_BASE_URL` prefixes the public URL). No S3/CDN dependency offline; swapping to object storage
  later is a URL-layer change. (2) **sharp** is the optimization pipeline: read dimensions, emit a
  full-size webp + a thumbnail + responsive sizes (640/1024/1600 ≤ original). SVG is stored as-is
  (vector). Optimization degrades gracefully (original is always stored). (3) **Asset/usage split**
  (refining the blueprint's inline polymorphic `Media`): `MediaAsset` is the file; `MediaUsage` links an
  asset to an (entityType, entityId, field). This cleanly powers **usage tracking** + **unused-asset
  detection** (`usages: { none: {} }`) and lets one asset be reused across many entities. (4) **Content
  hash (SHA-256)** is the unique key → **duplicate detection** (re-upload returns the existing asset) and
  stable filenames; **replace** swaps bytes under the same `id` so all references update automatically.
  (5) Uploads via **multer** memory storage (mime allow-list jpg/jpeg/png/webp/svg, size limit). (6)
  **AI/Import integration is linking-only** — `attachMediaByUrl` records usage from a `/uploads` URL;
  **no automatic image generation**. (7) **UI preserved**: a new additive `/admin/media` route + nav
  entry built in the existing admin design language — no existing screen changed.
- **Consequences:** A real, offline-testable media system (sharp runs in CI; no object store needed),
  with dedup, optimization, and accurate usage/unused tracking. Production can move files to S3/CDN by
  changing the storage + URL layer without touching callers.
- **Alternatives:** Store binaries in Postgres (bloats the DB, no CDN — rejected); require S3 in CI
  (unavailable offline — rejected); inline polymorphic `Media` per the blueprint (harder usage/unused
  queries, no asset reuse — refined into asset+usage); client-side optimization (untrusted, inconsistent
  — rejected in favour of server-side sharp); AI image generation (explicitly out of scope — rejected).

## ADR-028 — Discovery: unified search-index table + weighted/fuzzy/synonym search; rule-weighted recommendations; review-only internal links
- **Date:** 2026-06-15 · **Status:** Accepted
- **Context:** Phase 11 needs advanced search (full-text, fuzzy, synonyms, weighted, across 6 entity
  types), a production-ready recommendation engine, and internal-linking automation — all DB-backed,
  testable on the embedded-Postgres harness, and preserving the existing UI. The catalog search was a
  basic `contains`; there were no tsvector columns and no extensions guaranteed in the test DB.
- **Decision:** (1) **A unified `SearchIndexEntry` table** denormalises every searchable entity
  (product/category/brand/guide/comparison/author) into title/body/keywords/boost. Advanced search runs
  against this one table: tokenise → **synonym-expand** (`SearchSynonym`) → match → **score** in JS
  (field weights × entry boost × hit count + a **fuzzy** bounded-Levenshtein near-miss bonus), then
  group + suggest (**did-you-mean** for zero results) + **trending** (from `SearchQuery`). This is
  genuinely DB-backed + unified + weighted **without** requiring Postgres `tsvector`/`pg_trgm`
  extensions — portable and extension-free (tsvector/GIN is a noted future optimization). A worker (or
  the seed) rebuilds the index. (2) **Recommendations** blend category / brand / price-proximity /
  rating / **trending (recent ProductView)** / **affiliate-performance (recent AffiliateClick)** signals,
  weighted by admin-configurable `RecommendationRule`s; outputs reuse the catalog/content presenters so
  the **public SSR pages consume them with no shape change** (the related-content sections are swapped to
  real recommendations with a graceful fallback). (3) **Internal links are suggestions only** —
  `generateSuggestions` writes `InternalLink` rows (status `suggested`) with generated anchor text;
  nothing is auto-inserted into content (review → approved/rejected), and `detectBrokenLinks` flags
  internal `/type/slug` links whose target no longer exists. (4) Jobs run via the inline/BullMQ driver
  (ADR-023). (5) **UI preserved**: a new additive `/admin/search` admin screen + nav; public pages keep
  their exact layout (recommendations swap into existing sections; search trending uses real data).
- **Consequences:** Real, offline-testable discovery (search/recommendations are DB-backed and verified
  against embedded Postgres), configurable via rules + synonyms, with internal-linking kept safe
  (review-gated). No visual redesign; the search index adds a rebuild step (seed + worker).
- **Alternatives:** Postgres FTS (`tsvector` + GIN) — best at scale but needs migrations/extensions and
  is heavier to test; deferred as an optimization. `pg_trgm` similarity — extension not guaranteed in the
  embedded test DB; replaced by JS Levenshtein. Auto-inserting internal links — rejected (review
  required). Per-call live recommendation compute without an index — fine for current scale; a recalc/
  cache hook exists for later.

## ADR-029 — Production deployment topology: standalone Next image + 5-service compose + one-shot migrate
- **Date:** 2026-06-15 · **Status:** Accepted
- **Context:** Phase 12 (final) needs the platform deployable without new features or UI/framework changes.
  The backend already had a Dockerfile + a dev compose (Postgres/Redis/api/worker) + health probes + zod
  env validation; the frontend had no image, there was no production compose with the web tier or a
  migrate step, and the env examples were stale.
- **Decision:** (1) **Frontend image** uses Next.js `output: 'standalone'` (a slim self-contained
  `server.js` + minimal `node_modules`), built from the repo root `Dockerfile`. (2) **`docker-compose.
  prod.yml`** declares the full **5-service** topology — Postgres, Redis, the Express **api**, the BullMQ
  **worker**, and the Next **web** — plus a **one-shot `migrate`** service that runs `prisma migrate
  deploy && tsx prisma/seed.ts` and must complete before api/worker start (`depends_on:
  service_completed_successfully`). Media uploads persist on a **named volume** mounted into both api +
  worker at `UPLOAD_DIR`; the worker runs with **`QUEUE_DRIVER=bullmq`** so jobs actually process.
  Secrets come from `--env-file .env.production` (never committed). (3) **Env contract** is documented in
  three example files (`server/.env.example` expanded to every current var, root `.env.example` for the
  frontend `BACKEND_ORIGIN`, `.env.production.example` for prod secrets) + a production `README`. (4)
  **CI** gains a frontend typecheck+build job alongside the existing DB-backed backend job. (5) The
  existing hardening (env validation, secure cookies, CORS, CSRF, rate limits, Helmet/CSP, size limits,
  central error handling, structured logs + request IDs, audit logging, AES-GCM secrets, `/healthz` +
  `/readyz`) is **kept as-is** — verified, not modified.
- **Consequences:** A reproducible `docker compose -f docker-compose.prod.yml --env-file .env.production
  up -d --build` brings up the whole stack with migrations + seed applied automatically; uploads survive
  restarts; the worker processes real queues. No application code or UI changed. External integrations
  (live PA-API / GA4 / GSC / Indexing API) + cloud ops (CDN/WAF/managed DB/k8s) remain a hosting concern.
- **Alternatives:** Single mega-container (couples web/api/worker, no horizontal scale — rejected); run
  migrations inside the API entrypoint (races across replicas — replaced by the one-shot migrate service);
  bake secrets into the image (insecure — rejected for `--env-file`); `next start` without standalone
  (larger image, ships full `node_modules` — rejected).

---

<!-- TEMPLATE:
## ADR-00X — <title>
- **Date:** YYYY-MM-DD · **Status:** Proposed|Accepted|Superseded by ADR-00Y
- **Context:** …
- **Decision:** …
- **Consequences:** …
- **Alternatives:** …
-->
