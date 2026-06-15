import type { ImportType } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { processImportJob } from '../services/import/processor';

/** Map an import type to its BullMQ queue name (one queue/worker per type). */
export const IMPORT_QUEUE_BY_TYPE: Record<ImportType, string> = {
  csv_product: 'csv-import',
  asin: 'asin-import',
  category: 'category-import',
};

/**
 * Dispatch an import job. With `QUEUE_DRIVER=inline` (dev/test/CI) the job is
 * processed in-process and awaited — **no Redis required**. With `bullmq`
 * (production) it is enqueued and the worker process handles it. See ADR-023.
 */
export async function dispatchImport(jobId: string, type: ImportType): Promise<void> {
  if (env.QUEUE_DRIVER === 'bullmq') {
    const { getImportQueue } = await import('./bullmq');
    await getImportQueue(type).add('import', { jobId }, { jobId });
    logger.info({ jobId, type }, 'import job enqueued (bullmq)');
  } else {
    await processImportJob(jobId);
  }
}
