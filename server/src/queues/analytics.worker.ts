import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { ANALYTICS_QUEUE_NAME, runAnalyticsJob, type AnalyticsJobType } from './analyticsQueue';
import { getAnalyticsQueue } from './analyticsBullmq';

/**
 * BullMQ worker for analytics aggregation, report generation and cleanup (production;
 * `QUEUE_DRIVER=bullmq`). On boot it registers repeatable schedules (spec §16.7 cron):
 * daily/weekly/monthly report rollups + a daily cleanup prune.
 */
export function startAnalyticsWorker(): Worker {
  const worker = new Worker(
    ANALYTICS_QUEUE_NAME,
    async (job: Job<{ jobType: AnalyticsJobType }>) => {
      await runAnalyticsJob(job.data.jobType ?? (job.name as AnalyticsJobType));
    },
    { connection: redis, concurrency: 2 },
  );
  worker.on('ready', () => logger.info('📊 analytics worker ready'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'analytics job failed'));

  // Repeatable schedules (idempotent by repeat key).
  const q = getAnalyticsQueue();
  void q.add('daily-report', { jobType: 'daily-report' }, { repeat: { pattern: '0 1 * * *' }, jobId: 'cron:daily-report' });
  void q.add('weekly-report', { jobType: 'weekly-report' }, { repeat: { pattern: '0 2 * * 1' }, jobId: 'cron:weekly-report' });
  void q.add('monthly-report', { jobType: 'monthly-report' }, { repeat: { pattern: '0 3 1 * *' }, jobId: 'cron:monthly-report' });
  void q.add('cleanup', { jobType: 'cleanup' }, { repeat: { pattern: '30 3 * * *' }, jobId: 'cron:cleanup' });

  return worker;
}
