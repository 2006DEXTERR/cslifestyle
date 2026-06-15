# Phase 5 — Affiliate Coverage Report

> The affiliate system surface (DB → redirect → API → UI) and test coverage. Date: 2026-06-15.

---

## 1. Data models (migration `20260614202504_affiliate_revenue`)

| Model | Purpose |
| ----- | ------- |
| **AffiliateClick** | one row per `/go` click — asin, productId?, sourceType, **ipHash/userAgentHash (SHA-256 only)**, deviceType, country, campaignId?, affiliateTag, clickedAt |
| **AffiliateCampaign** | name, unique slug, optional `affiliateTag` override, active window; attach via `/go/{asin}?c=<slug>` |
| **AffiliateSettings** | singleton — `amazonAssociateTag`, `amazonDomain`, `linkCode`, `extraParams`, `disclosureText`, `trackingEnabled` |
| **RevenueImport** | one row per CSV import — file, source, status, rowCount, totalRevenue, period |
| **RevenueReport** | date, asin?, productId?, category?, actualRevenue, orders, clicks, source, importId? |

Enums: `AffiliateSourceType`, `AffiliateDeviceType`, `RevenueSource{estimated,amazon_csv}`,
`ImportStatus`. cuid IDs (ADR-017).

## 2. Redirect engine `/go/{asin}` (FR-044/046/049, ADR-022)

- Express `GET /go/:asin` (root); Next rewrite `/go/:path*` → backend (transparent 302).
- **Validates** ASIN regex + **amazon.in whitelist**; builds
  `https://www.amazon.in/dp/{ASIN}?tag=…&linkCode=ogi&th=1&psc=1` from cached settings (or the
  campaign tag via `?c=`). **Whitelist-safe by construction** (built from ASIN + configured domain —
  open-redirect-proof). Invalid ASIN → 302 to the site (never an open redirect).
- **<100ms**: cached singleton settings, no awaited DB on the hot path.
- **Click logging** is fire-and-forget after the 302 and **privacy-safe**: only SHA-256(ip)/
  SHA-256(ua) + coarse deviceType (from UA) + country (`CF-IPCountry`) + `?src=` source. Hashes are
  **never exposed** by the API.

## 3. Associate-tag & campaign management

- **Settings** (`GET/PUT /api/affiliate/settings`): associate tag, domain, link code, disclosure,
  tracking on/off — edited in the admin "Links & Settings" tab.
- **Campaigns** (CRUD): per-campaign tag override + active toggle; each exposes a `/go/{asin}?c=<slug>`
  pattern for attribution.

## 4. Frontend

- **Storefront** — product + comparison detail CTAs now point to `/go/{asin}?src=…` with
  `rel="nofollow sponsored"` (visually identical; SSR/SEO preserved — verified live).
- **/admin/affiliate** (fully wired off mock): real stat cards (revenue/clicks/conversions/EPC),
  earnings chart, top products, device distribution, traffic sources, recent-clicks table, revenue
  CSV upload + import history, associate-tag settings form, campaigns CRUD, **compliance checklist**.
  Same card/tab/chart visual language + brand colors.

## 5. Seed (real DB data, not mock)

AffiliateSettings (`cslifestyle-21` + disclosure) · 2 campaigns · **544 sample clicks** (30 days,
hashed) · **272 estimated revenue rows** · 1 sample import.

## 6. Test coverage

**Unit (`affiliate.test.ts`):** ASIN validate/normalise, `buildAmazonUrl` (tag/params/whitelist
fallback), whitelist, device-type, source-type, CSV parser. **Integration
(`affiliate.integration.test.ts`):** `/go` 302 + tag, campaign-tag override, invalid-ASIN fallback,
**privacy-safe logging** (no ip/UA fields in the API), RBAC (401/403/200), stats/top/compliance,
settings get/update, campaign CRUD. 137/137 green vs real Postgres; live smoke verified.

## 7. Gaps / follow-ups

No live Amazon order/conversion API (conversions come from imported CSVs); per-device/geo deep
analytics and revenue forecasting are later phases; the `/go` hot path logs in-process (a BullMQ
queue could absorb spikes at scale).
