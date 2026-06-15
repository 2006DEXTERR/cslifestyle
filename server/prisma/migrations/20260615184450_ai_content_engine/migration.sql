-- CreateEnum
CREATE TYPE "AiEntityType" AS ENUM ('product', 'guide', 'comparison', 'category', 'brand');

-- CreateEnum
CREATE TYPE "AiJobType" AS ENUM ('title', 'meta_description', 'description', 'pros', 'cons', 'faq', 'verdict', 'guide', 'category_description');

-- CreateEnum
CREATE TYPE "AiQueueStatus" AS ENUM ('pending', 'processing', 'done', 'failed');

-- CreateEnum
CREATE TYPE "AiLogStatus" AS ENUM ('success', 'failed');

-- CreateEnum
CREATE TYPE "AiContentStatus" AS ENUM ('pending', 'generating', 'done', 'failed');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "ai_generated_at" TIMESTAMP(3),
ADD COLUMN     "ai_status" "AiContentStatus" NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "ai_queue" (
    "id" TEXT NOT NULL,
    "entity_type" "AiEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "job_type" "AiJobType" NOT NULL,
    "prompt_template" TEXT,
    "status" "AiQueueStatus" NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "result" JSONB,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_logs" (
    "id" TEXT NOT NULL,
    "queue_id" TEXT,
    "entity_type" "AiEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "job_type" "AiJobType" NOT NULL,
    "model_used" TEXT,
    "provider" TEXT,
    "prompt_used" TEXT,
    "response_raw" TEXT,
    "tokens_input" INTEGER,
    "tokens_output" INTEGER,
    "cost_usd" DECIMAL(10,6),
    "status" "AiLogStatus" NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_queue_status_priority_idx" ON "ai_queue"("status", "priority");

-- CreateIndex
CREATE INDEX "ai_queue_entity_type_entity_id_idx" ON "ai_queue"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ai_queue_created_at_idx" ON "ai_queue"("created_at");

-- CreateIndex
CREATE INDEX "ai_logs_entity_type_entity_id_idx" ON "ai_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ai_logs_created_at_idx" ON "ai_logs"("created_at");

-- CreateIndex
CREATE INDEX "ai_logs_status_idx" ON "ai_logs"("status");

-- AddForeignKey
ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "ai_queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
