import { redis } from './redis';

/**
 * Reusable Redis cache layer (cache-aside).
 *
 * Design guarantees:
 *   - **Safe fallback** — only engages when the shared Redis connection is `ready`
 *     (opened best-effort at startup). If Redis is down/absent (dev, test, Upstash
 *     blip) it runs the loader directly: no connect timeouts, no thrown errors, never
 *     breaks the request.
 *   - **JSON serialisation** — values are JSON round-tripped; only cache plain data.
 *   - **Namespaced, deterministic keys** — see {@link CACHE_NS}.
 *   - **Public-only** — callers must cache only public / non-draft / per-everyone reads
 *     (never per-user or admin-draft data). See the getBySlug guards in the services.
 *
 * Longer TTLs are paired with explicit invalidation ({@link bust}); where invalidation
 * isn't wired, keep the TTL short (the staleness window is the TTL).
 */

/** Key namespaces (prefixes) — used for both reads and prefix-based invalidation. */
export const CACHE_NS = {
  productList: 'prod:list:',
  productSlug: 'prod:slug:',
  categoryList: 'cat:list:',
  categorySlug: 'cat:slug:',
  brandList: 'brand:list:',
  brandSlug: 'brand:slug:',
  guideList: 'guide:list:',
  guideSlug: 'guide:slug:',
  comparisonList: 'comp:list:',
  comparisonSlug: 'comp:slug:',
  suggestions: 'sugg:',
  overview: 'admin:overview',
} as const;

/** Standard TTLs (seconds). */
export const TTL = {
  catalogList: 300, // categories/brands lists — change rarely
  productList: 120, // product lists — 2 min
  detail: 300, // *-by-slug details — 5 min
  contentList: 180, // guides/comparisons lists — 3 min
  suggestions: 45,
  overview: 30,
} as const;

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

const bustAll = (prefixes: string[]): Promise<void> =>
  Promise.all(prefixes.map(cacheBust)).then(() => undefined);

/**
 * Domain invalidation helpers — call after a write. A product change also affects
 * category/brand product counts, suggestions and the admin overview, so those caches
 * are busted too. All best-effort (never throw).
 */
export const bust = {
  products: (): Promise<void> => bustAll(['prod:', 'cat:', 'brand:', 'sugg:', 'admin:overview']),
  categories: (): Promise<void> => bustAll(['cat:', 'prod:', 'sugg:', 'admin:overview']),
  brands: (): Promise<void> => bustAll(['brand:', 'prod:', 'sugg:', 'admin:overview']),
  guides: (): Promise<void> => bustAll(['guide:', 'sugg:', 'admin:overview']),
  comparisons: (): Promise<void> => bustAll(['comp:', 'sugg:', 'admin:overview']),
};
