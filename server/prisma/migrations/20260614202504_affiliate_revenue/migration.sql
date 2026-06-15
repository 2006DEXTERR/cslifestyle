-- CreateEnum
CREATE TYPE "AffiliateSourceType" AS ENUM ('product', 'guide', 'comparison', 'category', 'deals', 'search', 'direct', 'other');

-- CreateEnum
CREATE TYPE "AffiliateDeviceType" AS ENUM ('mobile', 'tablet', 'desktop', 'unknown');

-- CreateEnum
CREATE TYPE "RevenueSource" AS ENUM ('estimated', 'amazon_csv');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateTable
CREATE TABLE "affiliate_clicks" (
    "id" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "product_id" TEXT,
    "source_type" "AffiliateSourceType" NOT NULL DEFAULT 'other',
    "source_path" TEXT,
    "campaign_id" TEXT,
    "affiliate_tag" TEXT,
    "ip_hash" TEXT,
    "user_agent_hash" TEXT,
    "device_type" "AffiliateDeviceType" NOT NULL DEFAULT 'unknown',
    "country" TEXT,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "affiliate_tag" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "amazon_associate_tag" TEXT NOT NULL DEFAULT 'cslifestyle-21',
    "amazon_domain" TEXT NOT NULL DEFAULT 'amazon.in',
    "linkCode" TEXT NOT NULL DEFAULT 'ogi',
    "extraParams" JSONB,
    "disclosure_text" TEXT,
    "tracking_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_imports" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "source" "RevenueSource" NOT NULL DEFAULT 'amazon_csv',
    "status" "ImportStatus" NOT NULL DEFAULT 'pending',
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "error" TEXT,
    "imported_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_reports" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "asin" TEXT,
    "product_id" TEXT,
    "category" TEXT,
    "actual_revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estimated_revenue" DECIMAL(14,2),
    "orders" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "source" "RevenueSource" NOT NULL DEFAULT 'amazon_csv',
    "import_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "affiliate_clicks_asin_idx" ON "affiliate_clicks"("asin");

-- CreateIndex
CREATE INDEX "affiliate_clicks_clicked_at_idx" ON "affiliate_clicks"("clicked_at");

-- CreateIndex
CREATE INDEX "affiliate_clicks_product_id_idx" ON "affiliate_clicks"("product_id");

-- CreateIndex
CREATE INDEX "affiliate_clicks_source_type_idx" ON "affiliate_clicks"("source_type");

-- CreateIndex
CREATE INDEX "affiliate_clicks_campaign_id_idx" ON "affiliate_clicks"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_campaigns_slug_key" ON "affiliate_campaigns"("slug");

-- CreateIndex
CREATE INDEX "affiliate_campaigns_slug_idx" ON "affiliate_campaigns"("slug");

-- CreateIndex
CREATE INDEX "affiliate_campaigns_is_active_idx" ON "affiliate_campaigns"("is_active");

-- CreateIndex
CREATE INDEX "revenue_imports_source_idx" ON "revenue_imports"("source");

-- CreateIndex
CREATE INDEX "revenue_imports_created_at_idx" ON "revenue_imports"("created_at");

-- CreateIndex
CREATE INDEX "revenue_reports_date_idx" ON "revenue_reports"("date");

-- CreateIndex
CREATE INDEX "revenue_reports_asin_idx" ON "revenue_reports"("asin");

-- CreateIndex
CREATE INDEX "revenue_reports_source_idx" ON "revenue_reports"("source");

-- CreateIndex
CREATE INDEX "revenue_reports_import_id_idx" ON "revenue_reports"("import_id");

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "affiliate_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_imports" ADD CONSTRAINT "revenue_imports_imported_by_id_fkey" FOREIGN KEY ("imported_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_reports" ADD CONSTRAINT "revenue_reports_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_reports" ADD CONSTRAINT "revenue_reports_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "revenue_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
