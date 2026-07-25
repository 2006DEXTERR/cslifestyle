import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { runPaapiWizardResolution } from '../services/import/paapi-wizard.service';
import { PAAPI_WIZARD_QUEUE } from './paapiWizardBullmq';

/**
 * BullMQ worker for the Amazon PA-API Import Wizard (production; `QUEUE_DRIVER=bullmq`).
 * Concurrency 1 so PA-API calls stay serialized within their rate limits. The job's return
 * value (importJobId or preview rows) is read back by the wizard status endpoint.
 */
export function startPaapiWizardWorker(): Worker {
  const worker = new Worker(
    PAAPI_WIZARD_QUEUE,
    async (job: Job) =>
      runPaapiWizardResolution(job.data as Parameters<typeof runPaapiWizardResolution>[0], (pct) => void job.updateProgress(pct)),
    { connection: redis, concurrency: 1 },
  );
  worker.on('ready', () => logger.info('🛠  paapi-wizard worker ready'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'paapi-wizard job failed'));
  return worker;
}
