import { Queue } from 'bullmq';
import { redis } from '../lib/redis';
import { MARKETING_QUEUE_NAME } from './marketingQueue';

/** Lazily create/cache the BullMQ marketing queue (production only). */
let queue: Queue | undefined;

export function getMarketingQueue(): Queue {
  if (!queue) {
    queue = new Queue(MARKETING_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 },
      },
    });
  }
  return queue;
}
