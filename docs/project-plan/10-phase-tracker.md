# 10 — Phase Tracker (LIVE)

> **Update this every phase.** Single source for "where are we". Phase definitions live in
> `09-feature-roadmap.md`. Status values: `Not started` · `In progress` · `Blocked` · `Done`.

**Current phase:** Phase 1 + Auth Follow-Up (2FA & Email) complete · **Overall implementation:** ~12%.

> **Sequencing note (ADR-010):** the user re-sequenced — "Phase 1" is **Authentication &
> RBAC** (originally roadmap Phase 7), implemented before the full catalog DB schema. The
> auth-subset of the DB schema (users/roles/permissions/sessions/tokens/audit) + RBAC seed are
> done here; the catalog tables (products/categories/guides/comparisons/brands…) remain pending
> and are covered by the renamed "Catalog schema + seed" phase below.

| # | Phase | Status | Owner | Started | Completed | Notes |
| - | ----- | ------ | ----- | ------- | --------- | ----- |
| — | Planning system | **Done** | Claude | 2026-06-14 | 2026-06-14 | 15 docs created & filled |
| 0 | Backend foundation & tooling | **Done** | Claude | 2026-06-14 | 2026-06-14 | server/ scaffold, Express, Prisma, Redis, BullMQ, Swagger, pino, zod env, health probes, Docker, CI. All gates green. See [phase-reports/phase-0-completion-report.md](phase-reports/phase-0-completion-report.md) |
| 1 | **Authentication & RBAC** (user-sequenced) | **Done** | Claude | 2026-06-14 | 2026-06-14 | JWT access+refresh w/ rotation+reuse-detection, bcrypt, TOTP-ready, 7-role RBAC (5 named + spatie-style perms), httpOnly cookies + CSRF, rate limiting/brute-force, audit log, 9 auth endpoints + Swagger, auth pages, /admin/* edge guard. 30 unit + 13 integration/RBAC tests (13/13 verified vs real Postgres). See [phase-reports/phase-1-completion-report.md](phase-reports/phase-1-completion-report.md) |
| 1a | **Auth Follow-Up: TOTP 2FA + Resend Email** | **Done** | Claude | 2026-06-14 | 2026-06-14 | TOTP (otplib) w/ QR + backup codes, AES-GCM secret encryption, two-step login challenge, admin enforcement policy (Setting); Resend email (verification + reset) w/ branded templates, retry, audit; login 2FA UI + `/account/security` page. NFR-SEC-002 ✅. 51 unit + 16 integration tests (16/16 vs real Postgres). See [phase-reports/phase-1a-completion-report.md](phase-reports/phase-1a-completion-report.md) |
| 1b | Catalog schema + seed (was "Database schema + seed") | **Next** | — | — | — | remaining spec §7 tables (products/categories/guides/comparisons/brands/etc.) → Prisma; seed `lib/data.ts` mock |
| 2 | Public read API + frontend wiring | Not started | — | — | — | SSR/SEO; repoint off mock |
| 3 | Affiliate engine | Not started | — | — | — | `/go`, click tracking, disclosure |
| 4 | Amazon PA-API import & sync | Not started | — | — | — | importers + tiered sync |
| 5 | AI content engine | Not started | — | — | — | Claude primary; prompts; review |
| 6 | Search & autocomplete | Not started | — | — | — | tsvector; `?q=`; logging |
| 7 | Auth/RBAC/2FA + admin write wiring | Not started | — | — | — | secure admin; real CRUD |
| 8 | SEO infrastructure | Not started | — | — | — | sitemaps/robots/redirects/schema |
| 9 | Analytics & revenue | Not started | — | — | — | GA4/GSC ingest; revenue calc |
| 10 | Content automation | Not started | — | — | — | auto-comparison, seasonal |
| 11 | Performance, hardening, deploy | Not started | — | — | — | NFRs; prod; backups |

## Phase completion checklist (apply to each phase before marking Done)
- [ ] All deliverables in `09` for the phase shipped
- [ ] DB migrations applied + reversible
- [ ] API endpoints contract-tested
- [ ] Frontend still preserved (UI/colors/routes intact; visual parity verified)
- [ ] Tests written & green; CI passing
- [ ] `11-progress-log.md` appended
- [ ] `12-decisions-log.md` updated for any decisions
- [ ] `15-compliance-report.md` recomputed
- [ ] This table updated (status/date/notes)

## Milestone view
- **M1 (Phases 0–2):** Real data behind the preserved UI, SEO-rendered. *Biggest SEO/quality
  unlock.*
- **M2 (Phases 3–4):** Revenue path live (affiliate) + real catalog ingestion/sync.
- **M3 (Phases 5–7):** AI content + secured, fully wired admin.
- **M4 (Phases 8–11):** SEO infra, analytics, automation, production hardening.
