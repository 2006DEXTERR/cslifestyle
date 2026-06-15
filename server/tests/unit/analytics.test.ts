import { describe, it, expect } from 'vitest';
import { rangeToSince } from '../../src/services/analytics/analytics.service';
import { listAnalyticsProviders, posthogConfigured, ga4Configured, gscConfigured, dispatchExternal } from '../../src/services/analytics/providers';

describe('analytics date ranges', () => {
  it('today starts at UTC midnight', () => {
    const since = rangeToSince('today');
    expect(since.getUTCHours()).toBe(0);
    expect(since.getUTCMinutes()).toBe(0);
    expect(since.getUTCSeconds()).toBe(0);
  });

  it('last7days / last30days are roughly N days back', () => {
    const d7 = (Date.now() - rangeToSince('last7days').getTime()) / 86_400_000;
    const d30 = (Date.now() - rangeToSince('last30days').getTime()) / 86_400_000;
    expect(d7).toBeGreaterThan(6.5);
    expect(d7).toBeLessThan(7.5);
    expect(d30).toBeGreaterThan(29.5);
    expect(d30).toBeLessThan(30.5);
  });

  it('thisMonth starts on the 1st', () => {
    expect(rangeToSince('thisMonth').getUTCDate()).toBe(1);
  });
});

describe('external provider abstraction (offline mock)', () => {
  it('lists 3 providers, none enabled without credentials in mock mode', () => {
    const providers = listAnalyticsProviders();
    expect(providers.map((p) => p.id)).toEqual(['posthog', 'ga4', 'gsc']);
    expect(providers.every((p) => p.enabled === false)).toBe(true);
  });

  it('reports unconfigured providers when no keys are set', () => {
    expect(posthogConfigured()).toBe(false);
    expect(ga4Configured()).toBe(false);
    expect(gscConfigured()).toBe(false);
  });

  it('dispatchExternal is a no-op in mock mode (never throws, no network)', async () => {
    await expect(dispatchExternal({ eventType: 'page_view', url: '/x' })).resolves.toBeUndefined();
  });
});
