import { Queue } from 'bullmq';
import { redis } from '../lib/redis';
import { AI_QUEUE_NAME } from './aiQueue';

/** Lazily create/cache the BullMQ AI generation queue (production only). */
let queue: Queue | undefined;

export function getAiQueue(): Queue {
  if (!queue) {
    queue = new Queue(AI_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 2000 },
      },
    });
  }
  return queue;
}
