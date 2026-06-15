# Phase 5 — Compliance Report

> Affiliate-compliance + privacy posture, and requirement coverage. Date: 2026-06-15.

---

## 1. Affiliate-compliance checklist (FR-063)

`GET /api/affiliate/compliance` returns a live checklist + score, surfaced in the admin "Links &
Settings" tab:

| Check | Status logic |
| ----- | ------------ |
| Amazon Associate tag configured | `pass` if a non-empty tag is set, else `fail` |
| Outbound links restricted to the amazon.in whitelist | `pass` (all `/go` URLs built from the whitelisted domain) |
| Click tracking privacy-safe (no raw IP/UA) | `pass` (SHA-256 hashes only) |
| Affiliate disclosure text configured | `pass` if set, else `warn` (a default disclosure page still exists) |
| Public affiliate-disclosure page present | `pass` (`/affiliate-disclosure`) |
| Click tracking enabled | `pass`/`warn` per the settings toggle |

Storefront affiliate links also carry **`rel="nofollow sponsored"`** (FTC + search-engine guidance).

## 2. Security / privacy compliance

| Requirement | Status | How |
| ----------- | :----: | --- |
| NFR-SEC-007 — IP/UA stored hashed only | ✅ | `AffiliateClick.ipHash`/`userAgentHash` = SHA-256(+pepper); **never returned by the API** |
| NFR-SEC-008 — affiliate redirect whitelist | ✅ | `/go` builds the URL from the ASIN + the whitelisted domain; arbitrary URLs are never honoured (open-redirect-proof) |
| RBAC on affiliate/revenue writes | ✅ | `affiliate.view` (read) / `affiliate.{create,edit,delete}` (write) + CSRF + audit |
| Audit logging of mutations | ✅ | settings/campaign/revenue mutations logged (`affiliate.*`, `revenue.imported`) |

## 3. Functional requirements

| FR | Description | Status |
| -- | ----------- | :----: |
| FR-044 | `/go/{asin}` 302 redirect with associate tag, <100ms | ✅ |
| FR-046 | Async click event logging | ✅ (fire-and-forget) |
| FR-049 | ASIN + amazon.in whitelist validation | ✅ |
| FR-062 | Affiliate dashboards (clicks/stats/top-products) | ✅ |
| FR-063 | Affiliate compliance checklist | ✅ |
| Revenue import (§13.4) | Amazon CSV → RevenueReport | ✅ |
| Live order/conversion API | — | ⏳ later phase |
| Revenue forecasting | — | ⏳ later phase |

## 4. Preservation compliance

Routes ✅ · colors ✅ · UI ✅ (storefront CTA change is invisible; admin keeps card/tab/chart language)
· components ✅ (no shadcn modified) · **SSR/SEO preserved** ✅ (verified: product page CTA = `/go`,
Product JSON-LD + canonical intact) · APIs preserved (existing endpoints unchanged) · RBAC preserved.

## 5. Headline delta

Behavioural ~38% → **~44%**; surface ~52% → **~57%**. DB models 22 → **27**; API endpoints ~56 →
**~72**; admin screens wired 6 → **7**; engines 4 → **5** (affiliate).

## 6. Verification gates

Backend typecheck ✅ · lint ✅ · build ✅ · migration ✅ · **137/137 tests** vs real Postgres ·
frontend typecheck ✅ · `next build` ✅ (82 pages, SSR routes `●`) · **live smoke** (`/go` 302 +
privacy-safe logging + SSR CTA/JSON-LD) ✅.
