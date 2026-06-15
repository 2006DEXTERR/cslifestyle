import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { processImportJob } from '../services/import/processor';

/** BullMQ worker for CSV product imports (production; `QUEUE_DRIVER=bullmq`). */
export function startCsvImportWorker(): Worker {
  const worker = new Worker(
    'csv-import',
    async (job: Job<{ jobId: string }>) => {
      await processImportJob(job.data.jobId, (pct) => void job.updateProgress(pct));
    },
    { connection: redis, concurrency: 2 },
  );
  worker.on('ready', () => logger.info('🛠  csv-import worker ready'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'csv-import job failed'));
  return worker;
}
