import { Queue } from 'bullmq';
import type { ImportType } from '@prisma/client';
import { redis } from '../lib/redis';
import { IMPORT_QUEUE_BY_TYPE } from './importQueue';

/** Lazily create/cache the BullMQ queue for an import type (production only). */
const cache = new Map<string, Queue>();

export function getImportQueue(type: ImportType): Queue {
  const name = IMPORT_QUEUE_BY_TYPE[type];
  let q = cache.get(name);
  if (!q) {
    q = new Queue(name, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 },
      },
    });
    cache.set(name, q);
  }
  return q;
}
