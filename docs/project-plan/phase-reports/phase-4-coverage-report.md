# Phase 4 — Coverage Report (SSR & SEO Foundation)

> What was converted and what each route now emits. Date: 2026-06-15.

---

## 1. Routes converted (6/6)

Each route became an **async Server Component `page.tsx`** + a **client island `*-detail.tsx`**
(existing UI verbatim, data via props). Client-side fetching + loading states removed.

| Route | Island | Server data fetched | Metadata | JSON-LD |
| ----- | ------ | ------------------- | :------: | ------- |
| `products/[slug]` | `product-detail.tsx` | product + related (by category) | ✅ | Product (+aggregateRating/offers), Breadcrumb |
| `categories/[slug]` | `category-detail.tsx` | category + products + **guides (now DB-backed)** | ✅ | Breadcrumb |
| `brands/[slug]` | `brand-detail.tsx` | brand + products | ✅ | Breadcrumb |
| `guides/[slug]` | `guide-detail.tsx` | guide (+author+picks) + related | ✅ | Article, Breadcrumb |
| `comparisons/[slug]` | `comparison-detail.tsx` | comparison (+products+specs) + related | ✅ | Article, Breadcrumb |
| `authors/[slug]` | `author-detail.tsx` | author (+guides) + recent comparisons | ✅ | Breadcrumb |

Every page also inherits site-wide **Organization + WebSite** JSON-LD (root layout) and the
`%s | CSLifestyle` title template + `metadataBase`.

## 2. New SEO/SSR modules

| File | Purpose |
| ---- | ------- |
| `lib/api/ssr.ts` | server-side fetchers (absolute `BACKEND_ORIGIN`, resilient, paginated slug lists) |
| `lib/seo.ts` | `SITE` config, `buildMetadata` (canonical/OG/Twitter), JSON-LD builders |
| `components/seo/JsonLd.tsx` | renders `<script type="application/ld+json">` (server-safe) |
| `app/sitemap.ts` | DB-driven sitemap (static + all entity slugs) |
| `app/robots.ts` | allow `/`, disallow admin/account/api + auth pages, Host + Sitemap |
| `lib/format.ts` | + `formatDate` (deterministic en-IN) |

## 3. ISR / static generation

All 6 routes: `export const revalidate = 3600` + `generateStaticParams` (published slugs). At build
with the backend reachable, **82 pages** generated (42 entity detail pages pre-rendered as `●`
SSG/ISR); with the backend down, `generateStaticParams → []` and pages render on-demand + cache.

## 4. UI preservation

No component restyled; no colors/routes/layout changed. Each island is the original page's JSX
moved verbatim, now taking props. `notFound()` renders the existing `app/not-found.tsx`.

## 5. Out of scope (unchanged)

Listing pages (`/products`-less, `/categories`, `/brands`, `/guides`, `/comparisons`, `/authors`),
home, navbar, footer, search, deals, wishlist — still client components (and home/nav/footer still
read `lib/data.ts`). No backend/API/RBAC change.

## 6. Verification

typecheck ✅ · `next build` ✅ (82 pages; 6 routes `●`) · live SSR smoke ✅ (see SSR Report) ·
hydration sweep ✅ (see SEO Report). `next lint` ❌ pre-existing only (unescaped entities + `<img>`,
carried verbatim; build ignores ESLint by config).
