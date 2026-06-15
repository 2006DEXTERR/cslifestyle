import { Queue } from 'bullmq';
import { redis } from '../lib/redis';
import { ANALYTICS_QUEUE_NAME } from './analyticsQueue';

/** Lazily create/cache the BullMQ analytics queue (production only). */
let queue: Queue | undefined;

export function getAnalyticsQueue(): Queue {
  if (!queue) {
    queue = new Queue(ANALYTICS_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return queue;
}
