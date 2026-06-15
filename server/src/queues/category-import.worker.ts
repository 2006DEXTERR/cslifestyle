import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { processImportJob } from '../services/import/processor';

/** BullMQ worker for category imports (production; `QUEUE_DRIVER=bullmq`). */
export function startCategoryImportWorker(): Worker {
  const worker = new Worker(
    'category-import',
    async (job: Job<{ jobId: string }>) => {
      await processImportJob(job.data.jobId, (pct) => void job.updateProgress(pct));
    },
    { connection: redis, concurrency: 2 },
  );
  worker.on('ready', () => logger.info('🛠  category-import worker ready'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'category-import job failed'));
  return worker;
}
