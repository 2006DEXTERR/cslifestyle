import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { processImportJob } from '../services/import/processor';

/** BullMQ worker for ASIN imports (production; `QUEUE_DRIVER=bullmq`). */
export function startAsinImportWorker(): Worker {
  const worker = new Worker(
    'asin-import',
    async (job: Job<{ jobId: string }>) => {
      await processImportJob(job.data.jobId, (pct) => void job.updateProgress(pct));
    },
    { connection: redis, concurrency: 2 },
  );
  worker.on('ready', () => logger.info('🛠  asin-import worker ready'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'asin-import job failed'));
  return worker;
}
