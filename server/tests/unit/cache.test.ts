import { describe, it, expect, vi } from 'vitest';
import { cacheWrap, cacheBust, bust, CACHE_NS, TTL } from '../../src/lib/cache';

// In the test environment Redis is never connected (lazyConnect), so `redis.status`
// stays non-ready and the cache layer must degrade to a transparent pass-through.
describe('cache layer — safe fallback when Redis is unavailable', () => {
  it('cacheWrap runs the loader and returns its value', async () => {
    const loader = vi.fn().mockResolvedValue({ a: 1, b: [2, 3] });
    expect(await cacheWrap('t:1', 60, loader)).toEqual({ a: 1, b: [2, 3] });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('does not serve stale data without Redis (loader runs every call)', async () => {
    let n = 0;
    const loader = async () => ++n;
    expect(await cacheWrap('t:2', 60, loader)).toBe(1);
    expect(await cacheWrap('t:2', 60, loader)).toBe(2);
  });

  it('propagates loader errors (never caches a rejection)', async () => {
    await expect(cacheWrap('t:3', 60, async () => { throw new Error('boom'); })).rejects.toThrow('boom');
  });

  it('cacheBust + domain invalidation helpers are safe no-ops', async () => {
    await expect(cacheBust('prod:')).resolves.toBeUndefined();
    await expect(bust.products()).resolves.toBeUndefined();
    await expect(bust.categories()).resolves.toBeUndefined();
    await expect(bust.brands()).resolves.toBeUndefined();
    await expect(bust.guides()).resolves.toBeUndefined();
    await expect(bust.comparisons()).resolves.toBeUndefined();
  });

  it('exposes namespaced, deterministic key prefixes + sane TTLs', () => {
    expect(CACHE_NS.productSlug).toBe('prod:slug:');
    expect(CACHE_NS.categoryList).toBe('cat:list:');
    expect(CACHE_NS.overview).toBe('admin:overview');
    // suggestions are the shortest-lived; details/lists longer.
    expect(TTL.suggestions).toBeLessThan(TTL.detail);
    expect(TTL.catalogList).toBeGreaterThanOrEqual(300);
    expect(TTL.overview).toBeLessThanOrEqual(60);
  });
});
