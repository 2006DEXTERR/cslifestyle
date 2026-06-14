# 01 — Project Overview

> **Status:** Planning baseline established · **Last updated:** 2026-06-14
> **This directory is the project's permanent memory.** Read `10-phase-tracker.md`,
> `11-progress-log.md`, and `15-compliance-report.md` at the start of every working session.

---

## 1. What this project is

**CSLifestyle.in** is an AI-powered, SEO-first Amazon affiliate commerce platform for the
Indian market. It operates a **zero-inventory, zero-logistics** model: revenue comes purely
from Amazon Associates affiliate commissions earned when visitors click out to Amazon.in and
purchase. The site is the discovery/trust layer between Google organic search and Amazon's
checkout.

The product surface is:
- **Programmatic SEO content** — products, category/subcategory pages, buying guides,
  head-to-head comparisons, brand pages, author pages, deals.
- **AI content engine** — generates product descriptions, pros/cons, FAQs, guides,
  comparisons, meta tags at scale, with human review before publish.
- **Affiliate engine** — cloaked `/go/{asin}` redirects, click tracking, compliance controls,
  scheduled price/rating sync via Amazon PA-API 5.0.
- **Admin panel** — full management of products, content, SEO, AI queue, affiliate analytics,
  users/roles, settings.

## 2. Source of truth (strict precedence)

1. **`CSLifestyle_V2_Blueprint.pdf`** — the 83-page Enterprise Master Blueprint (V2.0.0).
   Absolute source of truth. Broken down in `02-specification-breakdown.md`.
2. **The existing GitHub repository** (`2006DEXTERR/cslifestyle`).
3. **The existing Next.js UI.**

**If the repo and the specification differ, the specification wins** — *except* where the user
has issued an explicit overriding constraint (see §4). Those constraints supersede the spec.

## 3. Hard architecture mandate (from the user)

The blueprint prescribes a **Laravel 12 / PHP 8.4 / MySQL** stack. **We deliberately diverge.**
The user requires:

| Concern        | Blueprint says            | We build (mandated)                 |
| -------------- | ------------------------- | ----------------------------------- |
| Backend        | Laravel 12 (PHP 8.4)      | **Node.js + Express + TypeScript**  |
| Database       | MySQL 8.0                 | **PostgreSQL**                      |
| ORM/data       | Eloquent ORM              | **Prisma**                          |
| Frontend       | Blade + Alpine + HTMX     | **Existing Next.js App Router (preserve)** |
| Cache/queue    | Redis + Horizon           | Redis + a Node queue (BullMQ)       |

- **Do NOT use Laravel. Do NOT use PHP.** Any spec text naming Laravel/Blade/Eloquent/Horizon/
  Artisan is treated as *intent* to be re-expressed in the Node/Express/Prisma idiom, never as
  a literal instruction.
- All spec functional behaviour (FR-001…FR-070, NFRs, schemas, workflows) still applies — only
  the implementation technology changes.

## 4. Non-negotiable user constraints

- Final project must match the specification **as closely as possible** (behaviour & features),
  given the stack divergence above.
- Backend MUST be **Node.js + Express + TypeScript**.
- Database MUST be **PostgreSQL + Prisma**.
- **Do NOT migrate the frontend.** Preserve the existing **Next.js App Router** frontend.
- Preserve existing **routes** wherever possible.
- Preserve existing **UI, design system, components, colors, responsiveness, and layouts.**
- Build all missing functionality **on top of** the current implementation.

### Consequence: design-system precedence
The existing UI uses a monochrome base + **pink→red→orange→yellow** brand gradient
(`--brand-pink #E91E8F`, `--brand-red #FF4D4D`, `--brand-orange #FF7A00`, `--brand-yellow
#FFC107`), dark-mode capable. The blueprint (§6) prescribes a **blue `#1a56db` / green
`#16a34a`** palette. **The user's "preserve existing colors" instruction overrides the spec
palette.** We keep the current palette and log it as an intentional, sanctioned deviation in
`15-compliance-report.md`. We do **not** repaint the UI to blue/green.

## 5. Target end-state (one paragraph)

The preserved Next.js frontend, re-pointed from the in-memory `lib/data.ts` mock to a typed API
client, served by a new standalone **Express + TypeScript** backend exposing the spec's REST
surface (`/api/v1/...`), backed by **PostgreSQL via Prisma** with a schema mirroring spec
Section 7. The backend hosts the Amazon affiliate engine (PA-API sync, `/go/{asin}` cloaked
redirects, click tracking), the AI content engine (queue workers + provider abstraction with
Claude as primary), SEO infrastructure (sitemaps, robots, schema JSON-LD, redirects), auth
(JWT + RBAC + TOTP 2FA), and analytics aggregation. The admin panel's mock screens become wired
to real endpoints. SEO gaps (sitemap, robots, canonical, JSON-LD, `generateMetadata`,
`generateStaticParams`) are filled on the Next.js side.

## 6. Repository facts (as audited 2026-06-14)

- Next.js **13.5.1**, App Router, React 18.2, TypeScript 5.2, Tailwind 3.3 + shadcn/ui.
- 113 tracked files; 48 are shadcn `components/ui/*` primitives.
- **22 public routes** + **16 admin pages**, almost all `"use client"`, all driven by mock data.
- `@supabase/supabase-js` is a dependency but **completely unused** (vestigial).
- **No backend, no API routes (`app/api/**`), no Prisma, no DB, no auth, no `.env`** — total
  greenfield for server-side work.
- Deploy target today: **Netlify** (`netlify.toml`).

Full detail in `03-current-state-audit.md`.

## 7. How to use this planning system

| File | Purpose |
| ---- | ------- |
| 01 overview | This file — orientation & constraints |
| 02 spec breakdown | Spec distilled into trackable requirements (FR/NFR) |
| 03 current-state audit | Exhaustive audit of what exists today |
| 04 gap analysis | Requirement-by-requirement Implemented / Partial / Missing |
| 05 architecture | Target system architecture (monorepo, services, data flow) |
| 06 database design | Prisma schema mapped from spec §7 |
| 07 API design | Express REST surface mapped from spec §8 |
| 08 security design | Auth, RBAC, 2FA, rate limiting, compliance |
| 09 feature roadmap | Capability-level roadmap |
| 10 phase tracker | **Live** phase status board — update every phase |
| 11 progress log | **Append-only** chronological log — update every phase |
| 12 decisions log | **Append-only** ADR-style decisions — update on every decision |
| 13 testing strategy | Test pyramid, coverage targets, gates |
| 14 deployment strategy | Hosting, CI/CD, envs, migrations |
| 15 compliance report | **Live** compliance % + missing features/APIs/models/workflows |

**Rule:** Do not begin implementation until all 15 planning files are created and filled
(done as of 2026-06-14). After every future phase, update 10, 11, 12, and 15 at minimum.
