# Phase 2 — Brand Coverage Report

> Brand entity surface (DB → API → UI) and test coverage. Date: 2026-06-15.

---

## 1. Data model (`brands`)

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | cuid | string PK |
| name | string | |
| slug | string **unique** | auto-generated + de-duplicated |
| logo | string | |
| description | text | |
| website | string | |
| seoTitle / metaDescription | string | |
| rating | float | average display rating (UI preservation) |
| isActive | bool | |
| createdAt / updatedAt | timestamps | |

Indexes: slug, isActive. **productCount** is **computed** (published products with this brand) at
read time. Deleting a brand keeps its products and **unlinks** them (`brandId` → NULL via the FK).

## 2. API

| Endpoint | Auth | Behaviour |
| -------- | ---- | --------- |
| `GET /api/brands` | public (optional auth) | `status=active|all`, `q`; ordered by name; live `productCount` |
| `GET /api/brands/:slug` | public | inactive 404 for public, visible to `brands.view` |
| `POST /api/brands` | `brands.create` + CSRF + audit | slug auto-unique |
| `PUT /api/brands/:id` | `brands.edit` + CSRF + audit | partial |
| `DELETE /api/brands/:id` | `brands.delete` + CSRF + audit | products kept, unlinked |

## 3. Frontend

- **Public `brands`** — grid of all active brands via `listBrands()`; existing brand tiles
  unchanged.
- **Public `brands/[slug]`** — brand hero (name/description/rating/productCount) + product grid via
  `listProducts({brand})`. No restyle.
- **Admin `/admin/brands`** — brand cards grid with search; create/edit drawer (name/slug/
  description/website/rating/status); delete with confirm; the **profile drawer** now shows the
  brand's real **top products** (fetched via `listProducts({brand, sort:popularity})`) and links to
  the live public page.

## 4. Requirements satisfied

Brand landing + brand-filtered product listing → ✅; brand CRUD (spec §15 admin catalog) ✅;
brand→product relationship with safe unlink-on-delete ✅.

## 5. Test coverage

**Unit:** `presenters.test.ts` (brand mapping + rating + product count). **Integration:** list
(≥8 seeded), get-by-slug (`apple` → "Apple"), filter products by brand (all belong to brand),
admin create → update (description) → delete.

## 6. Gaps / follow-ups

`rating` is a stored display value (seeded from the mock), not yet recomputed from product ratings
— a future aggregate. Logo is a URL (no upload pipeline — media phase). "Page Views" analytics on
the admin profile drawer is deferred to the analytics phase (the placeholder tile was removed in
favour of real product links).
