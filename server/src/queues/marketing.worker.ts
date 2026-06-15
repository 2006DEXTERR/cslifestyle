import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { MARKETING_QUEUE_NAME, runMarketingJob, type MarketingJob } from './marketingQueue';
import { getMarketingQueue } from './marketingBullmq';

/**
 * BullMQ worker for marketing/communication jobs (production; `QUEUE_DRIVER=bullmq`):
 * welcome + verification emails, campaign delivery, retry, and cleanup. On boot it
 * registers a daily cleanup schedule (spec §16.7 cron).
 */
export function startMarketingWorker(): Worker {
  const worker = new Worker(
    MARKETING_QUEUE_NAME,
    async (job: Job<MarketingJob>) => {
      await runMarketingJob(job.data);
    },
    { connection: redis, concurrency: 4 },
  );
  worker.on('ready', () => logger.info('📣 marketing worker ready'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'marketing job failed'));

  void getMarketingQueue().add('cleanup', { type: 'cleanup' }, { repeat: { pattern: '0 4 * * *' }, jobId: 'cron:marketing-cleanup' });
  return worker;
}
