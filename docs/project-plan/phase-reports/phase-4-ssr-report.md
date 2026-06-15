# Phase 4 — SSR Report

> The server-rendering architecture, data transport, ISR, and the live smoke evidence. Date: 2026-06-15.

---

## 1. Architecture (ADR-021)

**Server Component page + Client island.** Each `[slug]/page.tsx` is now an **async Server
Component** that: fetches data server-side, calls `notFound()` if absent, emits JSON-LD, and renders
a colocated **client island** (`*-detail.tsx`) with the data as **props**. The island holds the
unchanged interactivity (image gallery, tabs, filters, framer-motion) — no `useEffect` fetch, no
loading state. UI markup is moved **verbatim**, so the rendered output is identical.

```
[slug]/page.tsx  (Server Component)
  ├─ export const revalidate = 3600            // ISR
  ├─ generateStaticParams()                    // published slugs
  ├─ generateMetadata()                        // title/canonical/OG/Twitter
  └─ default async Page()
       ├─ const data = await getX(slug)         // lib/api/ssr.ts → BACKEND_ORIGIN
       ├─ if (!data) notFound()                 // real 404
       ├─ <JsonLd data=[…]/>                     // structured data
       └─ <XDetail …props/>                     // 'use client' island
```

## 2. Data transport

Server Components cannot use the browser-only `next.config.js` rewrites, so `lib/api/ssr.ts` fetches
the **existing API** at an absolute `BACKEND_ORIGIN` (default `http://localhost:4000`). Requests are
anonymous → the public API returns published/active rows (correct for public SSR). Every fetch is
`try/catch → null/[]`, so:
- a missing entity → `notFound()` (404);
- a down backend at **build** time → `generateStaticParams → []` and `sitemap` → static-only, so the
  build still succeeds (pages then generate on-demand via ISR).

**No backend/API/RBAC change** — SSR reuses the Phase 2/3 endpoints as the single contract.

## 3. ISR / static generation

`revalidate = 3600` on all 6 routes (+ sitemap). `generateStaticParams` returns published slugs
(paginated at the API's 100/page cap via a bounded page-walk). Build output: routes shown as
**`●` (SSG)** — pre-rendered when slugs are available, revalidated hourly, and `dynamicParams`
(default true) generates new slugs on first request.

## 4. Live smoke evidence

Harness: embedded Postgres → `migrate deploy` + seed → Express backend (:4000) → `next start`
(:3005) with `BACKEND_ORIGIN`/`NEXT_PUBLIC_SITE_URL`. (Throwaway tooling, since removed.)

| Check | Result |
| ----- | ------ |
| `GET /products/iphone-15-pro-max` | **HTTP 200**, server-rendered (no JS needed) |
| Data in initial HTML | ✅ "iPhone 15 Pro Max", price "₹1,34,900" (en-IN, deterministic) |
| JSON-LD | ✅ `Product` (+`aggregateRating`), `BreadcrumbList`, `Organization` |
| Meta | ✅ canonical `https://cslifestyle.in/products/iphone-15-pro-max`, `og:title`, `twitter:card`, `<title>… | CSLifestyle</title>` |
| `GET /guides/best-smartphones-under-30000` | ✅ `Article` JSON-LD + canonical |
| `GET /products/does-not-exist-xyz` | ✅ **HTTP 404** |
| `GET /robots.txt` | ✅ allow/disallow + Host + Sitemap |
| `GET /sitemap.xml` | ✅ **50 URLs** (all entities + static) |
| `next build` (backend up) | ✅ **82 pages**, 42 detail pages pre-rendered `●` |

## 5. Build/type gates

`tsc --noEmit` ✅ · `next build` ✅. `next lint` ❌ — pre-existing `react/no-unescaped-entities`
(apostrophes/quotes in copied JSX, e.g. "you're", `6.7"`) + `<img>` LCP warnings; carried verbatim
from the original pages (UI preservation), not a regression; `eslint.ignoreDuringBuilds: true`.

## 6. Risks / notes

SSR makes one HTTP hop to the backend per page render (could be optimised to direct service calls in
the same deployment later); the SSR read-path now depends on `BACKEND_ORIGIN` being set in
production; cache/ISR tuning + Redis read-cache are a later performance concern.
