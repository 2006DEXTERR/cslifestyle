# 03 — Current-State Audit

> Exhaustive audit of the repository as of **2026-06-14** (commit `f4651ea` "Initial CSLifestyle
> commit"). This is the factual baseline for `04-gap-analysis.md`. Generated from a full read of
> the tree + three parallel deep audits (public frontend, admin, data/infra).

---

## 1. Project audit (stack & tooling)

- **Framework:** Next.js **13.5.1**, App Router, React 18.2, TypeScript 5.2 (`target: ES5`,
  `strict: true`, path alias `@/* → ./*`).
- **UI:** Tailwind 3.3 + **shadcn/ui** (48 `components/ui/*` primitives), Radix UI, framer-motion
  12, lucide-react icons, recharts (admin charts), @tanstack/react-table (admin tables),
  embla-carousel, cmdk, sonner, react-hook-form + zod (present, lightly used).
- **Origin:** Bolt.new (`nextjs-shadcn` template; `.bolt/` present).
- **Scripts:** `dev`, `build`, `start`, `lint`, `typecheck`. No test runner, no backend scripts.
- **Deploy:** Netlify (`netlify.toml`, `@netlify/plugin-nextjs`). `next.config.js` sets
  `images.unoptimized:true` and `eslint.ignoreDuringBuilds:true`.
- **113 tracked files** total (65 non-UI-primitive).

## 2. Backend / data / infra audit

- **No backend whatsoever:** no `app/api/**`, no server actions (`"use server"`), no Express,
  no Prisma, no `prisma/schema.prisma`, no DB driver (`pg`/`mysql`), no `.env*`.
- **`@supabase/supabase-js@2.58.0` is a dependency but 100% UNUSED** — no `createClient`, no
  `supabase.` calls, no `NEXT_PUBLIC_SUPABASE_*` refs anywhere. Vestigial; safe to remove.
- **All data is in-memory mock** in `lib/data.ts` (781 lines):
  - **12** products, **10** categories, **4** authors, **5** buying guides, **3** comparisons,
    **8** brands. All images are Pexels CDN URLs.
  - Synchronous getter helpers: `getTrendingProducts`, `getEditorsPicks`, `getDeals`,
    `getProductBySlug`, `getCategoryBySlug`, `getGuideBySlug`, `getComparisonBySlug`,
    `getAuthorBySlug`, `getProductsByCategory`, `getGuidesByCategory`.
- **`lib/types.ts`** — clean domain interfaces (Product, Category, BuyingGuide, Comparison,
  Author, Brand, SearchResult, FilterState). Note: frontend field names differ from spec DB
  column names (e.g. `currentPrice` vs `current_price`, `affiliateUrl` vs `affiliate_link`,
  `name` vs `title`). Mapping handled in `06`/`07`.
- **`lib/utils.ts`** — `cn()` only. **`hooks/use-toast.ts`** — local toast reducer.

## 3. Design-system audit (Spec §6 vs reality)

- Tokens in `app/globals.css` (HSL): base is **monochrome** (`--primary: 0 0% 7%` ≈ black,
  `--background: 0 0% 100%`). Brand accent is a **gradient**:
  `--brand-pink 328 85% 52% (#E91E8F)`, `--brand-red 0 100% 65% (#FF4D4D)`,
  `--brand-orange 28 100% 50% (#FF7A00)`, `--brand-yellow 45 100% 51% (#FFC107)`. `--ring` =
  brand-pink. Full **dark mode** variants present.
- **Deviates from spec §6** (blue `#1a56db` primary, green `#16a34a` accent). **Per user
  instruction we preserve the existing palette** — logged as sanctioned deviation in `15`.
- Typography: spec wants Noto Sans; current uses template default (verify in `globals.css` /
  layout during Phase 0). Spec spacing/grid/button tokens are conceptually compatible.

## 4. Route audit — PUBLIC (22 routes)

| File | URL | Comp | Data | SEO meta | Notes |
| ---- | --- | ---- | ---- | -------- | ----- |
| `app/layout.tsx` | (root) | Server | — | static `metadata` (title/desc/OG/Twitter) | no canonical/robots/sitemap |
| `app/page.tsx` | `/` | **client** | mock getters | none | hero+search(non-func), trending, categories, guides, comparisons, deals, editors, brands, trust, newsletter |
| `app/about/page.tsx` | `/about` | client | hardcoded | none | team links to `/authors/{slug}` |
| `app/authors/page.tsx` | `/authors` | client | `authors` | none | grid |
| `app/authors/[slug]/page.tsx` | `/authors/{slug}` | client | `authors` filter | none | tabs; no generateStaticParams |
| `app/brands/page.tsx` | `/brands` | client | `brands` | none | grid |
| `app/brands/[slug]/page.tsx` | `/brands/{slug}` | client | filter | none | products by brand |
| `app/categories/page.tsx` | `/categories` | client | `categories` | none | grid |
| `app/categories/[slug]/page.tsx` | `/categories/{slug}` | client | filter | none | **spec wants `/{category-slug}/`**; filters+sort+view toggle, pagination UI stub |
| `app/comparisons/page.tsx` | `/comparisons` | client | `comparisons` | none | grid |
| `app/comparisons/[slug]/page.tsx` | `/comparisons/{slug}` | client | filter | none | **spec wants `/compare/{a}-vs-{b}/`** |
| `app/contact/page.tsx` | `/contact` | client | hardcoded | none | form (simulated submit, no honeypot) |
| `app/deals/page.tsx` | `/deals` | client | filter | none | filters+sort UI |
| `app/guides/page.tsx` | `/guides` | client | `buyingGuides` | none | category filter |
| `app/guides/[slug]/page.tsx` | `/guides/{slug}` | client | filter | none | TOC, recs, `dangerouslySetInnerHTML` body |
| `app/products/[slug]/page.tsx` | `/products/{slug}` | client | filter | none | gallery+zoom, tabs, related; no schema |
| `app/search/page.tsx` | `/search` | client | mock | none | **client-state only, not `?q=`**; tabs |
| `app/wishlist/page.tsx` | `/wishlist` | client | local state | none | in-memory only, not persisted |
| `app/privacy/page.tsx` | `/privacy` | client | hardcoded | none | static legal |
| `app/terms/page.tsx` | `/terms` | client | hardcoded | none | static legal |
| `app/affiliate-disclosure/page.tsx` | `/affiliate-disclosure` | client | hardcoded | none | FTC text present |
| `app/not-found.tsx` | 404 | client | — | — | custom 404 w/ search + popular links |

**Public-route gaps:** no `/go/{asin}` redirect; comparison & category URLs differ from spec;
search ignores `?q=`; **zero** `generateMetadata`, `generateStaticParams`, JSON-LD, canonical,
`sitemap.ts`, `robots.ts`; nearly everything is `"use client"` (defeats SSR/SSG & hurts SEO).

## 5. Component audit (`components/`, non-UI)

- `layout/Navbar.tsx` (client) — logo, mega-menu (hardcoded first 8 categories + samples),
  in-navbar search (non-func), theme toggle, mobile menu, auth placeholder.
- `layout/Footer.tsx` (server) — brand, socials, 5 link columns (mix of dynamic + hardcoded),
  newsletter placeholder.
- `layout/MobileBottomNav.tsx` — mobile bottom tab bar.
- `products/ProductCard.tsx` — variants `default|compact|feature`, badges, INR price, CTA.
- `categories/CategoryCard.tsx` — variants, dynamic icon, count.
- `guides/GuideCard.tsx` — variants, cover, reading time, author.
- `comparisons/ComparisonCard.tsx` — A-vs-B, winner badge.
- `providers/theme-provider.tsx` — next-themes wrapper.

These are **high quality and must be preserved**; they only need their data source swapped from
mock to API props.

## 6. Admin audit (`app/admin/**`, 16 pages) — ALL MOCK UI, NO BACKEND, NO AUTH

`layout.tsx` is `"use client"` with **no auth gating, no role checks, no 2FA**; hardcodes a
"Super Admin" user. Every page below is **mock UI only** (hardcoded arrays; CRUD buttons are
unwired stubs; filters/search/pagination work client-side):

| Route | Screen | Highlights (all UI-only) |
| ----- | ------ | ------------------------ |
| `/admin` | Dashboard | 8 KPI cards, recharts (traffic/content/clicks/pie), recent tables |
| `/admin/products` | Products | tanstack table, 6-tab editor drawer, bulk-action bar |
| `/admin/categories` | Categories | expand/collapse tree, editor drawer |
| `/admin/brands` | Brands | grid, profile + editor drawers |
| `/admin/guides` | Guides | table, full-screen editor (no real WYSIWYG), TOC sidebar |
| `/admin/comparisons` | Comparisons | builder drawer (A/B select, category verdicts, winner) |
| `/admin/authors` | Authors | grid, profile + editor drawers |
| `/admin/import` | Import Center | 4 methods (ASIN/CSV/URL/Category), queue + history tabs, 3-step wizard |
| `/admin/ai` | AI Center | token/cost stat cards, queue, provider cards, usage charts; **no prompt editor** |
| `/admin/seo` | SEO Center | health dashboard, site audit, indexing chart; **no sitemap/robots/redirect manager** |
| `/admin/analytics` | Analytics | GA4-style charts, sources, geo, content perf, realtime |
| `/admin/affiliate` | Affiliate Center | revenue/clicks charts, top products, sources |
| `/admin/marketing` | Marketing | newsletter/campaigns/segments (not in spec scope — extra) |
| `/admin/users` | Users | table + editor drawer (5 mock users) |
| `/admin/roles` | Roles | 4 roles + permission matrix (read-only) |
| `/admin/settings` | Settings | tabs: General/Branding/Affiliate/SEO/Email/Analytics |

**Admin vs spec §14:** spec also wants a dedicated **Revenue Center** (here folded into
Affiliate) and **7 roles** (spec §15) vs 4 shown. Settings groups partially overlap spec
(missing explicit **Amazon API**, **AI Provider**, **Caching**, **Import Limits** groups as
named in spec §14.10). `marketing` is an extra beyond spec.

## 7. Workflow audit

- **None implemented.** No import pipeline, no PA-API client, no AI queue/workers, no price/
  rating sync jobs, no sitemap generation, no click tracking, no GSC/GA4 ingestion, no cron/
  scheduler, no redirect handler. All such UI is decorative.

## 8. Infrastructure audit

- Single-target Netlify static/SSR deploy of the Next app. No DB, no Redis, no queue, no worker
  process, no object storage, no CI (`.github/workflows` absent), no Docker, no env management.
- Spec §16 prescribes Hetzner VPS + Nginx + Cloudflare + Redis + Supervisor (for PHP). Our
  Node-stack adaptation is designed in `14-deployment-strategy.md`.

## 9. Summary verdict

A **polished, production-grade frontend shell** (public + admin) running entirely on mock data,
with **no server, no persistence, no auth, and no engines**. The frontend is a near-complete
*visual spec* of the product. ~95% of the spec's *behavioural* surface (backend, engines, data,
SEO infra, auth, analytics ingestion) is **unbuilt**. This is a build-the-backend-and-wire-it
project, not a refactor. Quantified in `04` and `15`.
