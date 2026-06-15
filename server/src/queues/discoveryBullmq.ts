import { Queue } from 'bullmq';
import { redis } from '../lib/redis';
import { DISCOVERY_QUEUE_NAME } from './discoveryQueue';

/** Lazily create/cache the BullMQ discovery queue (production only). */
let queue: Queue | undefined;

export function getDiscoveryQueue(): Queue {
  if (!queue) {
    queue = new Queue(DISCOVERY_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: { count: 200 }, removeOnFail: { count: 500 } },
    });
  }
  return queue;
}
