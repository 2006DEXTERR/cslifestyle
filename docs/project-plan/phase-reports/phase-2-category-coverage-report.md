# Phase 2 — Category Coverage Report

> Category entity surface (DB → API → UI) and test coverage. Date: 2026-06-15.

---

## 1. Data model (`categories`)

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | cuid | string PK |
| parentId | FK→categories? | self-reference (hierarchy); `SetNull` on parent delete |
| name | string | |
| slug | string **unique** | auto-generated + de-duplicated |
| description | text | |
| image | string | |
| icon | string | lucide icon name (e.g. `Smartphone`) |
| seoTitle / metaDescription | string | |
| subcategories | json (string[]) | display labels — preserves the existing UI chips |
| isActive | bool | |
| sortOrder | int | |
| createdAt / updatedAt | timestamps | |

Indexes: parentId, slug, (isActive, sortOrder). **productCount** is **computed** (count of
published products) at read time — not stored — so it always reflects reality.

## 2. API

| Endpoint | Auth | Behaviour |
| -------- | ---- | --------- |
| `GET /api/categories` | public (optional auth) | `status=active|all`, `parent=root|all`, `q`; ordered by sortOrder then name; each carries the live `productCount` |
| `GET /api/categories/:slug` | public | inactive 404 for public, visible to `categories.view` |
| `POST /api/categories` | `categories.create` + CSRF + audit | parent validated; slug auto-unique |
| `PUT /api/categories/:id` | `categories.edit` + CSRF + audit | partial; rejects self-parenting |
| `DELETE /api/categories/:id` | `categories.delete` + CSRF + audit | **409** if it still has products or sub-categories (spec §8.3) |

## 3. Frontend

- **Public `categories`** — grid of all active categories via `listCategories()` (existing
  `CategoryCard`, unchanged).
- **Public `categories/[slug]`** — category header + product grid; the existing client-side price/
  rating filters, sort, grid/list toggle, and mobile filter drawer are **preserved**, now operating
  on DB products fetched via `listProducts({category})`. (Buying-guides section stays mock-backed —
  guides are out of scope.)
- **Admin `/admin/categories`** — hierarchical **tree** rebuilt from `parentId`, expand/collapse,
  search, status badges, live product counts; create/edit drawer (name/slug/parent/description/
  status/order); delete with the 409 guard surfaced to the user.

## 4. Requirements satisfied

FR-007 (category landing + product listing) → ✅ behaviourally; category CRUD with the
"no-delete-while-non-empty" rule (spec §8.3) ✅; hierarchy via `parentId` ✅.

## 5. Test coverage

**Unit:** `presenters.test.ts` (category mapping + product count + subcategories). **Integration:**
list (≥10 seeded, carries productCount + subcategories), get-by-slug, admin create → add product →
**delete blocked (409)** → remove product → delete succeeds.

## 6. Gaps / follow-ups

The seed models the 10 mock categories as flat top-level rows (their mock `subcategories` are kept
as display labels, not full child rows); deep multi-level trees are supported by the schema/admin
but not seeded. No category-level SEO landing SSR yet (SEO phase). `productCount` counts published
products only.
