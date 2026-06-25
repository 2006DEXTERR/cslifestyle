import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Focused unit tests for `canQueueVerificationEmail()` — the pre-flight gate that
 * decides whether a newsletter double-opt-in subscriber row may be created.
 *
 * It depends on three config values: `env.QUEUE_DRIVER`, `env.RESEND_API_KEY` and
 * `isProd` (a load-time constant in src/config/env). To exercise every branch without
 * a real .env load or DB, we mock the config/env module per case and re-import the
 * delivery module fresh. The function is pure, so nothing else (prisma/Resend network)
 * is actually invoked.
 */
type Overrides = {
  NODE_ENV: 'production' | 'development' | 'test';
  RESEND_API_KEY?: string;
  QUEUE_DRIVER: 'inline' | 'bullmq';
};

async function loadGate(o: Overrides): Promise<() => boolean> {
  vi.resetModules();
  vi.doMock('../../src/config/env', () => ({
    env: {
      APP_URL: 'http://localhost:3000',
      LOG_LEVEL: 'silent',
      EMAIL_FROM: 'CSLifestyle <test@resend.dev>',
      EMAIL_MAX_RETRIES: 3,
      NODE_ENV: o.NODE_ENV,
      QUEUE_DRIVER: o.QUEUE_DRIVER,
      RESEND_API_KEY: o.RESEND_API_KEY,
    },
    isProd: o.NODE_ENV === 'production',
    isDev: o.NODE_ENV === 'development',
  }));
  const mod = await import('../../src/services/marketing/delivery');
  return mod.canQueueVerificationEmail;
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../../src/config/env');
});

describe('canQueueVerificationEmail()', () => {
  it('production + no RESEND_API_KEY + inline → false (fail fast, no row created)', async () => {
    const gate = await loadGate({ NODE_ENV: 'production', QUEUE_DRIVER: 'inline' });
    expect(gate()).toBe(false);
  });

  it('development + no RESEND_API_KEY + inline → true (offline dev fallback)', async () => {
    const gate = await loadGate({ NODE_ENV: 'development', QUEUE_DRIVER: 'inline' });
    expect(gate()).toBe(true);
  });

  it('test + no RESEND_API_KEY + inline → true (offline test fallback)', async () => {
    const gate = await loadGate({ NODE_ENV: 'test', QUEUE_DRIVER: 'inline' });
    expect(gate()).toBe(true);
  });

  it('RESEND_API_KEY present → true even in production (real send attempted)', async () => {
    const gate = await loadGate({ NODE_ENV: 'production', RESEND_API_KEY: 're_test_key', QUEUE_DRIVER: 'inline' });
    expect(gate()).toBe(true);
  });

  it('bullmq queue mode → true even in production with no key (worker delivers it)', async () => {
    const gate = await loadGate({ NODE_ENV: 'production', QUEUE_DRIVER: 'bullmq' });
    expect(gate()).toBe(true);
  });
});
