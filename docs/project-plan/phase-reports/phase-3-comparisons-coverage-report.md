# Phase 3 — Comparisons Coverage Report

> Comparison entity surface (DB → API → UI) and test coverage. Date: 2026-06-15.

---

## 1. Data model (`comparisons` + `comparison_specs` + `comparison_products`)

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | cuid | string PK |
| slug | string **unique** | auto-generated + de-duplicated |
| title / excerpt | string / text | |
| summary | text | UI preservation |
| prosCons | json | `{ productA:{pros,cons}, productB:{pros,cons} }` (UI preservation) |
| productAId / productBId | FK→products | the 2-way comparison |
| verdict | text | |
| winner | string | 'A' \| 'B' \| 'tie' |
| seoTitle / metaDescription | string | |
| status | enum `ContentStatus` | draft / published |
| publishedAt | datetime? | |
| createdAt / updatedAt | timestamps | |

**`comparison_specs`** (id, comparisonId, specName, productAValue, productBValue, winner, details,
position) — the comparison matrix rows. **`comparison_products`** (comparisonId+productId PK,
position) — the spec's N-product join, kept in sync with A/B on write. Indexes: slug,
(status, publishedAt), productAId, productBId.

## 2. API

| Endpoint | Auth | Behaviour |
| -------- | ---- | --------- |
| `GET /api/comparisons` | public (optional auth) | pagination, sort, status filter, search `q`; products included for cards |
| `GET /api/comparisons/:slug` | public | products + specs matrix + prosCons + verdict; drafts 404 for public |
| `POST /api/comparisons` | `comparisons.create` + CSRF + audit | validates both products exist + **distinct (400)**; syncs specs + product join |
| `PUT /api/comparisons/:id` | `comparisons.edit` + CSRF + audit | partial; re-syncs specs; rebuilds product join if A/B change |
| `DELETE /api/comparisons/:id` | `comparisons.delete` + CSRF + audit | cascades specs + join |
| `POST /api/comparisons/:id/{publish,unpublish,draft}` | `comparisons.publish` + CSRF + audit | status transitions |

## 3. Frontend

- **Public `/comparisons`** — grid via `listComparisons` (existing `ComparisonCard`).
- **Public `/comparisons/[slug]`** — head-to-head product cards (winner ring), category breakdown
  (from specs), per-product pros/cons (from prosCons), verdict, related comparisons — all DB-backed.
- **Admin `/admin/comparisons`** — table (products compared, winner, status, updated) with
  **search + status filter**; row actions **publish/unpublish, preview, edit, delete**; builder
  drawer with the six required tabs: **General** (title/slug/excerpt/summary), **Product Picker**
  (A/B selects), **Specs Matrix** (repeater: name/A-value/B-value/winner/details), **Verdict**
  (verdict + winner + per-product pros/cons), **SEO**, **Preview** (live summary + public link).
  Footer **Save Draft / Publish**.

## 4. Requirements satisfied

Comparison CRUD ✅; publish/unpublish/draft ✅; product A/B selection ✅; specs matrix ✅;
verdict + winner + pros/cons ✅; search/filter ✅; RBAC + audit + Swagger ✅; identical-product
guard (400) ✅.

## 5. Test coverage

**Unit:** `content-presenters` — product mapping, **prosCons normalisation**, **spec ordering by
position** into `categories`. **Integration (vs real Postgres):** seeded list, get-by-slug with
products + specs, admin create (with specs + prosCons) → published visible → delete,
identical-products 400, 401/403/CSRF guards.

## 6. Gaps / follow-ups

2-way comparisons only on the UI (schema's `comparison_products` supports N; the spec's 2–5-product
case can extend the presenter later); pros/cons edited as comma lists; no SSR yet; view counts
deferred (analytics).
