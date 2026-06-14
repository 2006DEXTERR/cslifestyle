import { Queue, type QueueOptions } from 'bullmq';
import { redis } from './redis';

/**
 * BullMQ queue registry. Queue names mirror the AI/work pipeline defined in the
 * blueprint (spec §10.3 + §16.6). Processors are registered by the worker
 * process in Phase 4+; Phase 0 only establishes the infrastructure + factory.
 */
export const QUEUE_NAMES = [
  'default',
  'imports',
  'price-sync',
  'rating-sync',
  'ai-critical',
  'ai-product',
  'ai-guide',
  'ai-comparison',
  'ai-category',
  'ai-schema',
  'ai-links',
  'sitemaps',
  'analytics',
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

const baseOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
};

const registry = new Map<QueueName, Queue>();

/** Lazily create (and cache) a BullMQ queue by name. */
export function getQueue(name: QueueName): Queue {
  let queue = registry.get(name);
  if (!queue) {
    queue = new Queue(name, baseOptions);
    registry.set(name, queue);
  }
  return queue;
}

/** Gracefully close all open queues (used on shutdown). */
export async function closeQueues(): Promise<void> {
  await Promise.all([...registry.values()].map((q) => q.close()));
  registry.clear();
}
