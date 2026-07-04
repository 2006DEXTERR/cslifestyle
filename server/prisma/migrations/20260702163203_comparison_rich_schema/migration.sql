-- CreateEnum
CREATE TYPE "spec_display_type" AS ENUM ('text', 'number', 'boolean', 'percentage', 'rating', 'currency', 'badge', 'progress', 'stars', 'icon');

-- CreateEnum
CREATE TYPE "spec_value_type" AS ENUM ('string', 'integer', 'float', 'boolean', 'json');

-- CreateEnum
CREATE TYPE "spec_winner_mode" AS ENUM ('manual', 'higher_better', 'lower_better', 'equal', 'none');

-- CreateEnum
CREATE TYPE "comparison_review_status" AS ENUM ('draft', 'in_review', 'approved');

-- AlterTable
ALTER TABLE "comparison_specs" ADD COLUMN     "boolean_value_a" BOOLEAN,
ADD COLUMN     "boolean_value_b" BOOLEAN,
ADD COLUMN     "display_type" "spec_display_type" NOT NULL DEFAULT 'text',
ADD COLUMN     "json_value_a" JSONB,
ADD COLUMN     "json_value_b" JSONB,
ADD COLUMN     "number_value_a" DOUBLE PRECISION,
ADD COLUMN     "number_value_b" DOUBLE PRECISION,
ADD COLUMN     "spec_group" TEXT,
ADD COLUMN     "subgroup" TEXT,
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "value_type" "spec_value_type" NOT NULL DEFAULT 'string',
ADD COLUMN     "winner_mode" "spec_winner_mode" NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "comparisons" ADD COLUMN     "best_alternative_ids" JSONB,
ADD COLUMN     "best_for" TEXT,
ADD COLUMN     "comparison_notes" TEXT,
ADD COLUMN     "comparison_score_a" DOUBLE PRECISION,
ADD COLUMN     "comparison_score_b" DOUBLE PRECISION,
ADD COLUMN     "editor_summary" TEXT,
ADD COLUMN     "faq" JSONB,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_reviewed_by" TEXT,
ADD COLUMN     "review_status" "comparison_review_status" NOT NULL DEFAULT 'draft',
ADD COLUMN     "sticky_cta" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "who_should_buy_a" TEXT,
ADD COLUMN     "who_should_buy_b" TEXT;

-- CreateIndex
CREATE INDEX "comparisons_featured_idx" ON "comparisons"("featured");
