import { describe, it, expect } from 'vitest';
import { redis, closeRedis } from '../../src/lib/redis';

// The shared client is lazyConnect, so in the test environment it never opens a socket
// (`status === 'wait'`). closeRedis() must tear such a client down cleanly and idempotently
// so a short-lived script (e.g. scripts/sync-product-images.ts) can exit without hanging.
describe('closeRedis — clean, idempotent shutdown', () => {
  it('resolves without throwing on a never-connected (lazy) client', async () => {
    expect(['wait', 'end']).toContain(redis.status);
    await expect(closeRedis()).resolves.toBeUndefined();
    expect(redis.status).toBe('end');
  });

  it('is a safe no-op when already closed', async () => {
    await expect(closeRedis()).resolves.toBeUndefined();
    expect(redis.status).toBe('end');
  });
});
