# Phase 2 — Product Coverage Report

> Product entity surface (DB → API → UI) and test coverage. Date: 2026-06-15.

---

## 1. Data model (`products` + children)

| Column | Type | Notes |
| ------ | ---- | ----- |
| id | cuid | string PK (ADR-017) |
| asin | string **unique** | §4.6 ASIN uniqueness; required on create |
| categoryId | FK→categories | required |
| brandId | FK→brands? | optional; `SetNull` on brand delete |
| title / slug | string / **unique** | slug auto-generated + de-duplicated |
| shortDescription / description | string / text | |
| image | string | primary image URL |
| gallery | json (string[]) | authoring convenience; synced to `product_images` |
| specifications | json | `Record<group, Record<key,val>>` |
| highlights / features | json | UI-preservation (key highlights, feature table) |
| pros / cons / faqs | json | |
| rating / reviewCount | float / int | |
| currentPrice / originalPrice | Decimal(12,2) | money never float |
| discountPercent | int | |
| currency | string (INR) | |
| availability | string | In Stock / Limited Stock / Out of Stock / Pre-order |
| affiliateUrl | string | |
| seoTitle / metaDescription | string | |
| isPublished / isTrending / isEditorsPick | bool | publish gate + storefront flags |
| dealExpiresIn / dealSavings | string / int | optional active deal |
| createdAt / updatedAt | timestamps | |

**`product_images`** (id, productId, imageUrl, sortOrder) — normalised gallery, kept in sync on
write. **`product_price_history`** (id, productId, price, originalPrice, checkedAt) — a row is
appended on create and whenever the price changes (FR-019 groundwork).

Indexes: asin, slug, categoryId, brandId, (isPublished, categoryId), (isPublished, isTrending).

## 2. API

| Endpoint | Auth | Behaviour |
| -------- | ---- | --------- |
| `GET /api/products` | public (optional auth) | pagination (`page`/`perPage`), sort (popularity/price-low/price-high/rating/newest), filter (category, brand, minPrice, maxPrice, minRating, trending, deals, editorsPick), free-text `q`; `status=all|draft` requires `products.view` |
| `GET /api/products/:slug` | public | full detail; drafts 404 for the public, visible to `products.view` |
| `POST /api/products` | `products.create` + CSRF + audit | 409 on duplicate ASIN; slug auto-unique |
| `PUT /api/products/:id` | `products.edit` + CSRF + audit | partial update; appends price history on price change |
| `DELETE /api/products/:id` | `products.delete` + CSRF + audit | cascades images + price history |
| `POST /api/products/bulk` | `products.publish` (+`products.delete` for delete) + CSRF + audit | publish / unpublish / delete by ids |

Reads return the **presenter superset** (frontend `Product` fields + admin extras, ADR-018).

## 3. Frontend

- **Public `products/[slug]`** — fetches `getProduct(slug)` + related products via
  `listProducts({category})`. Gallery, rating, price, highlights, tabs (overview/features/specs/
  pros-cons/faqs), affiliate CTA — all from the DB. No component restyled.
- **Admin `/admin/products`** — real table (TanStack) with **search, category/brand/status
  filters, pagination, row + bulk select**; create/edit via the drawer editor (General/Images/
  Specifications/Pricing/SEO/Affiliate tabs, now controlled + validated); delete (row + bulk);
  publish/unpublish (single via editor status, bulk via toolbar).

## 4. Requirements satisfied

FR-006 (product detail), FR-008/009 (product data: specs/pros/cons/FAQs), FR-021 (listing),
FR-022 (filtering), FR-023 (sorting) → ✅ behaviourally. FR-019 (price history) — schema + capture
live; scheduled sync is the Amazon-sync phase. Manual product CRUD (spec §8.2 admin) ✅.

## 5. Test coverage

**Unit:** `presenters.test.ts` (DB→frontend mapping, images fallback/ordering, deal object,
admin extras), `slug.test.ts`. **Integration (vs real Postgres):** list pagination/filter/sort,
slug detail + 404, draft hidden from public, 401/403/CSRF guards, admin create→update→publish→
delete lifecycle, duplicate ASIN 409, price-history capture, bulk publish/unpublish.

## 6. Gaps / follow-ups

No SSR yet; image upload pipeline (media phase); Amazon PA-API import + scheduled price/rating
sync (FR-001…005/015/016) deferred; multi-marketplace affiliate URLs + `/go` redirect (affiliate
phase); `viewCount`/`clickCount` analytics counters not yet incremented.
