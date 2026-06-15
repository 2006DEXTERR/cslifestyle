-- CreateEnum
CREATE TYPE "SearchEntityType" AS ENUM ('product', 'category', 'brand', 'guide', 'comparison', 'author');

-- CreateEnum
CREATE TYPE "InternalLinkStatus" AS ENUM ('suggested', 'approved', 'rejected', 'broken');

-- CreateTable
CREATE TABLE "search_synonyms" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "synonyms" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_synonyms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_index_entries" (
    "id" TEXT NOT NULL,
    "entity_type" "SearchEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "slug" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "keywords" TEXT,
    "boost" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "url" TEXT,
    "image" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_index_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "conditions" JSONB,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_links" (
    "id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "anchor_text" TEXT NOT NULL,
    "target_url" TEXT,
    "status" "InternalLinkStatus" NOT NULL DEFAULT 'suggested',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "search_synonyms_term_key" ON "search_synonyms"("term");

-- CreateIndex
CREATE INDEX "search_synonyms_isActive_idx" ON "search_synonyms"("isActive");

-- CreateIndex
CREATE INDEX "search_index_entries_entity_type_idx" ON "search_index_entries"("entity_type");

-- CreateIndex
CREATE INDEX "search_index_entries_title_idx" ON "search_index_entries"("title");

-- CreateIndex
CREATE UNIQUE INDEX "search_index_entries_entity_type_entity_id_key" ON "search_index_entries"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "recommendation_rules_type_isActive_idx" ON "recommendation_rules"("type", "isActive");

-- CreateIndex
CREATE INDEX "internal_links_source_type_source_id_idx" ON "internal_links"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "internal_links_status_idx" ON "internal_links"("status");

-- CreateIndex
CREATE UNIQUE INDEX "internal_links_source_type_source_id_target_type_target_id_key" ON "internal_links"("source_type", "source_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "recommendation_rules" ADD CONSTRAINT "recommendation_rules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
