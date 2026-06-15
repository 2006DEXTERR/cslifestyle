import { env } from '../config/env';
import { logger } from '../lib/logger';
import { processAiJob } from '../services/ai/processor';

/** BullMQ queue name for AI generation jobs (spec §10.3). */
export const AI_QUEUE_NAME = 'ai-generation';

/**
 * Dispatch an AI generation job. `QUEUE_DRIVER=inline` (dev/test/CI) processes it
 * in-process with no Redis; `bullmq` (production) enqueues for the worker. See ADR-023.
 */
export async function dispatchAiJob(queueId: string): Promise<void> {
  if (env.QUEUE_DRIVER === 'bullmq') {
    const { getAiQueue } = await import('./aiBullmq');
    await getAiQueue().add('generate', { queueId }, { jobId: queueId, priority: 1 });
    logger.info({ queueId }, 'ai job enqueued (bullmq)');
  } else {
    await processAiJob(queueId);
  }
}

/** Dispatch many jobs (bulk generate). Inline runs sequentially; bullmq enqueues all. */
export async function dispatchAiJobs(queueIds: string[]): Promise<void> {
  for (const id of queueIds) await dispatchAiJob(id);
}
