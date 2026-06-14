import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * Shared Redis connection (cache + BullMQ).
 * - `maxRetriesPerRequest: null` is REQUIRED by BullMQ.
 * - `lazyConnect: true` so importing this module never opens a socket (keeps
 *   unit tests and the liveness probe independent of Redis availability).
 */
export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
  connectTimeout: 5000,
});

redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));
redis.on('connect', () => logger.info('Redis connected'));
redis.on('close', () => logger.warn('Redis connection closed'));

/** Open the connection if it is not already open. Safe to call repeatedly. */
export async function connectRedis(): Promise<void> {
  if (redis.status === 'wait' || redis.status === 'end') {
    await redis.connect();
  }
}
