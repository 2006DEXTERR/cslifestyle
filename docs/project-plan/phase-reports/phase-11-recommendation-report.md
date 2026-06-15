# Phase 11 — Recommendation Report

**Date:** 2026-06-15 · **Phase:** 11 · **Service:** `services/discovery/recommend.service.ts`

## 1. Coverage

| Recommendation | Status | Endpoint |
| -------------- | :----: | -------- |
| Related products | ✅ | `GET /api/recommendations/products?type=related&productId=` |
| Similar products | ✅ | `?type=similar&productId=` (brand-agnostic, price/rating focused) |
| Related guides | ✅ | `GET /api/recommendations/content?type=guide&id=` |
| Related comparisons | ✅ | `?type=comparison&id=` |
| Category-based | ✅ | `?type=category&categoryId=` |
| Brand-based | ✅ | `?type=brand&brandId=` |
| Price-range | ✅ | `?type=price&minPrice=&maxPrice=` |
| Trending | ✅ | `?type=trending` |
| Affiliate-performance weighted | ✅ | blended into every product score (recent AffiliateClick) |

## 2. Scoring blend

For product recommendations each candidate is scored by a weighted blend:

```
score = w.category·sameCategory + w.brand·sameBrand
      + w.price·priceProximity + w.rating·(rating/5)
      + w.trending·(recentViews/max) + w.affiliate·(recentClicks/max)
```

- **trending** = `ProductView` count (last 30 days); **affiliate** = `AffiliateClick` count (last 30
  days). Both normalised against the candidate set max.
- **Defaults:** category 3, brand 2, price 1.5, rating 1, trending 2, affiliate 1.5 — **overridden by
  active `RecommendationRule`s** (rule `type` → weight), so admins tune the blend without code changes.

Related guides score by **shared products** (×2) + same category; related comparisons by **shared
product**, with a latest-comparisons fallback so the section never empties.

## 3. Public wiring (no visual change)

Outputs reuse the catalog/content presenters, so the **product / guide / comparison detail SSR pages**
now pass **DB-backed recommendations** into the existing `relatedProducts`/`relatedGuides`/
`relatedComparisons` props (same shapes), with a graceful fallback to the prior category filter if the
recommender returns nothing. Layout is unchanged.

## 4. Rules (admin)

`GET/POST/PATCH/DELETE /api/recommendations/rules` (view / manage) manage `RecommendationRule`s
(name, type, weight, isActive) from the `/admin/search` → Recommendation Rules tab.

## 5. Verification

Integration: DB-backed product recs (presented shape with `slug`), trending, and content recs; rule
CRUD with RBAC + CSRF. All green.

## 6. Honest gaps

- Recommendations are computed **on demand** from live signals (no precomputed cache yet) — fine at
  current scale; a `recommendation-recalc` worker hook exists for future precomputation.
- No collaborative-filtering / per-user personalisation (content-based + popularity only).
