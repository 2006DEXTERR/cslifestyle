# 02 — Specification Breakdown

> Distillation of `CSLifestyle_V2_Blueprint.pdf` (V2.0.0, 20 sections, 83 pages) into
> trackable requirements. IDs here are referenced by `04-gap-analysis.md` and
> `15-compliance-report.md`. **Stack note:** every requirement is implemented in the
> mandated Node/Express/TS + PostgreSQL/Prisma stack, never Laravel/PHP (see `01`).

---

## Section map (blueprint → our docs)

| Spec § | Title | Primary planning doc |
| ------ | ----- | -------------------- |
| 1 | Executive Summary | 01, 09 |
| 2 | Business Requirements | 02, 09 |
| 3 | Functional Requirements (FR-001…FR-070) | 04, 07, 09 |
| 4 | Non-Functional Requirements (NFR) | 04, 08, 13 |
| 5 | Frontend Architecture — all pages | 03, 04 |
| 6 | UI/UX Design System | 03 (preserve existing) |
| 7 | Database Architecture | 06 |
| 8 | API Architecture — REST | 07 |
| 9 | Amazon Affiliate Engine | 06, 07, 09 |
| 10 | AI SEO Engine | 06, 07, 09 |
| 11 | SEO Master Blueprint | 04, 09 |
| 12 | Content Automation | 09 |
| 13 | Analytics Architecture | 06, 07, 09 |
| 14 | Admin Panel Blueprint | 03, 04, 09 |
| 15 | Security Architecture | 08 |
| 16 | DevOps Architecture | 14 |
| 17 | Performance Optimisation | 13, 14 |
| 18 | Testing Strategy | 13 |
| 19 | Launch Checklist | 14 |
| 20 | 12-Month Growth Roadmap | 09 (business context) |

---

## Functional requirements (Spec §3) — canonical list

### 3.1 Product Management
- **FR-001** ASIN-based single product import via Amazon PA-API.
- **FR-002** CSV bulk import with field-mapping UI (≤500 rows).
- **FR-003** URL-based import (paste Amazon.in URL → extract ASIN).
- **FR-004** Category-level bulk import from Amazon browse nodes.
- **FR-005** One-click import from admin Amazon search results.
- **FR-006** Import auto-triggers AI content generation queue.
- **FR-007** Validate ASIN format `/^[A-Z0-9]{10}$/` before API call.
- **FR-008** Duplicate ASIN detection — skip silently + log to import report.
- **FR-009** Product page shows title, gallery, price, rating, pros, cons, description, specs.
- **FR-010** Product page shows Amazon price + "Last updated: [datetime]".
- **FR-011** Affiliate CTA above the fold on ALL screen sizes.
- **FR-012** Related products (same subcategory, similar price, min 4).
- **FR-013** "Users also viewed" from view-event tracking.
- **FR-014** Image gallery: WebP, lazy load below fold, lightbox zoom.
- **FR-015** Price sync every 6h for published products (scheduled job).
- **FR-016** Rating/review-count sync every 24h (scheduled job).
- **FR-017** Availability sync — OOS badge, hide price.
- **FR-018** Auto-deactivate products unavailable 30+ consecutive days.
- **FR-019** Price history in `product_price_history` for future price-drop feature.

### 3.2 Category & Navigation
- **FR-020** Multi-level category hierarchy (max 5 levels).
- **FR-021** Category pages: filtered/sorted grid + sidebar filters.
- **FR-022** Filters: price slider, brand multi-select, min rating, availability, discount %.
- **FR-023** Sorts: popularity, price↑, price↓, rating, newest.
- **FR-024** Breadcrumbs on product/category pages + schema.
- **FR-025** Desktop mega-nav with category icons (hover reveal).
- **FR-026** Mobile hamburger + accordion subcategories.

### 3.3 Search
- **FR-027** Full-text search across title, description, brand, category.
- **FR-028** Postgres full-text index on products (spec said MySQL FULLTEXT — we use
  Postgres `tsvector`/GIN; behaviour preserved).
- **FR-029** Autocomplete (≥3 chars, top 8 product+guide suggestions).
- **FR-030** Search results page reuses category filter/sort controls.
- **FR-031** No-results page: suggested categories, popular searches, trending.
- **FR-032** Log search queries (`search_queries`) for analytics + content-gap.

### 3.4 Buying Guides
- **FR-033** Rich-text editor with inline product cards (TipTap/Quill).
- **FR-034** Auto TOC from H2/H3.
- **FR-035** Related-guides widget (same category, by views).
- **FR-036** Reading time (words/200 wpm).
- **FR-037** Guide schema: Article + FAQPage + HowTo.
- **FR-038** AI generation workflow: generate → edit → publish.

### 3.5 Comparison
- **FR-039** Compare 2–5 products side-by-side spec table.
- **FR-040** Winning spec cell highlighted green (auto per spec type).
- **FR-041** Verdict: AI 300-word recommendation + clear winner.
- **FR-042** Per-product affiliate CTA in comparison header.
- **FR-043** Auto-generate comparisons from product-pair combos in top subcategories.

### 3.6 Affiliate Link System
- **FR-044** `/go/{asin}` cloaked, **302** redirect to Amazon with associate tag.
- **FR-045** Associate tag configurable in admin settings (no code deploy).
- **FR-046** Log each click: timestamp, ASIN, source URL, UA hash, IP hash, device.
- **FR-047** Affiliate links `rel="noopener noreferrer sponsored"`, new tab.
- **FR-048** Auto-inject disclosure on any page with `/go/` links.
- **FR-049** Validate redirect target against amazon.in whitelist before serving.

### 3.7 AI Content System
- **FR-050** On import, dispatch AI jobs: title, meta desc, description, pros, cons, 5 FAQs.
- **FR-051** Queue workers, configurable concurrency (default 4).
- **FR-052** AI content stored in DB — view/edit/approve/regenerate per field.
- **FR-053** Provider configurable: **Claude (primary)** / OpenAI / Gemini.
- **FR-054** Prompt templates admin-editable (stored in settings).
- **FR-055** AI logs: model, prompt, response, token counts, cost, status (30-day retention).

### 3.8 Admin Panel
- **FR-056** RBAC: Super Admin, Editor, SEO Manager, Analyst (+ spec §15 expands to 7 roles).
- **FR-057** Dashboard: today's clicks, revenue est., published count, queue depth.
- **FR-058** Products: list/filter/edit/import/bulk publish-unpublish-delete-AI-queue.
- **FR-059** Categories: tree CRUD, assign guides, SEO fields.
- **FR-060** AI Centre: queue monitor, retry failed, edit prompts, cost logs.
- **FR-061** SEO Centre: sitemap manager, robots editor, redirects, canonical checker.
- **FR-062** Analytics: traffic charts, click logs, revenue est., top pages.
- **FR-063** Affiliate Centre: click log, revenue tracker, compliance checklist.

### 3.9 SEO Technical
- **FR-064** Auto XML sitemaps split by type (products, categories, guides, comparisons, brands).
- **FR-065** Sitemap index at `/sitemap.xml`.
- **FR-066** Robots.txt admin-configurable (no server access).
- **FR-067** Canonical URLs everywhere (self-referencing, no pagination canonicals > p1).
- **FR-068** Auto breadcrumb schema on category/product/guide.
- **FR-069** OG + Twitter Card tags on all public pages.
- **FR-070** Google Indexing API ping on new product/guide publish.

## Non-functional requirements (Spec §4, §15, §17)

### Performance (§4.1, §17.1)
PageSpeed mobile ≥90 / desktop ≥95; LCP <2.5s; INP <100ms (§17 says <200ms); CLS <0.1;
TTFB <600ms (CDN); homepage <1.5s 4G; product <2.0s 4G; autocomplete <200ms; `/go/` redirect
<100ms; admin <3s; initial page weight <500KB.

### Scalability (§4.2)
100k concurrent sessions; 100k+ products with FT search <500ms; AI queue ≥1000 jobs/hr;
CDN 10M+ images/mo; stateless app horizontal scale; Redis ≥80% DB-load reduction; 10× seasonal
spikes.

### Availability (§4.3)
99.9% uptime; maintenance Sun 02:00–04:00 IST; RTO <4h; RPO <1h; CDN cache hit >85%; worker
uptime 99.5%.

### Security (§4.4, §15) — see `08-security-design.md`
- **NFR-SEC-001** admin auth, 8h session.
- **NFR-SEC-002** TOTP 2FA mandatory for Super Admin + SEO Manager.
- **NFR-SEC-003** CSRF on state-changing routes.
- **NFR-SEC-004** XSS prevention (output escaping).
- **NFR-SEC-005** SQLi prevention (parameterised / Prisma).
- **NFR-SEC-006** Rate limits: 60/min public, 300/min auth, 5 logins/15min.
- **NFR-SEC-007** IP stored as SHA-256 only.
- **NFR-SEC-008** Redirect target amazon.in whitelist.
- **NFR-SEC-009** CSP headers.
- **NFR-SEC-010** WAF (Cloudflare) SQLi/XSS/traversal.

### SEO NFR (§4.5)
HTTP 200 <3s; sitemap updated ≤1h after publish; zero duplicate (canonical); no orphans (≤3
clicks); crawl-budget (noindex/canonical filter URLs); structured data validated; mobile-first
no-JS content; `/go/` excluded from sitemap + noindex.

### Data integrity (§4.6)
"Last updated" timestamp on prices; AI content reviewed before indexing; ASIN UNIQUE;
redirect target validated pre-publish; daily health-check on top 500 links.

## Key engine specs

- **§9 Amazon Affiliate Engine:** PA-API 5.0 (SearchItems/GetItems/GetVariations/GetBrowseNodes,
  1 req/sec, AWS SigV4), import methods, `AffiliateLinkService`, `/go/{slug}` 302 redirect with
  async click event, 3-level disclosure, tiered price sync (Tier1 6h/Tier2 12h/Tier3 24h/Tier4
  72h), rating sync, product refresh.
- **§10 AI SEO Engine:** queue-based; Claude 3.5 Sonnet primary, GPT-4o fallback; per-content
  prompt templates (title, meta, description, pros/cons, FAQ, guide, comparison, category,
  schema, internal links); quality validation; provider abstraction.
- **§11 SEO:** URL patterns, canonical strategy, robots.txt, sitemap index + paginated product
  sitemaps (10k/file), title formulas, programmatic page types, topical silos, schema strategy.
- **§13 Analytics:** GA4 + GSC + Looker + custom affiliate DB; custom GA4 events; click tracking
  listener; revenue tracking (clicks × CVR × commission, + Amazon CSV import).

## Business context (Spec §1, §2, §20)
Phase-1 (mo 6): 20k products, 100k sessions/mo, 500+ guides, ₹50k–1L/mo. Phase-2 (mo 12): 100k
products, 1M sessions/mo, 5000+ guides. 10 launch categories. 12-month roadmap drives content
volume but not engineering sequencing (our sequencing is in `09`/`10`).
