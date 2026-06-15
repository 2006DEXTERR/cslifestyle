import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { DISCOVERY_QUEUE_NAME, runDiscoveryJob, type DiscoveryJobType } from './discoveryQueue';
import { getDiscoveryQueue } from './discoveryBullmq';

/**
 * BullMQ worker for discovery jobs (production; `QUEUE_DRIVER=bullmq`): search-index
 * refresh, recommendation recalc, internal-link suggestion generation, and broken-link
 * detection. On boot it registers repeatable schedules (spec §16.7 cron).
 */
export function startDiscoveryWorker(): Worker {
  const worker = new Worker(
    DISCOVERY_QUEUE_NAME,
    async (job: Job<{ jobType: DiscoveryJobType }>) => {
      await runDiscoveryJob(job.data.jobType ?? (job.name as DiscoveryJobType));
    },
    { connection: redis, concurrency: 1 },
  );
  worker.on('ready', () => logger.info('🔎 discovery worker ready'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'discovery job failed'));

  const q = getDiscoveryQueue();
  void q.add('index-refresh', { jobType: 'index-refresh' }, { repeat: { pattern: '0 * * * *' }, jobId: 'cron:index-refresh' }); // hourly
  void q.add('internal-link-suggestions', { jobType: 'internal-link-suggestions' }, { repeat: { pattern: '0 2 * * *' }, jobId: 'cron:link-suggestions' });
  void q.add('broken-link-detection', { jobType: 'broken-link-detection' }, { repeat: { pattern: '0 3 * * *' }, jobId: 'cron:broken-links' });
  return worker;
}
