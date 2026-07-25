import { Worker, type Job } from 'bullmq';
import { redis, connectRedis } from '../lib/redis';
import { logger } from '../lib/logger';
import { startCsvImportWorker } from '../queues/csv-import.worker';
import { startAsinImportWorker } from '../queues/asin-import.worker';
import { startCategoryImportWorker } from '../queues/category-import.worker';
import { startAiGenerationWorker } from '../queues/ai-generation.worker';
import { startAnalyticsWorker } from '../queues/analytics.worker';
import { startMarketingWorker } from '../queues/marketing.worker';
import { startDiscoveryWorker } from '../queues/discovery.worker';
import { startPaapiWizardWorker } from '../queues/paapi-wizard.worker';

/**
 * BullMQ worker process (run separately from the web process, e.g.
 * `npm run worker`). Phase 0 establishes the worker bootstrap + a no-op
 * processor on the `default` queue; real processors (AI generation, PA-API
 * sync, imports, sitemaps) are registered in Phase 4+.
 */
async function main(): Promise<void> {
  await connectRedis();

  const worker = new Worker(
    'default',
    async (job: Job) => {
      logger.info({ jobId: job.id, name: job.name }, 'Processing job (no-op placeholder)');
      return { ok: true };
    },
    { connection: redis, concurrency: 4 },
  );

  worker.on('ready', () => logger.info('🛠  BullMQ worker ready (queue: default)'));
  worker.on('completed', (job) => logger.debug({ jobId: job.id }, 'Job completed'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Job failed'));

  // Import Center workers (Phase 6).
  const importWorkers = [startCsvImportWorker(), startAsinImportWorker(), startCategoryImportWorker()];

  // AI content engine worker (Phase 7).
  const aiWorkers = [startAiGenerationWorker()];

  // Analytics & reporting worker (Phase 8).
  const analyticsWorkers = [startAnalyticsWorker()];

  // Marketing & communication worker (Phase 9).
  const marketingWorkers = [startMarketingWorker()];

  // Discovery worker (Phase 11: search index / recs / internal links).
  const discoveryWorkers = [startDiscoveryWorker()];

  // Amazon PA-API Import Wizard worker (additive — resolves keywords → existing importer).
  const paapiWizardWorkers = [startPaapiWizardWorker()];

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Worker shutting down…');
    await Promise.all([
      worker.close(),
      ...importWorkers.map((w) => w.close()),
      ...aiWorkers.map((w) => w.close()),
      ...analyticsWorkers.map((w) => w.close()),
      ...marketingWorkers.map((w) => w.close()),
      ...discoveryWorkers.map((w) => w.close()),
      ...paapiWizardWorkers.map((w) => w.close()),
    ]);
    await redis.quit();
    process.exit(0);
  };
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => void shutdown(signal));
  }

  logger.info('🛠  CSLifestyle worker started');
}

main().catch((err) => {
  logger.error({ err }, 'Fatal: worker failed to start');
  process.exit(1);
});
