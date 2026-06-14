# 15 — Compliance Report (LIVE)

> **The single source for the compliance number.** Recompute after every phase. Derived from
> `04-gap-analysis.md`. Baseline date: **2026-06-14** (pre-implementation).

---

## 1. Headline compliance

| Scope | ✅ Impl | 🟡 Partial | ❌ Missing | Weighted % |
| ----- | :----: | :--------: | :--------: | :--------: |
| Functional reqs (FR-001…070) | 9 | 34 | 27 | **~18%** |
| Non-functional (perf/scale/avail/sec/seo/data) | 1 (security) | 2 | 3 | **~28%** |
| Database models (spec §7 + auth, ~33 tables) | 10 | 0 | 23 | **~30%** |
| API endpoints (spec §8 + auth, ~67) | 17 | 0 | 55 | **~25%** |
| Engines/subsystems (§9–13,15,16,18) | 1 (auth/security §15) | 3 | 6 | **~13%** |
| Admin screens wired (§14) | 0 | 16 (UI) | 0 | **~15%** (UI only) |
| Frontend pages/UI (§5,6) — *preserved asset* | — | — | — | **~90% built** (+4 auth pages) |

> **Phase 1 (Auth & RBAC) deltas:** Security subsystem (§15) is now largely real — auth (JWT
> access+refresh w/ rotation+reuse-detection, bcrypt), 7-role RBAC w/ permission middleware
> (FR-056 ✅), CSRF (NFR-SEC-003 ✅), SQLi safety via Prisma (NFR-SEC-005 ✅), rate-limit/
> brute-force (NFR-SEC-006 ✅), IP hashing (NFR-SEC-007 ✅), CSP (NFR-SEC-009 ✅), admin session
> auth (NFR-SEC-001 ✅). 10 auth/security DB models live; ~17 auth/security endpoints live.
>
> **Auth Follow-Up (Phase 1a) update:** **TOTP 2FA (NFR-SEC-002) is now ✅** — full enrollment
> (QR + backup codes), two-step login challenge, AES-GCM-encrypted secrets, and an admin
> enforcement policy. Real email delivery (Resend, with console fallback) closes the email
> deferral. The full NFR-SEC set (001–007, 009) is now satisfied; only 008 (affiliate redirect
> whitelist) and 010 (WAF) remain for their respective later phases.

> **Scoring convention:** ✅ = 1.0, 🟡 = 0.33 (UI/stub, no real behaviour), ❌ = 0.
> FR weighted = (8×1.0 + 35×0.33) / 70 ≈ **0.28** of *credit*, but since 🟡 here is almost
> entirely *unwired UI* (no backend behaviour), **behavioural compliance ≈ 17%**. We report two
> numbers to avoid over-crediting mockups:
>
> - **Behavioural compliance (real, working):** **~10%** overall.
> - **Surface compliance (incl. mock UI as partial):** **~28%** overall.
>
> **Frontend visual completeness (asset to preserve): ~90%.**

**One-line status:** *Frontend ~90% visually complete and preserved; backend/engines/DB/API/auth/
SEO-infra ~0–10% real. This is a build-the-server-and-wire-it project.*

## 2. Compliance trend (update each phase)

| Date | Phase done | Behavioural % | Surface % | Notes |
| ---- | ---------- | :-----------: | :-------: | ----- |
| 2026-06-14 | Planning | ~10% | ~28% | baseline established |
| 2026-06-14 | Phase 0 | ~10% | ~29% | backend foundation only — no FR/§7/§8 behaviour yet; infra (Express/Prisma/Redis/BullMQ/Swagger/health/CI/Docker) now real |
| 2026-06-14 | Phase 1 (Auth & RBAC) | ~16% | ~34% | real security subsystem: auth+JWT+rotation, 7-role RBAC, CSRF, rate-limit, audit, 8 DB models, 10 endpoints, 4 auth pages, admin guard; 30 unit + 13 integration tests |
| 2026-06-14 | Phase 1a (2FA + Email) | ~18% | ~36% | TOTP 2FA (NFR-SEC-002 ✅) + Resend email; 10 DB models, ~17 endpoints; 51 unit + 16 integration tests |
| _next_ | Phase 1b | _tbd_ | _tbd_ | catalog schema + seed |

> **Phase 0 note:** Phase 0 is *enabling infrastructure*, not feature compliance — it does not
> move FR-001…070, spec §7 models, or spec §8 endpoints (those begin in Phases 1–2). Behavioural
> % is essentially unchanged; what changed is that the platform to build them on now exists and
> is verified (build/lint/typecheck/test/CI all green; health endpoints live).

## 3. Missing Features Report (behavioural)

**Entirely missing (❌):** PA-API import (all 5 methods, real) · AI content engine (queue,
providers, prompts, validation, review) · `/go/{asin}` redirect + click tracking + whitelist ·
price/rating/availability sync + auto-deactivate + price history · full-text search +
autocomplete + query logging · auth + 2FA + RBAC enforcement · sitemaps/robots/redirects/
canonical/breadcrumb-schema/Indexing-ping · GA4 events + GSC ingestion + revenue calc ·
auto-comparison/seasonal/trend automation · "users also viewed"/view tracking · daily link
health-check · Redis caching + WebP image pipeline.

**Present but unwired (🟡, UI only):** all 16 admin screens · import wizard · AI center · SEO
center health · analytics/affiliate dashboards · settings groups · roles matrix.

**Present & real (✅):** public page layouts, components, design system, responsiveness, INR
formatting, custom 404, basic root metadata.

## 4. Missing APIs Report

**100% of spec §8 is missing.** Build per `07`: Products (13) · Categories (6) · Guides &
Comparisons (10) · Search (3) · Affiliate incl `/go` (5) · AI (8) · SEO & Analytics (10) · Auth/
Users/Roles/Settings (§15, ~12). Public SEO files (`/sitemap*.xml`, `/robots.txt`) also missing.

## 5. Missing Database Models Report

**100% of spec §7 missing** (no DB). To build (`06`): users, roles, permissions,
role_permissions, categories, brands, products, product_price_history, guides, comparisons,
affiliate_clicks, ai_queue, ai_logs, seo, redirects, settings, audit_logs, cron_logs,
sitemap_logs, media, search_queries, search_console_metrics, revenue_reports.

## 6. Missing Workflows Report

Import→AI pipeline · tiered price-sync scheduler · rating-sync · availability/OOS + auto-
deactivate · `/go` click-event async pipeline · AI generation + quality-validation + review/
approve → publish · sitemap regeneration + Indexing ping on publish · GSC daily pull · GA4
server events · revenue estimation + Amazon CSV import · comparison-opportunity detector ·
seasonal/trend content scheduler · link health-check · cache warm/prune. **All absent.**

## 7. Sanctioned deviations (NOT counted as defects)

| Deviation | Why | Authority |
| --------- | --- | --------- |
| Backend = Node/Express/TS (not Laravel/PHP) | user mandate | `01` §3–4, ADR-002 |
| DB = PostgreSQL/Prisma (not MySQL/Eloquent) | user mandate | `01` §3, ADR-004 |
| Full-text via Postgres tsvector (not MySQL FULLTEXT) | stack | ADR-004 |
| Queue/cron via BullMQ (not Horizon/Artisan) | stack | ADR-003 |
| UI palette = existing pink-gradient (not spec blue/green §6) | user: preserve colors | ADR-005 |
| Existing routes preserved + spec aliases added (not hard URL migration) | user: preserve routes | ADR-006 |
| Frontend = Next.js (not Blade/Alpine/HTMX) | user: don't migrate FE | `01` §4 |

These satisfy spec *intent* via a different, mandated implementation. Compliance scoring treats
them as **met**, not missing.

## 8. Risks to compliance

- **PA-API access/approval** (Amazon Associates account + throughput) gates FR-001…005,015,016.
- **AI cost/limits** at content scale (spec wants 1000 jobs/hr) — needs budget caps (§14.10).
- **SEO/perf** depend on converting client pages → SSR/SSG (Phase 2) and image pipeline (Phase
  11); risk if preservation constraint is read too literally (we enhance, not redesign).
- **"Preserve UI" objectivity** — recommend visual-regression tests (`13` §7) to prove
  preservation per phase.
- **Dependency advisories (accepted, dev-only):** 5 `npm audit` findings in the
  Vitest→Vite→esbuild chain (esbuild ≤0.28.0, Deno binary-integrity). Not in the runtime/
  production image; no clean upstream fix yet. Tracked in ADR-009; re-check each phase. **0
  runtime advisories.**

## 9. How to recompute (each phase)
1. Update statuses in `04`. 2. Re-tally FR ✅/🟡/❌ and subsystem counts. 3. Update §1 table +
§2 trend row here. 4. Move items from "Missing" to "Present & real" as wired. 5. Note any new
sanctioned deviation in §7 + `12`.
