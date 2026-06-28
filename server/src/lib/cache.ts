import { redis } from './redis';

/**
 * Cache-aside helper backed by the shared Redis connection (opened best-effort at
 * startup). It only engages when Redis is already `ready`; otherwise it runs the loader
 * directly — so dev/test/Redis-down paths are never slowed (no connect timeouts) or
 * broken. Reads/writes that fail fall back to serving fresh data.
 *
 * Use SHORT TTLs for data that has no explicit invalidation wiring (the staleness window
 * is the TTL). Only cache PUBLIC / non-draft / per-everyone responses.
 */
export async function cacheWrap<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const ready = redis.status === 'ready';
  if (ready) {
    try {
      const hit = await redis.get(key);
      if (hit !== null) return JSON.parse(hit) as T;
    } catch {
      /* ignore — serve fresh */
    }
  }
  const value = await loader();
  if (ready) {
    // Fire-and-forget write; never block the response on the cache.
    redis.set(key, JSON.stringify(value), 'EX', ttlSeconds).catch(() => undefined);
  }
  return value;
}

/** Best-effort invalidation by key prefix (no-op when Redis is unavailable). */
export async function cacheBust(prefix: string): Promise<void> {
  if (redis.status !== 'ready') return;
  try {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length) await redis.del(...keys);
  } catch {
    /* ignore */
  }
}
