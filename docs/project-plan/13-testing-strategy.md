# 13 — Testing Strategy

> Re-expresses spec §18 (PHPUnit/Pest) for the **Node/Express/TS + Next.js** stack. Current
> state: **no tests, no CI**. Quality gates apply from Phase 0.

---

## 1. Test pyramid & tools

| Layer | Tool | Scope |
| ----- | ---- | ----- |
| Unit | **Vitest** (or Jest) | services, engines (AffiliateLinkService, AI prompt render, ASIN regex, SigV4, revenue math, schema generators) |
| Integration / API | **Supertest** + Vitest against Express + test Postgres | endpoint contracts, auth/RBAC/2FA, envelope shape, validation, `/go` behaviour |
| DB | Prisma + ephemeral Postgres (Docker/testcontainers) | migrations up/down, constraints (ASIN unique), seed idempotency |
| Frontend component | **React Testing Library** | preserved components render with API-shaped props |
| E2E | **Playwright** | critical journeys: product→/go→Amazon, search, guide render, admin login+2FA+CRUD |
| Load | **k6** (per spec §18.5) | homepage/product/`/go` under ramp to 500 VUs |
| SEO/structured-data | custom assertions + Rich Results validation | JSON-LD, canonical, sitemap validity |

## 2. Mirrored spec §18 tests (ported to TS)

- **Affiliate (§18.2/18.3/18.7):** `buildAmazonUrl` contains ASIN + `tag=<partner>` + amazon.in;
  `/go/{slug}` logs click with correct `source`; `/go` returns **302** with amazon.in Location;
  `rel="nofollow sponsored"`/`noopener`; disclosure visible on guide/comparison; IP stored
  hashed (not plaintext).
- **Product page (§18.3):** loads 200, shows title + "Buy on Amazon" + disclosure; emits
  `"@type":"Product"` and `"@type":"Offer"` JSON-LD.
- **SEO (§18.4):** every published product has meta title ≤60 chars; product page has canonical;
  `/search` pages noindex; robots disallows `/go/`.
- **Load (§18.5):** thresholds p95<2000ms, error rate <1%, status 200, contains product grid.

## 3. Coverage targets & gates

- Services/engines: **≥80%** line coverage. Controllers/routes: contract-tested (happy + key
  failure paths). Security middleware: positive **and** negative (role escalation, missing/invalid
  token, expired session, 2FA bypass attempt).
- **CI gate (every PR):** typecheck (`tsc --noEmit` both packages) + lint + unit + API/integration
  must pass; migrations must apply cleanly; no `npm audit` high/critical without waiver.
- E2E + k6 run pre-release (Phase 11) and on tagged builds.

## 4. Test data & isolation

- Factories/builders for Product/Category/Guide/User. Each integration test runs against a
  fresh schema (migrate + truncate) or transaction rollback. External services (PA-API, Claude,
  GA4, GSC) are **mocked** at the client boundary; contract fixtures captured from real responses.

## 5. Per-phase testing requirements (summary; details in `09`)

| Phase | Must-have tests |
| ----- | --------------- |
| 0 | boot + healthcheck; CI green |
| 1 | migration up/down; seed idempotent; ASIN unique |
| 2 | read API contracts; page SEO (title/canonical/JSON-LD); visual parity |
| 3 | `/go` 302 + whitelist + IP hash + click log (spec §18.7) |
| 4 | ASIN regex/dup; SigV4 (mocked); importer idempotency; scheduler tiers |
| 5 | provider mock; prompt render; validation; approval gates indexing |
| 6 | search relevance; autocomplete latency; query logged |
| 7 | auth/2FA/RBAC pos+neg; audit entries; CRUD round-trips |
| 8 | sitemap validity/pagination; redirect 301; canonical; `/go` noindex |
| 9 | GA4 payloads; GSC upsert; revenue math |
| 10 | comparison detector query; schedule firing; dedup |
| 11 | k6 thresholds; Lighthouse ≥90/95; security review |

## 6. Manual & compliance checks

- Spec §18.7 affiliate checklist run before any affiliate-affecting release.
- `/security-review` skill on PRs touching auth, `/go`, settings-secrets, or AI HTML rendering.
- Accessibility (WCAG 2.1 AA, spec §6.8) spot-checks on preserved components after wiring.

## 7. Open items → `12`
Vitest vs Jest (lean Vitest). testcontainers vs docker-compose test DB. Visual-regression tool
(Playwright screenshots) for "preserve UI" guarantee — recommended to lock the preservation
constraint objectively.
