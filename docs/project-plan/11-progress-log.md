# 11 — Progress Log (APPEND-ONLY)

> Chronological record of work. **Append a dated entry after every phase / significant session.**
> Newest at top. Never rewrite history; correct via a new entry.

---

## 2026-06-15 — Phase 12 complete: Production Hardening, Deployment Readiness & Final Audit
**By:** Claude · **Phase:** 12 (final — hardening + deploy + blueprint audit)

- **Scope:** the final hardening + deployment-readiness + blueprint-compliance phase. **No new features,
  no UI/route/color/component changes, no framework migration, nothing removed.** Verified the whole
  hardening surface, added the missing deployment artifacts, extended CI, and produced the final audit.
- **Production hardening (verified, evidence in the Security Audit report):** zod env validation with
  production-required secrets (`config/env.ts`); **httpOnly + `secure`(env) + `sameSite`(env)** cookies,
  refresh token scoped to `/api/auth`, **rotation + reuse-detection** (revoke-all on theft); CORS
  (credentialed, allow-list origins); **CSRF** double-submit on all writes; **6 rate limiters**; **Helmet
  + CSP** (verified on responses); `express.json({limit:'1mb'})` + urlencoded; **multer upload limits**
  (mime allow-list + `MEDIA_MAX_FILE_MB`); central error handler + 404; **structured pino logs +
  per-request IDs**; **audit logging** on every privileged write; AES-256-GCM secrets at rest;
  **`/healthz` (liveness)** + **`/readyz` (PostgreSQL + Redis, 503 on degraded)**.
- **Deployment readiness (added):** root **`Dockerfile`** (Next.js `output: 'standalone'` multi-stage) +
  `public/.gitkeep`; **`docker-compose.prod.yml`** — full 5-service production profile (Postgres, Redis,
  Express **api**, BullMQ **worker**, Next **web**) + a one-shot **migrate** job (migrate deploy + seed)
  + a **persistent uploads volume** + `QUEUE_DRIVER=bullmq`; root **`.env.example`** (frontend
  `BACKEND_ORIGIN`) + **`.env.production.example`** (all prod secrets) + an updated **`server/.env.example`**
  (every Phase 6–11 env var) + a production **`README.md`**.
- **CI/CD:** the existing backend job (install → prisma generate → migrate deploy → seed → typecheck →
  lint → build → tests, with Postgres + Redis services) was extended with a **frontend job** (install →
  typecheck → build).
- **Observability:** structured logs + request IDs (existing), `/healthz` + `/readyz` (DB+Redis), worker
  logs per queue, BullMQ on Redis (readiness covers Redis). Documented in the Production Readiness report.
- **Security audit:** reviewed auth / refresh / 2FA / RBAC / admin APIs / uploads / `/go` redirect /
  import inputs / AI outputs / newsletter / analytics collection / search endpoints — **no critical or
  high issues**; the public surfaces (search, recommendations, analytics beacon, newsletter, `/go`,
  `/uploads`) are validated + rate-limited + privacy-safe (SHA-256 IPs) + open-redirect-proof. Known
  low/medium limitations documented (no code change): the global 1 MB JSON limit caps the JSON CSV-import
  body below the schema's 20 MB; no upload virus scanning; offline GA4/GSC/PA-API.
- **Final blueprint compliance audit:** an FR-001…070 table (Implemented / Partial / Missing + evidence
  path + notes) plus audits of routes, admin screens, APIs, DB models, workflows, security, SEO,
  analytics, AI, affiliate, import, media, and deployment — in the Final Blueprint Compliance Report.
- **Configs added:** `Dockerfile`, `docker-compose.prod.yml`, `.env.example`, `.env.production.example`,
  `public/.gitkeep`, `README.md`, `next.config.js` (`output: 'standalone'`), `.github/workflows/ci.yml`
  (+frontend job), `server/.env.example` (expanded). **No application code changed.**
- **Verification (all green):** 11 migrations apply from an empty DB → seed (87 permissions, 5 roles,
  catalog/content/affiliate seeds, search index 42 entries) → **220/220 tests across 33 files**; backend
  `tsc`/`eslint`/`build` ✅; frontend `tsc`/`build` ✅ (42 pages, **standalone output produced**); health
  endpoints covered by tests.
- **Decisions:** ADR-029 (production deployment topology — standalone Next image + 5-service compose +
  one-shot migrate + bullmq driver + persistent uploads volume). **Final compliance: ~72% behavioural /
  ~80% surface** (spec §7 DB models ~100%, §8 endpoints ~88%); the remainder is genuinely out-of-scope
  external integration (live PA-API / GA4 / GSC / Indexing API) + ops infra (CDN/WAF/k8s), documented in
  the Remaining Work report.

**This is the final phase — all 12 phases complete. The platform is production-ready pending external
credentials + hosting.**

---

## 2026-06-15 — Phase 11 complete: Recommendation Engine, Advanced Search & Internal Linking
**By:** Claude · **Phase:** 11 (Discovery intelligence)

- **Scope:** discovery intelligence — advanced search, related products/guides/comparisons,
  recommendation engine, internal-linking automation, and recommendation APIs. No Deployment/Prod-infra/
  Final-audit. All existing UI/routes/colors/components + SSR/SEO + auth/RBAC + affiliate/import/AI/
  analytics/marketing/media preserved; only additive (`/admin/search` route + nav + real recommendations
  swapped into the existing related-content sections).
- **Database (migration `20260615212232_discovery_search_recommendations`):** `SearchSynonym` (term
  unique, synonyms Json, isActive), `SearchIndexEntry` (entityType, entityId, title, body, keywords,
  boost, url/image — unique (entityType,entityId)), `RecommendationRule` (name, type, conditions Json,
  weight, isActive, createdBy), `InternalLink` (source/target type+id, anchorText, targetUrl, status
  suggested|approved|rejected|broken, score — unique 4-tuple). Enum SearchEntityType + InternalLinkStatus.
- **Search index (`index.service.ts`):** `rebuildIndex()` denormalises every published product/active
  category/brand/published guide/comparison/active author into one `SearchIndexEntry` table (boost from
  review counts) and prunes stale entries. Built by the seed + the discovery worker. A single index =
  unified, weighted, fuzzy-capable search across all 6 types.
- **Advanced search (`search.service.ts`, ADR-028):** tokenise → **synonym-expand** → match across
  title/body/keywords → **score** (field weights × entry boost × hit count, incl. a fuzzy near-miss
  bonus) → group by entity type. **Fuzzy** via a bounded Levenshtein; **zero-result → did-you-mean +
  suggestions**; **trending** from `SearchQuery` (last 7 days). Every query logged (FR-032).
- **Recommendation engine (`recommend.service.ts`):** blends **category / brand / price-proximity /
  rating / trending (recent ProductView) / affiliate-performance (recent AffiliateClick)** signals,
  weighted by active `RecommendationRule`s (defaults otherwise). `relatedProducts`, `similarProducts`
  (brand-agnostic), `categoryRecommendations`, `brandRecommendations`, `priceRangeRecommendations`,
  `trendingProducts`, `relatedGuides` (shared category/products), `relatedComparisons` (shared product).
  Outputs reuse the catalog/content presenters → public SSR consumes them unchanged.
- **Internal linking (`linking.service.ts`):** `generateSuggestions(guide|comparison)` produces
  **suggested** links (top-rated products in the source's category + same-category guides) with generated
  anchor text — **never auto-inserted** (review workflow: suggested→approved|rejected). `detectBrokenLinks`
  scans published content for internal `/type/slug` links whose slug no longer exists.
- **Queue:** `discoveryQueue.ts` (inline/bullmq, ADR-023) + `discovery.worker.ts` (index-refresh hourly,
  recommendation-recalc, internal-link-suggestions, broken-link-detection daily) wired into `jobs/worker.ts`.
- **APIs (RBAC + CSRF + audit + Swagger):** public `GET /search/advanced|/suggestions|/trending`,
  `GET /recommendations/products|/content`; admin `GET/POST/PATCH/DELETE /search/synonyms` + `POST
  /search/reindex` (search.manage); `GET/POST/PATCH/DELETE /recommendations/rules` +
  `/recommendations/internal-links` (+ generate/detect-broken) (recommendations.view/manage). New
  permissions `search.manage`, `recommendations.view`, `recommendations.manage`.
- **Public UI wiring:** the **product / guide / comparison detail SSR** now fetch **DB-backed
  recommendations** (`lib/api/ssr.ts` helpers) with a graceful fallback to the prior category filter —
  same `relatedProducts`/`relatedGuides`/`relatedComparisons` prop shapes, **no visual change**. The
  public search page's **trending chips** now use real `/api/search/trending` (fallback preserved);
  recent searches stay frontend-only as specified.
- **Admin UI:** new **`/admin/search` (Discovery)** screen + nav — Synonyms, Recommendation Rules,
  Internal Links (generate/review/broken-scan), and Search Analytics tabs, built in the existing card/
  table design language. `lib/api/discovery.ts` client.
- **DB migrations added:** `20260615212232_discovery_search_recommendations`. **API endpoints added:** 18.
  **Workers added:** 1 (`discovery`). Seed now builds the search index (42 entries).
- **Tests added:** +3 unit (`discovery`: tokenizer stopwords, Levenshtein) + 8 integration
  (`discovery.integration`: weighted advanced search, **fuzzy misspelling**, suggestions+trending,
  **synonym expansion** + RBAC, DB-backed product/content recommendations, rule CRUD + RBAC + CSRF,
  internal-link generate/review + broken scan, on-demand reindex). **220/220 green** vs embedded Postgres
  (was 209; +11). Backend tsc/eslint/build clean; Next build clean (/admin/search + /search compile).
- **Decisions:** ADR-028 (unified search-index table + weighted/fuzzy/synonym search without a tsvector
  extension; recommendation blend with affiliate weighting; review-only internal links). Compliance
  ~69% → ~72% behavioural; FR-027…032 (search) deepened to real advanced search.
- **Deviations from `09`:** search uses a denormalised index table + JS scoring (not Postgres tsvector/
  pg_trgm) — portable + extension-free; tsvector/GIN is a future optimization. The public search-page
  **results grid** still renders the existing client dataset (the advanced-search API is DB-backed +
  consumed by SSR recommendations); fully swapping the grid is a follow-up. Documented in Remaining Work.

**Next:** stop. Phase 12 (deployment/hardening/final audit) only on explicit user go-ahead.

---

## 2026-06-15 — Phase 10 complete: Media Library & Asset Management
**By:** Claude · **Phase:** 10 (Media library, upload, optimization, usage tracking)

- **Scope:** a production-ready Media Library — asset storage, multi-file upload (drag-drop), image
  optimization (webp/thumbnail/responsive), metadata, folders, search, replace, delete, usage tracking,
  and unused-asset detection. No Recommendation/Deployment/Final-audit. All existing UI/routes/colors/
  components + SSR/SEO + auth/RBAC + affiliate + import + AI + analytics + marketing preserved; only an
  **additive** new `/admin/media` route + nav entry (the blueprint media model `06 §7.10` existed but
  no UI/model/API did).
- **Database (migration `20260615203900_media_library`):** `MediaAsset` (filename, originalName,
  mimeType, size, width?, height?, altText?, caption?, storagePath, **variants Json**, **hash unique**,
  folderId?, createdById?), `MediaUsage` (mediaId Cascade, entityType, entityId, field?, unique
  (mediaId,entityType,entityId,field)), `MediaFolder` (name, parentId self-tree). Refines the blueprint
  polymorphic `Media` into asset + usage tables (ADR-027).
- **Storage + optimization (`services/media/storage.ts`, ADR-027):** files on local disk under
  `UPLOAD_DIR` (served statically at `/uploads`; `MEDIA_BASE_URL` prefixes the public URL). **sharp**
  reads dimensions and generates a full-size **webp**, a **thumbnail** (320w webp), and **responsive
  sizes** (640/1024/1600 ≤ original). **SVG** stored as-is (vector — no raster variants). Content
  **SHA-256 hash** → duplicate detection + stable filenames. Optimization degrades gracefully on error.
- **Upload (`middleware/upload.ts`):** multer (memory) — up to 20 files under `files`, `MEDIA_MAX_FILE_MB`
  limit, mime allow-list (jpg/jpeg/png/webp/svg), multer errors mapped to 400.
- **Media service:** upload (validate→hash→dedup→optimize→persist), list/search (folder/type/name/unused
  filters), get (+usages), update metadata, **replace in place** (keeps id → all references update; hash
  re-checked for clashes), delete (+remove files), usage attach/detach/list, unused list, stats
  (count/size/by-type/unused/folders), folders CRUD.
- **AI + Import integration:** `attachMediaByUrl(url, entityType, entityId, field)` links an asset by its
  `/uploads/...` URL — **no image generation, linking only**. The import processor calls it for CSV
  `imageUrl` columns so **CSV imports attach media**; the same helper lets AI-generated content reference
  assets. The media-usage API exposes manual linking too.
- **APIs (`/api/media/*`, RBAC + CSRF + audit + Swagger):** `POST /upload` (media.upload); reads `GET
  /media|/search|/unused|/stats|/folders|/:id|/:id/usage` (media.view); manage `POST /:id/replace`,
  `PATCH /:id`, `DELETE /:id`, `POST/DELETE /:id/usage`, `POST/DELETE /folders` (media.manage). Static
  `GET /uploads/*`. New permissions `media.upload`, `media.manage` (+ `media` CRUD module; granted to
  editor + author-upload + analyst-view).
- **Frontend:** new `lib/api/media.ts` (+ multipart upload helper) + **new `/admin/media` page** matching
  the existing admin design language — stat cards, drag-drop dropzone, search + unused toggle, a
  thumbnail grid with copy-URL / replace / delete, and a detail modal (preview, dimensions, alt-text
  edit, replace, **usage viewer**). Added a "Media Library" sidebar nav entry.
- **DB migrations added:** `20260615203900_media_library`. **API endpoints added:** 17 (+ static
  `/uploads`). **Deps added:** `sharp`, `multer`, `@types/multer`.
- **Tests added:** +5 unit (`media`: mime allow-list, hash dedup, public URL, **sharp optimization**
  produces webp/thumb/responsive + dimensions, SVG no-variants) + 7 integration (`media.integration`:
  RBAC 401/403/200, CSRF, **real upload + optimize + static serve + dedup**, bad-type 400, list/search/
  metadata, **usage tracking + unused detection**, **replace + stats + delete**). **209/209 green** vs
  embedded Postgres (was 197; +12). Backend tsc/eslint/build clean; Next build clean (/admin/media compiles).
- **Decisions:** ADR-027 (local-disk media storage + sharp pipeline + asset/usage split + hash dedup).
  Compliance ~66% → ~69% behavioural; `Media` DB model + FR-014 (WebP gallery) tie-in.
- **Deviations from `09`:** storage is **local disk** (offline-safe) rather than the spec's CDN/S3 — a
  deployment swap (the URL layer is abstracted). Media was a "next/future" roadmap item with only the
  `Media` model sketched. Documented in the Remaining Work report.

**Next:** stop. Phase 11 only on explicit user go-ahead.

---

## 2026-06-15 — Phase 9 complete: Marketing & Communication Center
**By:** Claude · **Phase:** 9 (Newsletter, subscribers, campaigns, email automation)

- **Scope:** the complete Marketing & Communication Center — newsletter subscribe/double-opt-in/
  unsubscribe, subscriber management, email campaigns (CRUD/schedule/test/send), email templates,
  delivery automation, and open/click tracking. **This is a feature beyond the base blueprint** (the
  `/admin/marketing` screen was a mock; no marketing FRs/models/APIs existed — see ADR-026). No Media
  Library / Recommendation / Deployment. All existing UI/routes/colors/cards/layouts + SSR/SEO + auth/
  RBAC + affiliate + import + AI + analytics preserved.
- **Database (migration `20260615195416_marketing_communication`):** `NewsletterSubscriber` (email
  unique, status, source, tags Json, **verifyTokenHash SHA-256**, unsubscribeToken unique, verifiedAt,
  subscribedAt, unsubscribedAt), `Campaign` (name, subject, template, content, entityId, segmentTag,
  status, scheduledAt, sentAt, recipient/delivered/opened/clicked/failed/bounced counts, createdById),
  `CampaignRecipient` (campaign+subscriber Cascade, status, deliveredAt/openedAt/clickedAt, unique
  (campaignId,subscriberId)), `EmailEvent` (campaignId?, recipientId?, subscriberId?, type, metadata).
  Enums SubscriberStatus / CampaignStatus / CampaignRecipientStatus / EmailEventType.
- **Email provider (ADR-026 reuses ADR-015):** the existing `EmailProvider` abstraction (Resend when
  `RESEND_API_KEY` set, else **console** fallback) powers marketing too — **offline/CI works with no
  keys**. A thin `sendMarketingEmail` returns a per-recipient success boolean (with retry) so campaigns
  track delivered vs failed. Templates: newsletter + product/guide/comparison announcements (reuse
  AI-generated product/guide/comparison copy) + welcome + double-opt-in confirm, all with a one-click
  unsubscribe footer + open-tracking pixel + click-tracking links.
- **Newsletter (`newsletter.service.ts`):** subscribe (idempotent + dedup; double opt-in → pending +
  verification email, or single opt-in → active + welcome), verify (hashed-token confirm → active +
  welcome), unsubscribe (token/email, idempotent), plus subscriber management — list (search/filter/
  tag), stats (total/active/pending/unsubscribed/bounced + 30-day growth + tag segments), CSV export,
  admin add/update(tags,status)/delete.
- **Campaigns (`campaign.service.ts`):** create/update (draft+scheduled only)/list/get/schedule/send-
  test/send/retry/delete; open + click tracking update recipient + campaign counters + EmailEvent; a
  marketing dashboard (subscribers + avg open/click rate + 7-day performance series + segments).
  Delivery (`delivery.ts`): batched send to active subscribers (optional tag filter), per-recipient
  render + send + status, final counters; runs via the inline driver (dev/test) or the BullMQ worker.
- **Queue:** `marketingQueue.ts` (inline/bullmq, ADR-023) + `marketing.worker.ts` (welcome/verification/
  campaign-send/campaign-retry/cleanup; repeatable daily cleanup) wired into `jobs/worker.ts`.
- **APIs (`/api/marketing/*` + `/api/newsletter/*`, RBAC + CSRF + audit + Swagger):** public `POST
  /newsletter/subscribe`, `POST/GET /newsletter/unsubscribe`, `GET /newsletter/verify`, `GET /marketing/
  track/open/:id.gif`, `GET /marketing/track/click/:id`; admin reads (marketing.view) dashboard/
  subscribers(+stats/export)/campaigns/events/templates/provider; subscriber writes (newsletter.manage);
  campaign writes (campaign.manage). New permissions `marketing.manage`, `newsletter.manage`,
  `campaign.manage` (+ `marketing` CRUD module; granted to editor; marketing.view to analyst).
- **Frontend:** new `lib/api/marketing.ts` (+ public `subscribeNewsletter`); **`/admin/marketing` wired
  off mock** — 4 stat cards (real subscribers + avg open/click + confirmed), Newsletter tab (real
  performance chart + working Compose → create/send campaign + real delivery/bounce/unsub quick-stats),
  Campaigns tab (real campaign table + delete), Audience Segments tab (real tag segments). Card/chart/
  tab styling + colors unchanged; the Push Notifications tab (out of scope) is left as-is.
- **DB migrations added:** `20260615195416_marketing_communication`. **API endpoints added:** 25.
  **Workers added:** 1 (`marketing` queue worker + daily cleanup schedule).
- **Tests added:** +8 unit (`marketing`: email normalisation, verify-token hashing, templates +
  unsubscribe/pixel injection, product-announcement CTA, offline provider) + 8 integration
  (`marketing.integration`: RBAC 401/403/200, CSRF, **subscribe double-opt-in + dedup**, **verify token
  → active**, unsubscribe, subscriber add/list/export, **campaign create→test→send (inline) + open/click
  tracking counters**, provider/templates). **197/197 green** vs embedded Postgres (was 181; +16).
  Backend tsc/eslint/build clean; Next build clean (/admin/marketing compiles).
- **Decisions:** ADR-026 (Marketing Center as a beyond-spec feature; reuse the email provider; double
  opt-in with hashed tokens; first-party open/click tracking). Compliance ~62% → ~66% behavioural.
- **Deviations from `09`:** Marketing was "future/next" in the roadmap and has **no formal FRs** — built
  per the user's Phase 9 spec. Push Notifications (a mock tab) is out of the required scope and left
  unwired. Documented in the Remaining Work report.

**Next:** stop. Phase 10 only on explicit user go-ahead.

---

## 2026-06-15 — Phase 8 complete: Analytics & Reporting Center
**By:** Claude · **Phase:** 8 (Analytics engine, reporting, dashboards)

- **Scope:** a real analytics & reporting subsystem (spec §13) connecting all existing event sources
  into dashboards + reporting APIs, plus new first-party view tracking. FR-032 (search logging, already
  live) + FR-057/062/063 (dashboard KPIs / analytics admin / affiliate reporting) + the user's
  product/search/revenue/AI/content/traffic analytics. No Marketing/Media/Recommendation/Deployment.
  All existing UI/routes/colors/cards/layouts + SSR/SEO + auth/RBAC + affiliate + import + AI preserved.
- **Database (migration `20260615192156_analytics_reporting`):** `AnalyticsEvent` (eventType enum,
  entityType/entityId, sessionId, userId?, **ipHash SHA-256 only**, country, device, metadata),
  `PageView` (url, referrer, device, country, sessionId, ipHash), `ProductView` (productId→Product
  Cascade, sessionId, country, device), `ReportSnapshot` (type, payload Json, period, createdById?).
  Enum `AnalyticsEventType` (page/product/guide/comparison/author/category/brand view, search,
  affiliate_click, ai_generation, revenue_import, import_job, admin_action).
- **Privacy (NFR-SEC-007):** raw IPs are **never** stored — the collector hashes via `lib/tokens.sha256`;
  the events presenter never returns ipHash. Verified by an integration test asserting no `ip`/`ipHash`
  in the API response.
- **Tracking:** `services/analytics/tracking.service.ts` writes the unified `AnalyticsEvent` + derived
  `PageView`/`ProductView`, then fire-and-forget forwards to external providers. Ingested via a public,
  validated, rate-limited `POST /api/analytics/collect` beacon fired by an **invisible** `<AnalyticsBeacon>`
  (renders null) mounted in the 6 detail islands — zero visual change. Clicks/AI/search/imports are
  already recorded server-side from their trusted flows.
- **Analytics engine (`analytics.service.ts`):** `getDashboard` (page/product/guide/comparison views,
  affiliate clicks, revenue, AI cost, search count, import count, sessions/users/bounce, traffic series,
  devices, geo, top pages, traffic sources, real-time, period deltas), `getProductAnalytics` (most
  viewed/clicked/highest-revenue/trending), `getSearchAnalytics` (top/zero-result/trends), `getRevenue
  Analytics` (daily/weekly/monthly + by category/brand + clicks×CVR×commission estimate, §13.4),
  `getAiAnalytics` (tokens/cost/provider/model/generation/failed), `getContentAnalytics` (top guides/
  comparisons/authors/categories/brands), `listEvents`, report snapshots (`generateReport`/`listReports`/
  `getReport`/`deleteReport`), `pruneRawAnalytics` (retention).
- **External adapters (ADR-025):** `providers.ts` — PostHog / GA4 (Measurement Protocol) / GSC adapters;
  `ANALYTICS_DRIVER=mock` (default) keeps everything **offline + no-op** (CI-safe), `live` forwards only
  to providers with credentials. First-party DB analytics never depend on these.
- **Queue:** `analyticsQueue.ts` (inline/bullmq, ADR-023) + `analytics.worker.ts` (daily/weekly/monthly
  report rollups + daily cleanup prune; repeatable cron when bullmq) wired into `jobs/worker.ts`.
- **APIs (`/api/analytics/*`, RBAC + CSRF + audit + Swagger):** public `POST /collect`; reads `GET
  /dashboard|/products|/search|/revenue|/ai|/content|/providers|/events` (analytics.view); `GET /reports`,
  `/reports/:id` (reports.view); `POST /reports`, `DELETE /reports/:id` (reports.manage, CSRF+audit).
  New permissions `analytics.manage`, `reports.view/create/manage` (granted to editor; reports.view to
  analyst).
- **Frontend:** new `lib/api/analytics.ts` (+ `track()` beacon) + `components/analytics/AnalyticsBeacon.tsx`;
  **`/admin/analytics` wired off mock** — 4 stat cards (real users/sessions/page-views/bounce with real
  period-delta chips), real-time banner, Overview (traffic/devices/top-pages), Traffic Sources, Geographic,
  Content Performance tabs all real; Export downloads the live snapshot. Card/chart/tab styling + colors
  unchanged.
- **DB migrations added:** `20260615192156_analytics_reporting`. **API endpoints added:** 14. **Workers
  added:** 1 (`analytics` queue worker; 4 repeatable schedules).
- **Tests added:** +6 unit (`analytics`: date ranges, offline provider abstraction) + 6 integration
  (`analytics.integration`: RBAC 401/403/200, CSRF, **public beacon + aggregation + privacy (no PII)**,
  forged-event rejection, all section shapes, **report generate/list/get/delete + RBAC**). **181/181
  green** vs embedded Postgres (was 169; +12). Backend tsc/eslint/build clean; Next build clean
  (/admin/analytics compiles).
- **Decisions:** ADR-025 (analytics provider abstraction + offline mock + invisible first-party beacon +
  privacy-safe ingestion). Compliance ~55% → ~62% behavioural.
- **Deviations from `09`:** Phase-9-in-roadmap GA4/GSC are delivered as **offline adapters** (per the
  task's "adapters only, no live creds"); live OAuth ingestion + `SearchConsoleMetric` upsert are a
  deployment task. View tracking is first-party (beacon) rather than GA4-only. Documented in the
  Remaining Work report.

**Next:** stop. Phase 9 only on explicit user go-ahead.

---

## 2026-06-15 — Phase 7 complete: AI Content Engine & AI Center
**By:** Claude · **Phase:** 7 (AI content engine, providers, prompts, review, AI Center)

- **Scope:** the complete AI content engine + AI Center — queue-based generation with a provider
  abstraction (Claude primary / OpenAI fallback / Gemini), 10 admin-editable prompt templates,
  per-field generation, quality validation, a review-before-index approval gate, AI logs with cost/
  token accounting, auto-trigger on import, and the wired `/admin/ai`. FR-050…055 + FR-006/038/041/060.
  No Analytics/Marketing/Media/Search-upgrade/Recommendation work. **Blueprint precedence honoured**:
  the blueprint does not prescribe an AI-Center layout (FR-060 lists functions only), so the existing
  structure was preserved and the one required new surface (a Prompts tab, approved by the user) was
  integrated in the existing design. Colors/spacing/cards/nav/component styling unchanged.
- **Database (migration `20260615184450_ai_content_engine`):** `AiQueue` (entityType/entityId
  polymorphic, jobType, status pending|processing|done|failed, priority, attempts/maxAttempts, result
  Json, approved + approvedAt review gate, errorMessage, timestamps), `AiLog` (queueId?, entity refs,
  jobType, modelUsed, provider, promptUsed, responseRaw, tokensInput/Output, costUsd Decimal(10,6),
  status success|failed, errorMessage, createdAt — 30-day retention per FR-055), enums AiEntityType/
  AiJobType/AiQueueStatus/AiLogStatus/AiContentStatus, and `Product.aiStatus`/`aiGeneratedAt` (06 §7.9).
- **Provider abstraction (ADR-024):** `services/ai/providers.ts` — `AI_DRIVER=mock` (default) returns
  deterministic, zero-cost content offline (dev/test/CI); `live` calls Anthropic → OpenAI → Gemini
  REST APIs in priority order with fallback. Per-model pricing → cost in USD. `AI_PRIMARY_PROVIDER`
  (default anthropic), keys via env.
- **Engine:** `prompts.ts` (10 §10 templates in Settings group `ai_prompts`, defaults + `{{var}}`
  renderer, job→template map), `validation.ts` (§10.5 — JSON shape for pros/cons/faq, length bounds,
  placeholder/refusal guards), `engine.ts` (polymorphic entity load → prompt vars; `applyApprovedResult`
  writes approved content to entity fields — only on approval, the review gate), `processor.ts`
  (mark processing → generate → validate → write AiLog → store result `done` for review / `failed`).
- **Queue:** `aiQueue.ts` inline/bullmq dispatch (ADR-023 reuse) + `aiBullmq.ts` + `ai-generation.worker.ts`
  (concurrency `AI_CONCURRENCY`, default 4 — FR-051) wired into `jobs/worker.ts`.
- **Auto-trigger (FR-006/050):** the import processor enqueues product AI jobs after each successful
  product import (best-effort — never fails the import).
- **APIs (`/api/ai/*`, RBAC + CSRF + audit + Swagger):** reads `GET /stats|/queue|/queue/:id|/logs|
  /providers|/usage|/prompts` (ai.view); `POST /generate|/bulk-generate|/queue/retry/:id|
  /queue/retry-all-failed` (ai.generate); `POST /queue/approve/:id`, `PUT /prompts/:type` (ai.manage).
  New permission `ai.manage` (+ granted to EDITOR). The §2.6 per-entity generate-ai/regenerate-ai
  endpoints are satisfied by `POST /api/ai/generate { entityType, entityId }` (codebase /api/<domain>
  convention) — no edits to catalog/content routers, no new frontend route.
- **Frontend:** new `lib/api/ai.ts`; **`/admin/ai` wired off mock** — real stat cards, AI Queue (live
  poll + retry + **approve & apply**), **AI Logs tab filled** (was blank), AI Providers (real config +
  usage), Usage & Costs (real daily/provider/cost charts), and the **new Prompts tab** (edit + save the
  10 templates). Same card/tab/chart styling + brand colors; "New AI Job" → bulk-generate, Refresh wired.
- **DB migrations added:** `20260615184450_ai_content_engine`. **API endpoints added:** 13.
- **Tests added:** +10 unit (`ai`: prompt render/map, validation rules, mock provider determinism +
  JSON shapes + cost) + 7 integration (`ai.integration`: RBAC 401/403/200, CSRF, generate→done + cost
  logs, **review-gate approval applies content**, prompts list/edit/persist + unknown-type 400, stats/
  providers/bulk/retry-all, **import auto-trigger enqueues AI**). **169/169 green** vs embedded Postgres
  (was 161; +17). Backend tsc + eslint + build clean; Next build clean (/admin/ai compiles).
- **Decisions:** ADR-024 (AI provider abstraction + offline mock driver + review-before-index gate).
  Compliance ~48% → ~55% behavioural.
- **Deviations from `09`:** ASIN-imported products still generate from a **draft stub** (real PA-API
  enrichment is a later phase); JSON-LD `schema` + `internal_links` prompt templates are editable but
  not yet auto-applied to entities (generation focuses on the FR-050 product fields + verdict/category/
  guide). Documented in the post-implementation compliance report.

**Next:** stop. Phase 8 only on explicit user go-ahead.

---

## 2026-06-15 — Phase 6 complete: Import Center & Catalog Automation
**By:** Claude · **Phase:** 6 (Import Center, queue system, catalog automation)

- **Scope:** the complete Import Center — CSV/bulk product import, ASIN import, nested category
  import, duplicate detection, import jobs + items + templates, a BullMQ/Redis queue system with 3
  workers, detailed import reports, and the wired `/admin/import` admin workflow. FR-015…FR-021.
  No AI/Analytics/Marketing/Media/Search-upgrade/Recommendation work. UI/routes/colors/components +
  SSR/SEO + auth/RBAC + affiliate preserved; no mock data reintroduced.
- **Database (migration `20260614205429_import_center`):** `ImportJob` (type, name?, status, source,
  duplicateMode, totalItems/processedItems/successCount/failedCount/skippedCount, startedAt?/
  completedAt?, createdById?, metadata? Json, report? Json, error? Text), `ImportItem` (jobId Cascade,
  position, externalId?, status, errors? Json, rawData? Json, createdProductId?/createdCategoryId?
  SetNull), `ImportTemplate` (name, type, mappings Json, createdById?). Enums ImportType
  {csv_product,asin,category}, ImportJobStatus {pending,processing,completed,failed,cancelled},
  ImportItemStatus {pending,success,failed,skipped,duplicate}, DuplicateMode {skip,overwrite,
  create_copy}. cuid IDs (ADR-017). 7th migration — all apply cleanly from an empty DB.
- **Queue system (ADR-023):** `QUEUE_DRIVER` (`inline`|`bullmq`, default `inline`). `dispatchImport`
  runs `processImportJob` in-process when inline (tests/dev need no Redis) or enqueues to a per-type
  BullMQ queue (attempts 3, exponential backoff) when bullmq. 3 workers — `csv-import.worker.ts`,
  `asin-import.worker.ts`, `category-import.worker.ts` — call `processImportJob` with progress, wired
  into `jobs/worker.ts` (started + graceful shutdown). Progress tracking, retry, failure + completion
  handling.
- **Engines:** shared `lib/csv.ts` (RFC-4180-ish parser, header→object mapping, money parsing);
  `processor.ts` (loads job+items, marks processing, dispatches per type, records per-item outcome,
  writes the final report + status); product import (exact columns asin,title,brand,category,price,
  originalPrice,rating,reviewCount,imageUrl,description; required-field + ASIN-format validation;
  draft `isPublished:false` products; findOrCreate brand/category); ASIN import (stub draft product per
  new ASIN); nested category import (parent mapping via name, slug gen, self-parent guard).
- **Duplicate detection:** `detectProductDuplicate` matches by **asin → slug → title**; modes
  **skip** (mark duplicate), **overwrite** (update keeping asin/slug stable), **create-copy** (new
  record; synthetic unique ASIN when the match was on ASIN). Configurable per import.
- **Import reports:** `{imported, duplicates, skipped, failed, total, durationMs, startedAt,
  completedAt, errors[]}` stored on `ImportJob.report` and exposed at `GET /api/import/jobs/:id/report`.
- **APIs (`/api/import/*`, RBAC + CSRF + audit + Swagger):** reads `GET /stats|/jobs|/jobs/:id|
  /jobs/:id/report|/templates` (import.view); creates `POST /csv|/asins|/categories` (import.create);
  manage `POST /jobs/:id/retry|/jobs/:id/cancel`, `POST/DELETE /templates` (import.manage). New
  permission `import.manage` (+ `import.create` granted to EDITOR); all writes JWT+CSRF+audited.
- **Frontend:** new `lib/api/import.ts`; **`/admin/import` fully wired off mock** — real stat cards
  (active/queued/today/success-rate), Import Queue with live progress polling + cancel, History table
  with retry, and a functional 3-step wizard (type → configure → result) for CSV (drag-drop + paste),
  ASIN (paste list) and Category (nested `Child | Parent`) with duplicate-mode selection. Same
  card/tab/wizard visual language + brand colors (URL import kept in UI, flagged not-yet-available).
- **DB migrations added:** `20260614205429_import_center`. **API endpoints added:** 12.
- **Tests added:** +9 unit (`import`: CSV parse/quoting/CRLF, header mapping, money parsing, row
  validation) + import integration (RBAC 401/403/200, CSRF, CSV import + report, ASIN import +
  duplicate detection, nested category import, listing + stats). **161/161 green** vs embedded
  Postgres (was 152; +9). Backend tsc + eslint clean; Next build clean; backend build clean.
- **Decisions:** ADR-023 (inline-vs-bullmq queue driver). Compliance ~38% → ~42%.
- **Deviations from `09`:** URL import (in the original mock UI) is **not** in the FR set (015–021) and
  has no PA-API yet — the card is preserved but flagged "not available yet" rather than faked. ASIN
  import creates a **draft stub product** (title/price enrichment awaits the PA-API phase).

**Next:** stop. Phase 7 (AI / analytics / etc.) only on explicit user go-ahead.

---

## 2026-06-15 — Phase 5 complete: Affiliate System
**By:** Claude · **Phase:** 5 (Affiliate engine, click tracking, revenue)

- **Scope:** the complete affiliate system — redirect engine, privacy-safe click tracking,
  associate-tag management, campaigns, compliance, revenue CSV import. No AI/Analytics/Marketing/
  Import-Center/Revenue-Forecasting/Media work. UI/routes/colors/components + SSR/SEO preserved.
- **Database (migration `20260614202504_affiliate_revenue`):** `AffiliateClick` (asin, productId?,
  sourceType, **ipHash/userAgentHash SHA-256 only**, deviceType, country, campaignId?, clickedAt),
  `AffiliateCampaign` (slug, optional tag override, active window), `AffiliateSettings` (singleton:
  associate tag, domain, linkCode, disclosure, trackingEnabled), `RevenueImport` (file, source,
  status, totals, period), `RevenueReport` (date, asin?, category?, actualRevenue, orders, clicks,
  source). Enums AffiliateSourceType/AffiliateDeviceType/RevenueSource/ImportStatus. cuid IDs (ADR-017).
- **Redirect engine (ADR-022):** Express `GET /go/:asin` — validates ASIN + **amazon.in whitelist**,
  builds `amazon.in/dp/{ASIN}?tag=…&linkCode=ogi&th=1&psc=1` from cached settings (or `?c=` campaign
  tag), **302 in <100ms** (no awaited DB), then **fire-and-forget privacy-safe click log**
  (SHA-256 ip/UA, device from UA, country from `CF-IPCountry`, `?src=` source). Invalid ASIN → safe
  fallback. Next rewrite `/go/:path*` → backend.
- **APIs (`/api`, RBAC `affiliate.*` + CSRF + audit + Swagger):** `GET /affiliate/{stats,clicks,
  top-products,compliance}`, `GET/PUT /affiliate/settings`, campaigns CRUD; `POST /revenue/import`
  (JSON `{csv}` — no multer), `GET /revenue/{imports,reports,summary}`. Compliance checklist (FR-063):
  associate-tag, whitelist, IP-privacy, disclosure, disclosure-page, tracking → score.
- **Frontend:** new `lib/api/affiliate.ts`; **`/admin/affiliate` fully wired off mock** — real stat
  cards (revenue/clicks/conversions/EPC), earnings chart (daily), top products, device + traffic
  breakdown, recent-clicks table, **revenue CSV upload** + import history, **associate-tag settings**,
  **campaigns CRUD**, **compliance checklist** — same card/tab/chart visual language, brand colors.
  Storefront affiliate CTAs (product + comparison detail islands) routed through `/go/{asin}?src=…`
  with `rel="nofollow sponsored"` (visually identical).
- **Seed:** AffiliateSettings (tag `cslifestyle-21` + disclosure), 2 campaigns, **544 sample clicks**
  (30 days, hashed), **272 estimated revenue rows** + a sample import — so the dashboard shows real DB
  data, not mock.
- **DB migrations added:** `20260614202504_affiliate_revenue`. **API endpoints added:** ~16 (+ `/go`).
- **Tests added:** +9 unit (`affiliate`: ASIN/url/whitelist/device/source/CSV) + ~11 integration
  (`affiliate.integration`: /go 302+tag, campaign tag, invalid-ASIN fallback, **privacy-safe logging**
  (no ip/UA exposed), RBAC 401/403/200, stats/top/compliance, settings get/update, campaign CRUD,
  revenue import+summary, bad-CSV 400). **137/137 tests green** vs real embedded Postgres (no
  regression). Live smoke: `/go` through the Next rewrite → 302 to amazon.in with tag; product SSR
  page CTA = `/go/…` + `rel=sponsored` + Product JSON-LD + canonical intact (**SSR/SEO preserved**).
- **Decisions:** ADR-022 (backend `/go` redirect; privacy-safe async logging; build-from-ASIN
  whitelist; JSON CSV import).
- **Compliance delta:** behavioural ~38% → ~44%; surface ~52% → ~57%. FR-044/046/049 (redirect/
  tracking/whitelist), FR-062 (affiliate dashboards), FR-063 (compliance) → ✅; revenue-import path live.
- **Blockers / risks:** none blocking. Notes: conversions/revenue come from imported Amazon CSVs (no
  live order API); click→revenue attribution is per-ASIN/day; campaign attribution via `?c=` on /go.

**Next:** await user direction (AI content, Import Center, Analytics…). Stopping after Phase 5.

## 2026-06-15 — Phase 4 complete: SSR & SEO Foundation
**By:** Claude · **Phase:** 4 (SSR & SEO)

- **Scope:** server-render the 6 implemented detail routes + SEO artefacts. No Affiliate/AI/Import/
  Analytics/Marketing/Revenue/Media work. No design/route/component/API/RBAC changes.
- **SSR conversion (ADR-021):** every detail route — `products/[slug]`, `categories/[slug]`,
  `brands/[slug]`, `guides/[slug]`, `comparisons/[slug]`, `authors/[slug]` — split into an **async
  Server Component `page.tsx`** + a **client island `*-detail.tsx`**. The existing interactive UI
  (galleries, tabs, filters, framer-motion) moved verbatim into the island and now receives data via
  **props**; client-side `useEffect` fetching + loading states removed. Real **404** via
  `notFound()`. `categories/[slug]` "Related Guides" now DB-backed too (last `lib/data` import in a
  converted route removed).
- **Server-side data:** new `lib/api/ssr.ts` fetches the existing API at absolute `BACKEND_ORIGIN`
  (browser rewrite is client-only), anonymous → published/active; resilient (`try/catch`) so build
  survives a down backend; slug lists paginate at the API's 100/page cap.
- **Metadata:** `generateMetadata` per route → title (template `%s | CSLifestyle`), **canonical**,
  **OpenGraph**, **Twitter**; `metadataBase` + defaults in `app/layout.tsx`.
- **Structured data (`lib/seo.ts` + `components/seo/JsonLd.tsx`):** **Product**, **Article**
  (guides + comparisons), **Breadcrumb** per page; **Organization + WebSite** site-wide in the layout.
- **Sitemap/robots:** `app/sitemap.ts` (DB-driven, 50 URLs = 8 static + 42 entities) +
  `app/robots.ts` (allow `/`, disallow `/admin`,`/account`,`/api`,auth pages; `Host` + `Sitemap`).
- **ISR:** `export const revalidate = 3600` + `generateStaticParams` (published slugs) on all 6.
- **Hydration sweep (#7):** added `formatDate` to `lib/format.ts`; replaced **all** bare
  `toLocaleString()`/`toLocaleDateString()` repo-wide (admin/products date + the ai/analytics/
  affiliate/marketing/seo/admin-home dashboards + admin guides/comparisons dates) with the shared
  deterministic `en-IN` formatters. Only `components/ui/chart.tsx` (shadcn, client-only recharts
  tooltip) intentionally untouched.
- **Verification:** typecheck ✅ · `next build` ✅ (**82 pages**; 6 detail routes `●` SSG/ISR;
  `/sitemap.xml` + `/robots.txt` emitted). **Live SSR smoke** (embedded Postgres + backend +
  `next start`): `/products/iphone-15-pro-max` returns **server-rendered data** ("iPhone 15 Pro Max",
  "₹1,34,900"), **JSON-LD** (Product + aggregateRating, BreadcrumbList, Organization), `<link
  rel="canonical">`, `og:title`, `twitter:card`, `<title>… | CSLifestyle</title>`; guide page →
  Article JSON-LD; unknown slug → **HTTP 404**; `robots.txt` correct; **sitemap.xml = 50 URLs**
  (12 products/10 categories/8 brands/5 guides/3 comparisons/4 authors + static). `next lint`
  surfaces only pre-existing `react/no-unescaped-entities` + `<img>` warnings carried verbatim from
  the original JSX (build ignores ESLint by config).
- **Files:** new `lib/seo.ts`, `lib/api/ssr.ts`, `components/seo/JsonLd.tsx`, `app/sitemap.ts`,
  `app/robots.ts`, 6 `*-detail.tsx` islands; rewrote 6 `page.tsx`; edited `app/layout.tsx`,
  `lib/format.ts`, `next.config.js` (unchanged — SSR uses BACKEND_ORIGIN directly), 8 admin pages
  (hydration sweep). No backend code changed.
- **Decisions:** ADR-021 (Server Component + client island; SSR over BACKEND_ORIGIN; ISR).
- **Compliance delta:** behavioural ~33% → ~38%; surface ~48% → ~52%. SEO NFRs (sitemaps/robots/
  canonical/structured-data/SSR — FR-064/065/066 + NFR-SEO) move to ✅/largely-✅.
- **Blockers / risks:** none blocking. Notes: SSR data hops over HTTP to the backend (could become
  direct service calls in a future optimisation); `next lint` still red (pre-existing content);
  home/nav/footer/search/deals/wishlist still client + mock (out of Phase 4 scope).

**Next:** await user direction (Affiliate `/go`, AI, Import, Analytics…). Stopping after Phase 4.

## 2026-06-15 — Phase 3 complete: Guides, Comparisons & Authors (+ hydration fix)
**By:** Claude · **Phase:** 3 (Content foundation)

- **Scope:** the content domain — Authors, Guides, Comparisons — DB-backed end to end, replacing
  all remaining mock content systems. No affiliate/AI/SEO/analytics/marketing work started.
- **Database (migration `20260614184511_content_guides_comparisons_authors`):** new models
  `Author` (slug, avatarUrl, bio, credentials, expertise/socialLinks JSON, seo, isActive), `Guide`
  (slug, title, excerpt, content, coverImage, categoryId?, authorId?, readingTime, tableOfContents/
  faqItems/tags JSON, seo, `status` enum, publishedAt), `GuideProduct` (guideId+productId PK,
  position, reason, isTopPick), `Comparison` (slug, title, excerpt, summary, prosCons JSON,
  productAId/productBId FKs, verdict, winner, seo, status, publishedAt), `ComparisonSpec`
  (specName, productAValue, productBValue, winner, details, position), `ComparisonProduct` join;
  `ContentStatus { draft, published }` enum. cuid IDs; UI-preservation columns per ADR-020.
- **Seed:** `prisma/seed.ts` now also seeds 4 authors, 5 guides (+ product picks), 3 comparisons
  (+ specs) from the existing mock — the wired pages render identically. Idempotent.
- **Backend API (`/api`):** `routes/content.ts` + per-entity services/controllers + presenters
  (DB→frontend shape) + zod schemas. Endpoints: full CRUD for `/api/authors`, `/api/guides`,
  `/api/comparisons` + **publish/unpublish/draft** actions for guides & comparisons. Public reads
  via `optionalAuthenticate` (editors see drafts/inactive); list supports **pagination + sort +
  filter (category/author/status) + search**. Writes require JWT + `requirePermission` (authors.*/
  guides.*/comparisons.*) + CSRF + audit. Comparison create rejects identical products (400).
  Swagger updated (Authors/Guides/Comparisons tags). Next rewrites proxy the three resources.
- **Frontend (existing UI preserved, mock → API):**
  - Public: `guides`, `guides/[slug]` (synthetic article body preserved; author/TOC/product picks
    from DB), `comparisons`, `comparisons/[slug]` (products/specs/prosCons/verdict from DB),
    `authors`, `authors/[slug]` (author + their published guides) now fetch via `lib/api/content.ts`.
  - Admin: `/admin/guides` (table + search/status-filter/pagination + create/edit/delete +
    publish/unpublish + 6 editor tabs General/Content/FAQ/Product Picks/SEO/Settings),
    `/admin/comparisons` (table + builder with General/Product Picker/Specs Matrix/Verdict/SEO/
    Preview tabs), `/admin/authors` (grid + profile preview + General/Social/SEO editor tabs).
- **Hydration bug fix (reported mid-phase):** homepage prices used `toLocaleString()` with no
  locale → server (en-IN "1,34,900") vs client (en-US "134,900") mismatch. Added shared
  `lib/format.ts` (`formatNumber`/`formatPrice`, explicit `en-IN`); fixed app/page.tsx,
  ProductCard, product & comparison detail review counts, admin products price. Verified: build +
  dev; SSR HTML now only en-IN grouping. Also removed a `Math.random()` views value on the author
  page (another latent mismatch). No hydration warnings suppressed.
- **DB migrations added:** `20260614184511_content_guides_comparisons_authors`.
- **API endpoints added:** ~22 content routes (authors 5, guides 5+3 status, comparisons 5+3 status).
- **Tests added:** +1 unit suite (`content-presenters` — author/guide/comparison mapping, pick &
  spec ordering, prosCons) = ~9 cases; +16 integration/RBAC (`content.integration` — seeded reads,
  guide-by-slug w/ author+picks, comparison-by-slug w/ specs, author-by-slug w/ guides, 401/403/CSRF,
  author/guide/comparison lifecycles, publish→unpublish, category filter, identical-product 400).
  **117/117 tests green** vs real embedded Postgres (no Phase 0/1/1a/2 regression). typecheck/lint/
  build green both projects; `next build` green (all content pages compile).
- **Decisions:** ADR-020 (content status enum + UI-preservation columns + presenter superset).
- **Compliance delta:** behavioural ~26% → ~33%; surface ~42% → ~48%. DB models 16 → 22; API
  endpoints ~34 → ~56. FR-033…041 (guides/comparisons/authors CRUD + public) now ✅/largely ✅.
- **Deviations from `09`:** Phase 3 absorbs the former "1b" content tables. Authors have no rating
  and comparisons no author link (not in the spec domain) — handled honestly (no fabricated data;
  ADR-020). Article view counts deferred to the analytics phase (admin shows "—"/derived).
- **Blockers / risks:** none blocking. Notes: guide/comparison editors use JSON textareas for
  TOC/FAQ (functional; a richer block editor is future); pages remain client components (no SSR/SEO
  yet — separate roadmap item); home/navbar/footer still read the mock for cross-entity sections.

**Next:** await user direction (candidates: Affiliate `/go` engine, AI content, or SSR/SEO for the
now-real catalog + content). Stopping after this phase per instruction.

## 2026-06-15 — Phase 2 complete: Catalog (Products, Categories, Brands)
**By:** Claude · **Phase:** 2 (Catalog foundation)

- **Scope:** the catalog foundation — Products, Categories, Brands — DB-backed end to end. No
  guides/comparisons/authors/affiliate/AI/SEO/analytics/marketing work started (per instruction).
- **Database (migration `20260614180035_catalog_products_categories_brands`):** new models
  `Category` (self-ref `parentId`, slug, seo, `subcategories` display labels, `isActive`,
  `sortOrder`), `Brand` (slug, logo, website, seo, `rating`, `isActive`), `Product` (asin unique,
  `categoryId`/`brandId`, title/slug, short+long desc, image, gallery, specifications/pros/cons/
  faqs/highlights/features JSON, rating, reviewCount, current/original price `Decimal`,
  discountPercent, availability, affiliateUrl, seo, `isPublished`/`isTrending`/`isEditorsPick`,
  deal fields), `ProductImage`, `ProductPriceHistory`, `SearchQuery`. **cuid() string IDs**
  (ADR-017); UI-preservation columns added (ADR-018).
- **Seed:** `prisma/seed.ts` now imports the existing frontend mock (`lib/data.ts`) and seeds
  10 categories, 8 brands, 12 products (+ images + price history) — the wired storefront renders
  identically to the mock on day one (`06` §5). Idempotent upserts.
- **Backend API (`/api`, ADR-019):** `routes/catalog.ts` + per-entity services/controllers +
  presenters (DB→frontend shape, ADR-018) + zod schemas. Endpoints: `GET/POST /api/products`,
  `GET /api/products/:slug`, `PUT/DELETE /api/products/:id`, `POST /api/products/bulk`;
  same CRUD for `/api/categories` & `/api/brands`; `GET /api/search`. Public reads via
  `optionalAuthenticate` (editors see drafts/inactive); list supports **pagination + sort +
  filter (category/brand/price/rating) + search**. Writes require JWT + `requirePermission` +
  CSRF + audit. Category delete blocked if it has products/children (409); duplicate ASIN → 409;
  price-history row appended on price change. Search is DB-backed across products/categories/
  brands and **logs every query** to `search_queries` (FR-032) with hashed IP. Swagger updated
  (Products/Categories/Brands/Search tags + component schemas).
- **Frontend (existing UI preserved, mock → API):**
  - Public: `products/[slug]`, `categories`, `categories/[slug]` (filters/sort kept client-side),
    `brands`, `brands/[slug]` now fetch from `lib/api/catalog.ts`. Guides section on the category
    page stays on the mock (out of scope).
  - Admin: `/admin/products` (real table + search/filter/pagination + create/edit/delete +
    publish/unpublish + **bulk actions** + functional editor drawer), `/admin/categories` (tree
    from `parentId`, CRUD, delete-guard), `/admin/brands` (grid + profile drawer w/ real top
    products + CRUD). No component restyled; only the data source + handlers changed.
  - `next.config.js` rewrites proxy `/api/{products,categories,brands,search}` to the backend.
- **DB migrations added:** `20260614180035_catalog_products_categories_brands` (applies cleanly via
  `migrate deploy`; authored via `migrate dev` against a throwaway embedded Postgres, since no
  local Docker — same pattern as Phase 1/1a, tooling removed after).
- **API endpoints added:** 17 catalog routes (products 6, categories 5, brands 5, search 1).
- **Tests added:** +17 unit (`slug`, `presenters`) = 68 unit total; +17 integration/RBAC
  (`catalog.integration.test.ts`: public reads, pagination/filter/sort, slug 404, draft hidden,
  401/403/CSRF guards, admin create→update→publish→delete, duplicate ASIN 409, price history,
  bulk, category delete-guard, brand CRUD, search + scoping). **101/101 tests green** vs real
  embedded Postgres (no Phase 0/1/1a regression). typecheck/lint/build green both projects;
  `next build` green (all catalog pages compile).
- **Decisions:** ADR-017 (cuid catalog IDs), ADR-018 (presenter superset + UI-preservation
  columns), ADR-019 (unversioned `/api/{resource}` per Phase 2 contract).
- **Compliance delta:** behavioural ~18% → ~26%; surface ~36% → ~42%. DB models 10 → 16; API
  endpoints ~17 → ~34. FR-006/007/021/022/023 (catalog reads/listing/filter/sort) and FR-027/032
  (search + query logging) now ✅ or largely ✅.
- **Deviations from `09`:** Phase 2 here bundles the catalog-core of the former "1b" (schema+seed)
  with the public/admin wiring, scoped to products/categories/brands only. Guides/comparisons/
  authors schema deferred (renamed tracker row "1b"). cuid IDs refine `06` §1 (ADR-017).
- **Blockers / risks:** none blocking. Notes: product listing fetches up to `perPage=100/200` and
  filters client-side on category/brand pages (fine at seed scale; server-side pagination already
  supported for when the catalog grows). No SSR yet (pages remain client components — SEO/SSR is
  the separate Phase 8/roadmap item); image uploads are URL-based (media phase). tsvector
  full-text search deferred (using case-insensitive `contains`).

**Next:** await user direction (candidates: Guides & Comparisons, or Affiliate `/go` engine, or
SSR/SEO for the now-real catalog).

## 2026-06-14 — Auth Follow-Up complete: TOTP 2FA + Resend Email
**By:** Claude · **Phase:** 1a (Authentication follow-up)

- **Scope:** the two deferred security items from Phase 1 — TOTP 2FA and real email delivery.
  No CMS/catalog work started.
- **TOTP 2FA:**
  - Libs: `crypto.ts` (AES-256-GCM for secrets at rest), `totp.ts` (otplib v12 + QR via
    `qrcode`), `backup-codes.ts` (single-use, hashed). Challenge token in `jwt.ts`.
  - DB: User gains `twoFactorEnabled/twoFactorPending/twoFactorSecret(enc)/twoFactorVerifiedAt`;
    new `TwoFactorBackupCode` + `Setting` models. Migration `20260614010000_2fa_email_settings`.
  - Flows (`twofactor.service.ts`): setup (secret+QR), enable (verify→backup codes), disable,
    regenerate; two-step login (`login` returns a challenge when 2FA on → `login/2fa` completes
    with TOTP **or** a single-use backup code). Backup-code reuse rejected.
  - **Admin enforcement option:** `Setting` `auth.enforce_2fa_roles` (default `["admin"]`) +
    `GET/PUT /api/v1/admin/security/2fa-policy`; soft-enforced via `mustEnable2fa` flag on login.
  - Endpoints: `/api/auth/2fa/{status,setup,enable,disable,backup-codes}`, `/api/auth/login/2fa`,
    policy GET/PUT. CSRF on mutations; dedicated 2FA rate limiter. Swagger updated (7 new paths).
- **Resend email integration:**
  - `lib/email/{provider,templates,retry}.ts` + rewritten `mailer.ts`. Provider abstraction:
    **Resend** when `RESEND_API_KEY` set, else **console** fallback. Branded HTML+text templates
    (verification + reset). Retry with exponential backoff; **audit** `email.sent`/`email.failed`
    (recordAudit now returns an awaitable promise). Fire-and-forget from the auth path
    (non-blocking). Existing verify/reset flows unchanged.
- **Frontend (existing design system, preserved):** login page now handles the 2FA challenge
  step; new `/account/security` page (enable w/ QR + secret + code → backup codes; disable);
  `lib/auth.ts` gains 2FA methods + `LoginResponse` union. No existing page restyled.
- **Tests:** +21 unit (crypto/totp/backup-codes/email templates+retry+provider/challenge) = 51
  unit total; +3 integration (full 2FA enroll→TOTP login→backup-code login→reuse-reject→disable;
  admin policy GET/PUT + mustEnable2fa; email→audit). **16/16 integration verified vs real
  embedded Postgres** (incl. all 13 Phase-1 tests — no regression).
- **Verification:** typecheck ✅ · lint ✅ · build ✅ · 51 unit ✅ · 16 integration ✅ · frontend
  `next build` ✅ (login + `/account/security`; all existing pages intact) · no-DB smoke ✅ (2FA
  routes 401 unauth; 7 2FA/security paths in Swagger).
- **New ADRs:** 014 (2FA design), 015 (Resend + console fallback + fire-and-forget retry/audit),
  016 (2FA enforcement via Setting + soft `mustEnable2fa`).
- **Compliance:** NFR-SEC-002 (2FA) **deferred → ✅**. Email delivery deferral closed.
- **Still deferred:** SMTP-less means real sends need a `RESEND_API_KEY` (console fallback
  otherwise); nav link to `/account/security` not added (page reachable directly); edge
  silent-refresh; removing unused root `@supabase/supabase-js`.

**Next:** Phase 1b — catalog schema + seed. **Stopping after this follow-up per instruction.**

---

## 2026-06-14 — Phase 1 complete: Authentication & RBAC
**By:** Claude · **Phase:** 1 (Auth & RBAC, user-sequenced — see ADR-010)

- **Re-sequencing:** user designated Auth & RBAC as "Phase 1" (was roadmap Phase 7). Built the
  auth-subset of the DB schema now; catalog tables deferred to the renamed "Catalog schema +
  seed" phase. Recorded in ADR-010.
- **Database (Prisma):** added `User, Role, Permission, RolePermission, Session, RefreshToken,
  VerificationToken (enum type), AuditLog`. cuid string IDs for auth entities (ADR-011).
  Generated a real migration offline via `migrate diff` (`prisma/migrations/20260614000000_
  auth_init`, 183 lines) + `migration_lock.toml`. Seed (`prisma/seed.ts`): 63 permissions, 5
  named roles (admin/editor/analyst/author/user) with mapped permissions, default admin user.
- **Security libs:** bcrypt password hash/verify; JWT access tokens (HS256, 15m); opaque
  refresh/verify/reset tokens stored **hashed (SHA-256 + pepper)**; cookie helpers (httpOnly
  access+refresh, readable CSRF) (ADR-012).
- **Services:** `auth.service` (register/login/logout/refresh/me/forgot/reset/verify/resend) with
  **refresh-token rotation + reuse detection** (revokes all on theft); `rbac.service` (load
  user+role+permissions, permission/role checks).
- **Middleware:** `authenticate` (cookie/Bearer → fresh DB load), `requireRole`,
  `requirePermission` (AND, returns missing), `auditLogger`, `rateLimiter` (general 100/15m +
  login brute-force 5 failed/15m, memory or Redis store), `requireCsrf` (double-submit),
  `validateBody` (zod).
- **API:** 9 endpoints at `/api/auth/*` (unversioned per spec) + protected `/api/v1/admin/ping`
  RBAC probe. Full Swagger annotations (9 auth paths in `/docs.json`). Standard envelope.
- **Frontend (preserved design system):** `/login`, `/signup`, `/forgot-password`,
  `/reset-password` using shadcn Form + RHF + zod + BrandButton + brand gradient; `lib/auth.ts`
  client (credentials + CSRF header). `next.config.js` rewrites proxy `/api/*` → backend
  (first-party cookies). Root `middleware.ts` guards `/admin/*` (Edge JWT verify via `jose` +
  `admin.access` RBAC redirect). **No existing UI/page modified.**
- **Tests:** 30 unit (password/jwt/tokens/permissions/authorize/validation/health) + 13
  integration/RBAC (register/login/logout/refresh-rotation-&-reuse/me/forgot-reset/verify/
  brute-force-429/CSRF-403/RBAC-401-403-200). Integration DB-gated (`RUN_DB_TESTS`); **verified
  13/13 green against a real embedded Postgres locally**; CI runs them (migrate+seed+Postgres
  service). CI updated.
- **Verification:** typecheck ✅ · lint ✅ (0 warnings) · build ✅ · unit 30/30 ✅ · integration
  13/13 ✅ (embedded PG) · frontend `next build` ✅ (all existing pages intact, 4 new pages) ·
  no-DB smoke ✅ (validation 400, 401s, Swagger).
- **New ADRs:** 010 (re-sequence), 011 (cuid auth IDs), 012 (cookie+CSRF token strategy), 013
  (unversioned `/api/auth` + Next proxy rewrites).
- **Deferred:** TOTP 2FA enforcement (schema/flows are 2FA-ready; full TOTP enrollment/verify is
  a follow-up — NFR-SEC-002 partial); real email delivery (mailer stubbed/logged); removing
  unused root `@supabase/supabase-js`.

**Next:** Phase 1b — catalog schema + seed (remaining spec §7), then public read API + frontend
wiring. **Stopping after Phase 1 per instruction.**

---

## 2026-06-14 — Phase 0 complete: backend foundation & tooling
**By:** Claude · **Phase:** 0

- Scaffolded the standalone backend under `server/` (separate `package.json`/`tsconfig`,
  ADR-001) — **frontend untouched** (only additive change to root was `.gitignore`).
- **Stack stood up:** Express 4 + TypeScript, Prisma (Postgres datasource; zero models —
  Phase 1 adds them), ioredis (Redis client), BullMQ (queue registry + worker entrypoint),
  Swagger (OpenAPI at `/docs`, JSON at `/docs.json`), pino logging (pretty in dev), zod env
  validation (`src/config/env.ts`), standard response envelope + `ApiError`, requestId
  correlation, helmet + cors, central error/404 handlers.
- **Health endpoints:** `GET /healthz` (liveness), `GET /readyz` (checks Postgres + Redis with
  2s timeouts, 503 when degraded), `GET /api/v1/health` (versioned base ping).
- **Infra/tooling:** root `docker-compose.yml` (Postgres 16 + Redis 7, optional `app` profile
  for API+worker), `server/Dockerfile` (multi-stage), `.github/workflows/ci.yml`
  (typecheck → lint → build → test with Postgres/Redis services), ESLint flat config +
  Prettier, Vitest + Supertest.
- **Verification (all green):** `npm install` (Prisma client generated via postinstall) ·
  `typecheck` · `lint` · `build` (→ `dist/`) · `test` 4/4 · **live smoke test**: `/healthz` 200,
  `/api/v1/health` 200, `/readyz` 503 degraded (no DB/Redis in sandbox — correct), `/docs` 200,
  `/docs.json` served.
- **Fixes during build:** (1) BullMQ bundled a different `ioredis` minor → type-identity clash;
  resolved with an npm `override` pinning a single `ioredis@5.10.1` (deduped). (2) Bumped Vitest
  2→3 to clear a critical dev advisory.
- **Known accepted risk:** 5 esbuild advisories remain, all **dev-only** (Vitest→Vite→esbuild
  chain; Deno-specific binary-integrity issue, range ≤0.28.0). No clean upstream fix yet; never
  runs in the production image. Documented in ADR-009 + the Phase 0 report; re-check next phase.
- New ADRs: **008** (Swagger/OpenAPI), **009** (ioredis override + accepted dev-only audit risk).
- Decision deferred (not in Phase 0 scope): removing the unused root `@supabase/supabase-js`
  dep — left untouched to keep Phase 0 from modifying frontend deps.

**Next:** Phase 1 — Prisma schema (spec §7 → `06`) + seed (port `lib/data.ts` + roles/permissions/
settings/super-admin).

---

## 2026-06-14 — Planning system established
**By:** Claude · **Phase:** Planning (pre-Phase-0)

- Read the full repository (113 tracked files, commit `f4651ea`) and the entire 83-page
  blueprint (`CSLifestyle_V2_Blueprint.pdf`).
- Ran three parallel deep audits: public frontend, admin panel, data/infra. Synthesized into
  `03-current-state-audit.md`.
- Key findings:
  - Frontend is a polished Next.js 13.5 App Router + shadcn/Tailwind shell — **22 public routes
    + 16 admin pages, all mock data, almost all `"use client"`.**
  - **No backend, no DB, no Prisma, no API, no auth, no engines.** `@supabase/supabase-js`
    present but unused.
  - Design system = monochrome + pink-gradient palette (differs from spec's blue/green);
    **preserved per user constraint.**
  - SEO infra absent (no sitemap/robots/canonical/JSON-LD/generateMetadata/generateStaticParams).
- Produced full requirement mapping (`04-gap-analysis.md`): FR tally ✅8 / 🟡35 / ❌27;
  all DB models, all APIs, all engines, all NFRs essentially Missing.
- Authored all 15 planning docs, including target architecture (Node/Express/TS + Postgres/
  Prisma monorepo), DB design (spec §7 → Prisma), API design (spec §8 → Express), security
  design, 12-phase roadmap, testing & deployment strategy, and the initial compliance report.
- Recorded foundational decisions ADR-001…006 in `12-decisions-log.md`.
- **No implementation code written** (per the user's "plan first" instruction).

**Next:** Phase 0 — backend foundation & tooling (await user go-ahead).

---

<!-- TEMPLATE for future entries — copy above this line:

## YYYY-MM-DD — <short title>
**By:** <who> · **Phase:** <#/name>

- What was done (deliverables shipped, files touched at a high level)
- DB migrations added
- API endpoints added/changed
- Tests added; CI status
- Decisions made (cross-ref `12` ADR ids)
- Compliance delta (old % → new %)
- Deviations from `09` plan + why
- Blockers / risks

**Next:** <what's next>
-->
