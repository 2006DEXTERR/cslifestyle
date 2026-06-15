# Phase 12 — Database Coverage Report

**Date:** 2026-06-15 · **Phase:** 12 (final) · **Schema:** `server/prisma/schema.prisma` · **47 models · 12 migrations**

All 12 migrations apply cleanly from an empty database (verified every phase + this one), then the
idempotent seed runs (87 permissions, 5 roles, catalog/content/affiliate demo data, 42 search-index
entries).

## 1. Models by domain

| Domain (phase) | Models |
| -------------- | ------ |
| Identity & access (1) | User, Role, Permission, RolePermission, Session, RefreshToken, VerificationToken, AuditLog, TwoFactorBackupCode |
| Catalog (2) | Category, Brand, Product, ProductImage, ProductPriceHistory, SearchQuery |
| Content (3) | Author, Guide, GuideProduct, Comparison, ComparisonSpec, ComparisonProduct |
| Affiliate & revenue (5) | AffiliateClick, AffiliateCampaign, AffiliateSettings, RevenueImport, RevenueReport |
| Import Center (6) | ImportJob, ImportItem, ImportTemplate |
| AI engine (7) | AiQueue, AiLog |
| Analytics (8) | AnalyticsEvent, PageView, ProductView, ReportSnapshot |
| Marketing (9) | NewsletterSubscriber, Campaign, CampaignRecipient, EmailEvent |
| Media (10) | MediaFolder, MediaAsset, MediaUsage |
| Discovery (11) | SearchSynonym, SearchIndexEntry, RecommendationRule, InternalLink |
| Settings (cross) | Setting |

**Total: 47 models** (+ ~20 enums).

## 2. Spec §7 coverage

The blueprint §7 model set is **~100% covered** — including the final `Media` model (Phase 10, refined
into MediaAsset/MediaUsage/MediaFolder per ADR-027) and `search_queries`/`revenue_reports`. The
beyond-spec marketing/discovery tables extend it. `SearchConsoleMetric` (§13.6) is **not** materialised
(GSC ingestion is an offline adapter — deployment-time).

## 3. Conventions

- **cuid string IDs** everywhere (ADR-011/017) — JSON-safe, non-enumerable.
- **Privacy:** SHA-256 only for IPs/UAs/tokens (no raw PII) — NFR-SEC-007.
- **Referential integrity:** `Cascade` for owned children (items/recipients/usages), `SetNull` for
  optional references (createdBy, productId), unique constraints for dedup (ASIN, email, media hash,
  search-index entity, internal-link tuple).
- **Indexing:** hot query paths indexed (status/type/createdAt/entity refs/slug/hash).

## 4. Migrations

1. `auth_init` · 2. `2fa_email_settings` · 3. `catalog_products_categories_brands` ·
4. `content_guides_comparisons_authors` · 5. `affiliate_revenue` · 6. `import_center` ·
7. `ai_content_engine` · 8. `analytics_reporting` · 9. `marketing_communication` · 10. `media_library` ·
11. `discovery_search_recommendations` · 12. (Phase 12 added **no** schema change — hardening only).

All forward-only + reversible-by-design; `prisma migrate deploy` is idempotent.

## 5. Verification

`prisma migrate deploy` from empty → 12 migrations applied → seed → 220/220 tests green against embedded
PostgreSQL. No drift (`prisma validate` clean; `prisma format` applied).
