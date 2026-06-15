import { env } from '../config/env';
import { logger } from '../lib/logger';
import { generateReport, pruneRawAnalytics } from '../services/analytics/analytics.service';

/** BullMQ queue name for analytics aggregation/report/cleanup jobs (spec §13/§16.7). */
export const ANALYTICS_QUEUE_NAME = 'analytics';

export type AnalyticsJobType = 'daily-report' | 'weekly-report' | 'monthly-report' | 'cleanup';

/**
 * Run an analytics job in-process. `daily/weekly/monthly-report` build + persist a
 * ReportSnapshot (this rolls up traffic + product + search + **revenue aggregation** +
 * **AI-cost aggregation** + content into one payload). `cleanup` prunes raw page-view/
 * event rows beyond the retention window. Used by both the inline path and the worker.
 */
export async function runAnalyticsJob(jobType: AnalyticsJobType): Promise<void> {
  if (jobType === 'daily-report') await generateReport('daily', 'last7days');
  else if (jobType === 'weekly-report') await generateReport('weekly', 'last30days');
  else if (jobType === 'monthly-report') await generateReport('monthly', 'thisMonth');
  else if (jobType === 'cleanup') {
    const r = await pruneRawAnalytics();
    logger.info(r, 'analytics cleanup pruned raw rows');
  }
}

/**
 * Dispatch an analytics job. `QUEUE_DRIVER=inline` (dev/test/CI) runs it in-process;
 * `bullmq` (production) enqueues for the worker + the repeatable scheduler. See ADR-023.
 */
export async function dispatchAnalyticsJob(jobType: AnalyticsJobType): Promise<void> {
  if (env.QUEUE_DRIVER === 'bullmq') {
    const { getAnalyticsQueue } = await import('./analyticsBullmq');
    await getAnalyticsQueue().add(jobType, { jobType });
    logger.info({ jobType }, 'analytics job enqueued (bullmq)');
  } else {
    await runAnalyticsJob(jobType);
  }
}
