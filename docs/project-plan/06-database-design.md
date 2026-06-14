# 06 — Database Design

> Spec §7 (MySQL/InnoDB) → **PostgreSQL + Prisma**. Behaviour and columns preserved; types
> mapped to Postgres idioms. This doc is the contract for `prisma/schema.prisma`.

---

## 1. MySQL→Postgres/Prisma mapping rules

| Spec (MySQL) | Prisma / Postgres |
| ------------ | ----------------- |
| `BIGINT UNSIGNED AUTO_INCREMENT` PK | `BigInt @id @default(autoincrement())` |
| `VARCHAR(n)` | `String @db.VarChar(n)` |
| `LONGTEXT` / `TEXT` | `String @db.Text` |
| `JSON` column | `Json` (Postgres `jsonb`) |
| `ENUM(...)` | Prisma `enum` |
| `DECIMAL(p,s)` | `Decimal @db.Decimal(p,s)` |
| `TINYINT(1)` flag | `Boolean` |
| `TIMESTAMP ... ON UPDATE` | `DateTime @updatedAt` |
| `FULLTEXT INDEX` | Postgres `tsvector` GIN index (raw migration) |
| `deleted_at` soft delete | `DateTime?` + app-level scope |

- Money fields `Decimal` (never float). Hashes `String @db.VarChar(64)`. All timestamps stored
  UTC; display in IST. Naming: DB columns `snake_case` via `@map`, Prisma models `PascalCase`,
  fields `camelCase` — so the API can speak camelCase while the schema matches spec column names.

## 2. Models (mapped from spec §7 + engine sections)

### Identity & access (§7.1–7.2, §15)
- **User** — id, name, email (unique), passwordHash, roleId→Role, twoFactorSecret?,
  twoFactorEnabled, lastLoginAt?, lastLoginIp?, emailVerifiedAt?, isActive, timestamps,
  deletedAt?. Index email, roleId.
- **Role** — id, name (unique), displayName, guardName. Seed 7 roles (spec §15.2): super_admin,
  admin, seo_manager, content_writer, affiliate_manager, analytics_viewer, developer.
- **Permission** — id, name (unique), module. **RolePermission** — (roleId, permissionId) PK.

### Catalog (§7.3–7.5, §9, §14.4)
- **Category** — id, parentId?→self, name, slug (unique), description?, iconSvg?, imagePath?,
  seoTitle?, metaDescription?, h1Text?, introContent?(Text), faqContent?(Json),
  productCount(default 0), sortOrder, isActive, isFeatured, level(1–5), schemaJson?, noindex,
  timestamps. Index parentId, slug, (isActive,sortOrder). Self-FK onDelete SetNull.
- **Brand** — id, name, slug (unique), logoPath?, description?, websiteUrl?, foundedYear?,
  countryOfOrigin?, seoTitle?, metaDescription?, productCount, isActive, isFeatured, timestamps.
- **Product** (primary) — id, asin (unique), categoryId→Category, brandId?→Brand, title,
  slug (unique), shortDescription?, description?(Text), specifications?(Json), pros?(Json),
  cons?(Json), faqContent?(Json), mainImageUrl?, mainImageWebp?, galleryImages?(Json),
  currentPrice?(Decimal 10,2), mrpPrice?(Decimal 10,2), discountPercent?(Decimal 5,2),
  currency(default 'INR'), amazonUrl, affiliateLink?, rating?(Decimal 3,2), reviewCount,
  priceSyncedAt?, ratingSyncedAt?, isAvailable, isPublished, isFeatured, isDeal, viewCount,
  clickCount, seoTitle?, metaDescription?, schemaJson?, aiStatus(enum
  pending|generating|done|failed), aiGeneratedAt?, timestamps, deletedAt?. Indexes per spec
  (asin, slug, categoryId, brandId, (isPublished,categoryId), (isDeal,discountPercent),
  aiStatus). **`searchVector` tsvector + GIN** for FR-027/028. **ASIN UNIQUE** = §4.6.
- **ProductPriceHistory** (FR-019) — id, productId→Product, price(Decimal), mrp?(Decimal),
  recordedAt. Index (productId, recordedAt).

### Content (§7.6–7.7)
- **Guide** — id, categoryId?→Category, authorId?→User, title, slug (unique), excerpt?,
  content(Text), tocJson?(Json), featuredImage?, readingTime?, wordCount?, seoTitle?,
  metaDescription?, focusKeyword?, schemaJson?, faqContent?(Json), isPublished, isFeatured,
  publishedAt?, viewCount, clickCount, timestamps. Index slug, categoryId, (isPublished,
  publishedAt).
- **Comparison** — id, title, slug (unique), productIds(Json, 2–5), verdict?(Text), winnerId?,
  seoTitle?, metaDescription?, schemaJson?, faqContent?(Json), isPublished, viewCount,
  timestamps. (Add `productAId`/`productBId` relations as convenience for the common 2-way case;
  keep `productIds` Json for 3–5 per FR-039.)

### Affiliate & AI (§7.8–7.9, §9, §10)
- **AffiliateClick** — id, productId?→Product, asin, sourceUrl?, sourceType(enum
  product|guide|comparison|category|deals|search|other), ipHash?(64), userAgentHash?(64),
  country?, deviceType?(enum mobile|tablet|desktop), affiliateTag?, clickedAt. Index asin,
  clickedAt, productId, sourceType. **IP/UA SHA-256 only** = NFR-SEC-007.
- **AiQueue** — id, entityType(enum product|guide|comparison|category|brand), entityId, jobType,
  promptTemplate?, status(enum pending|processing|done|failed), priority, attempts, maxAttempts,
  errorMessage?, createdAt, startedAt?, completedAt?. Index (status,priority),(entityType,
  entityId). (Operational queue is BullMQ/Redis; this table is the durable audit/admin view.)
- **AiLog** — id, queueId?, entityType, entityId, jobType, modelUsed?, promptUsed?(Text),
  responseRaw?(Text), tokensInput?, tokensOutput?, costUsd?(Decimal 10,6),
  status(enum success|failed), errorMessage?, createdAt. Index (entityType,entityId), createdAt,
  status. 30-day retention (prune job) = FR-055.

### SEO / ops / system (§7.10, §11, §13)
- **Seo** — polymorphic (modelType, modelId) unique; seoTitle?, metaDescription?, focusKeyword?,
  secondaryKeywords?(Json), canonicalUrl?, ogTitle?, ogDescription?, ogImage?, schemaJson?,
  robots(default 'index,follow'), isNoindex, timestamps.
- **Redirect** — id, fromUrl, toUrl, type(default 301), hitCount, isActive, createdAt. Index
  fromUrl (prefix). (Powers FR-061 + route reconciliation in `05` §4.)
- **Setting** — id, key (unique), value?(Text), type(enum string|integer|boolean|json|text),
  group?, updatedAt. Encrypted-at-rest for secret groups (Amazon API, AI provider). Index group.
- **AuditLog** — id, userId?, modelType?, modelId?, event, oldValues?(Json), newValues?(Json),
  ipAddress?, userAgent?, createdAt. Index userId, (modelType,modelId), createdAt.
- **CronLog** — id, jobName, status(enum started|completed|failed), message?, durationMs?,
  createdAt. Index jobName.
- **SitemapLog** — id, sitemapType, urlCount?, filePath?, status(enum
  pending|generating|done|failed), generatedAt?, createdAt.
- **Media** — id, modelType, modelId, fileName, filePath, webpPath?, mimeType?, fileSize?,
  width?, height?, altText?, sortOrder, createdAt. Index (modelType, modelId).

### Analytics & search (§3.3, §13) — implied by FRs, added explicitly
- **SearchQuery** (FR-032) — id, query, resultsCount?, deviceType?, createdAt. Index query,
  createdAt.
- **SearchConsoleMetric** (§13.6) — composite key (date, pageUrl, query, device, country),
  clicks, impressions, ctr, position.
- **RevenueReport** (§13.4) — id, date, category?, actualRevenue?(Decimal), source(enum
  estimated|amazon_csv), createdAt. Unique (date, category, source).

## 3. Relationship summary

User n–1 Role; Role n–n Permission. Category self-referential (parentId). Product n–1 Category,
n–1 Brand?, 1–n ProductPriceHistory, 1–n AffiliateClick, 1–n Media (poly). Guide n–1 Category?,
n–1 User(author). Comparison → Products via Json + optional A/B relations. AiQueue/AiLog poly by
(entityType, entityId). Seo/Media/AuditLog polymorphic via (modelType, modelId).

## 4. Indexing & performance (§4.2)

- All spec indexes reproduced. Add `searchVector` GIN on Product (FR-028). Composite indexes on
  hot filters: (isPublished, categoryId), (isDeal, discountPercent), (categoryId, currentPrice),
  (brandId, currentPrice). AffiliateClick partitioned/retained by month at scale (future).
- Connection pooling (PgBouncer in prod) for stateless horizontal scaling.

## 5. Seeding (`prisma/seed.ts`)

Migrate `lib/data.ts` mock (12 products, 10 categories, 4 authors, 5 guides, 3 comparisons, 8
brands) → DB so the wired frontend renders identically on day one. Seed 7 roles + permission
matrix (spec §15.2.1) + default settings rows + a Super Admin user.

## 6. Field-name reconciliation (frontend ↔ DB)

Frontend `lib/types.ts` uses `name/currentPrice/originalPrice/affiliateUrl/reviewCount`; DB/spec
uses `title/current_price/mrp_price/affiliate_link/review_count`. The **API client (`07`)** maps
DB→frontend shapes so existing components stay untouched (preservation constraint).

## 7. Open items → `12`

- Soft-delete strategy (Prisma middleware vs explicit scopes). · Comparison 2-way relations vs
  pure Json. · `ai_queue` table vs BullMQ-only (chosen: keep table for admin/audit). · tsvector
  maintenance (trigger vs app-side update).
