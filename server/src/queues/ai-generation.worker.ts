import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { env } from '../config/env';
import { processAiJob } from '../services/ai/processor';
import { AI_QUEUE_NAME } from './aiQueue';

/**
 * BullMQ worker for AI generation (production; `QUEUE_DRIVER=bullmq`). Concurrency is
 * configurable via AI_CONCURRENCY (FR-051, default 4).
 */
export function startAiGenerationWorker(): Worker {
  const worker = new Worker(
    AI_QUEUE_NAME,
    async (job: Job<{ queueId: string }>) => {
      await processAiJob(job.data.queueId);
    },
    { connection: redis, concurrency: env.AI_CONCURRENCY },
  );
  worker.on('ready', () => logger.info('🤖 ai-generation worker ready'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'ai-generation job failed'));
  return worker;
}
