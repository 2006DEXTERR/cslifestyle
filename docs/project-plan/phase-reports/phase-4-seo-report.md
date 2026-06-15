# Phase 4 — SEO Report

> Metadata, structured data, sitemap/robots, and the hydration sweep. Date: 2026-06-15.

---

## 1. Metadata (per route via `generateMetadata`)

- **Title** — entity `seoTitle` ?? sensible default, rendered through the layout template
  `%s | CSLifestyle` (verified: `<title>iPhone 15 Pro Max | CSLifestyle</title>`).
- **Description** — entity `metaDescription` ?? excerpt/shortDescription/bio (clamped 300).
- **Canonical** — `<link rel="canonical" href="https://cslifestyle.in/…">` (absolute via
  `metadataBase`). Verified present on product + guide pages.
- **OpenGraph** — title/description/url/siteName/images(+type `website`/`article`/`profile`);
  `publishedTime`/`modifiedTime` for guides & comparisons. Verified `og:title` present.
- **Twitter** — `summary_large_image` + title/description/image. Verified `twitter:card` present.
- **Defaults** — `app/layout.tsx` sets `metadataBase`, default title/description, OG + Twitter.

## 2. Structured data (JSON-LD)

| Type | Where | Notes |
| ---- | ----- | ----- |
| **Organization** | site-wide (layout) | name, url, logo, description |
| **WebSite** | site-wide (layout) | + `SearchAction` → `/search?q=` |
| **Product** | products/[slug] | name, image[], sku(asin), brand, category, **aggregateRating**, **offers** (price/INR/availability/url) |
| **Article** | guides/[slug], comparisons/[slug] | headline, image, datePublished/modified, author, publisher |
| **BreadcrumbList** | all 6 detail routes | positioned Home → section → entity |

Availability is mapped to schema.org URLs (`InStock`/`LimitedAvailability`/`OutOfStock`/`PreOrder`).
Verified live: `"@type":"Product"`, `aggregateRating`, `"@type":"BreadcrumbList"`,
`"@type":"Organization"`, `"@type":"Article"` all present in SSR HTML.

## 3. Sitemap & robots

- **`/sitemap.xml`** (`app/sitemap.ts`, `revalidate=3600`): static routes + every published entity
  slug, DB-driven. Verified **50 URLs** = 8 static + 12 products + 10 categories + 8 brands +
  5 guides + 3 comparisons + 4 authors. Per-type `changeFrequency` + `priority`. (Slug lists
  paginate at the API's 100/page cap.)
- **`/robots.txt`** (`app/robots.ts`): `Allow: /`; `Disallow: /admin, /account, /api, /login,
  /signup, /reset-password, /forgot-password`; `Host` + `Sitemap:` lines. Verified verbatim.

## 4. Crawl-correctness

- Unknown slug → **HTTP 404** via `notFound()` (was a soft-404/200 before) — verified.
- Private surfaces disallowed in robots; admin/account/api never linked from public SSR.

## 5. Hydration sweep (#7) — deterministic formatting

- Added `formatDate` (explicit `en-IN`) to `lib/format.ts` (alongside `formatNumber`/`formatPrice`).
- Replaced **all** bare `toLocaleString()` / `toLocaleDateString()` repo-wide: `admin/products`
  (date), and the `admin/{page,analytics,affiliate,marketing,seo,ai}` mock dashboards, plus
  `admin/{guides,comparisons}` dates → shared formatters.
- Remaining: `components/ui/chart.tsx` (shadcn) — intentionally untouched (don't-modify-shadcn rule;
  its recharts tooltip renders client-only, so no SSR mismatch).
- Result: server and client produce byte-identical numbers/dates → no hydration mismatch
  (homepage price `₹1,34,900` verified identical in SSR HTML).

## 6. Gaps / follow-ups (→ Remaining Work)

OG **image** still the placeholder `bolt.new` default (no branded asset); Google **Indexing API**
ping on publish (FR-070) and **GSC** ingest deferred; per-entity `noindex`/redirect management
(spec §11) deferred; `next lint` red on pre-existing content.
