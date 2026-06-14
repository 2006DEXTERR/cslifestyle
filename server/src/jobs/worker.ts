import { Worker, type Job } from 'bullmq';
import { redis, connectRedis } from '../lib/redis';
import { logger } from '../lib/logger';

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

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Worker shutting down…');
    await worker.close();
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
