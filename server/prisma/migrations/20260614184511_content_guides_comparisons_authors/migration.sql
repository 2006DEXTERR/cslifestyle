-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "authors" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "bio" TEXT,
    "credentials" TEXT,
    "expertise" JSONB,
    "socialLinks" JSONB,
    "seo_title" TEXT,
    "meta_description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT,
    "cover_image" TEXT,
    "category_id" TEXT,
    "author_id" TEXT,
    "reading_time" INTEGER,
    "tableOfContents" JSONB,
    "faqItems" JSONB,
    "tags" JSONB,
    "seo_title" TEXT,
    "meta_description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_products" (
    "guide_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "is_top_pick" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "guide_products_pkey" PRIMARY KEY ("guide_id","product_id")
);

-- CreateTable
CREATE TABLE "comparisons" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "summary" TEXT,
    "prosCons" JSONB,
    "product_a_id" TEXT NOT NULL,
    "product_b_id" TEXT NOT NULL,
    "verdict" TEXT,
    "winner" TEXT,
    "seo_title" TEXT,
    "meta_description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_specs" (
    "id" TEXT NOT NULL,
    "comparison_id" TEXT NOT NULL,
    "spec_name" TEXT NOT NULL,
    "product_a_value" TEXT,
    "product_b_value" TEXT,
    "winner" TEXT,
    "details" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "comparison_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_products" (
    "comparison_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "comparison_products_pkey" PRIMARY KEY ("comparison_id","product_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");

-- CreateIndex
CREATE INDEX "authors_slug_idx" ON "authors"("slug");

-- CreateIndex
CREATE INDEX "authors_is_active_idx" ON "authors"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "guides_slug_key" ON "guides"("slug");

-- CreateIndex
CREATE INDEX "guides_slug_idx" ON "guides"("slug");

-- CreateIndex
CREATE INDEX "guides_category_id_idx" ON "guides"("category_id");

-- CreateIndex
CREATE INDEX "guides_author_id_idx" ON "guides"("author_id");

-- CreateIndex
CREATE INDEX "guides_status_published_at_idx" ON "guides"("status", "published_at");

-- CreateIndex
CREATE INDEX "guide_products_product_id_idx" ON "guide_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "comparisons_slug_key" ON "comparisons"("slug");

-- CreateIndex
CREATE INDEX "comparisons_slug_idx" ON "comparisons"("slug");

-- CreateIndex
CREATE INDEX "comparisons_status_published_at_idx" ON "comparisons"("status", "published_at");

-- CreateIndex
CREATE INDEX "comparisons_product_a_id_idx" ON "comparisons"("product_a_id");

-- CreateIndex
CREATE INDEX "comparisons_product_b_id_idx" ON "comparisons"("product_b_id");

-- CreateIndex
CREATE INDEX "comparison_specs_comparison_id_idx" ON "comparison_specs"("comparison_id");

-- CreateIndex
CREATE INDEX "comparison_products_product_id_idx" ON "comparison_products"("product_id");

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_products" ADD CONSTRAINT "guide_products_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_products" ADD CONSTRAINT "guide_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_product_a_id_fkey" FOREIGN KEY ("product_a_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_product_b_id_fkey" FOREIGN KEY ("product_b_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_specs" ADD CONSTRAINT "comparison_specs_comparison_id_fkey" FOREIGN KEY ("comparison_id") REFERENCES "comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_products" ADD CONSTRAINT "comparison_products_comparison_id_fkey" FOREIGN KEY ("comparison_id") REFERENCES "comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_products" ADD CONSTRAINT "comparison_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
