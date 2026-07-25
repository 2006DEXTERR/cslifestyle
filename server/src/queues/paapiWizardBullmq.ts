import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

/**
 * Dedicated BullMQ queue for the Amazon PA-API Import Wizard resolution step
 * (keyword → PA-API SearchItems → product rows, in memory). Kept SEPARATE from the
 * csv/asin/category import queues so it cannot affect existing import behaviour. The
 * resolved rows are then handed to the existing `createCsvJob()` pipeline, which uses
 * its own csv-import queue as usual.
 */
export const PAAPI_WIZARD_QUEUE = 'paapi-wizard';

let queue: Queue | undefined;

export function getPaapiWizardQueue(): Queue {
  if (!queue) {
    queue = new Queue(PAAPI_WIZARD_QUEUE, {
      connection: redis,
      defaultJobOptions: {
        attempts: 2, // PA-API is an external call — one retry, no aggressive hammering
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return queue;
}
