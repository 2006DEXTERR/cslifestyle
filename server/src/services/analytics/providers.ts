import { env } from '../../config/env';
import { logger } from '../../lib/logger';

/**
 * External analytics provider abstraction (spec §13.2/13.3/13.6). Adapters only — with
 * `ANALYTICS_DRIVER=mock` (default) every adapter is a no-op and **nothing leaves the
 * process** (dev/test/CI). With `live`, an adapter is active only when its credentials
 * are present. First-party DB analytics never depend on these. Mirrors the AI provider
 * driver (ADR-024) / queue driver (ADR-023) patterns.
 */

export interface OutboundEvent {
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  sessionId?: string | null;
  url?: string | null;
  device?: string | null;
  country?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ProviderStatus {
  id: 'posthog' | 'ga4' | 'gsc';
  name: string;
  configured: boolean;
  enabled: boolean; // configured AND driver=live
}

const isLive = (): boolean => env.ANALYTICS_DRIVER === 'live';

export function posthogConfigured(): boolean {
  return Boolean(env.POSTHOG_API_KEY);
}
export function ga4Configured(): boolean {
  return Boolean(env.GA4_MEASUREMENT_ID && env.GA4_API_SECRET);
}
export function gscConfigured(): boolean {
  return Boolean(env.GSC_SITE_URL);
}

export function listAnalyticsProviders(): ProviderStatus[] {
  return [
    { id: 'posthog', name: 'PostHog', configured: posthogConfigured(), enabled: isLive() && posthogConfigured() },
    { id: 'ga4', name: 'Google Analytics 4', configured: ga4Configured(), enabled: isLive() && ga4Configured() },
    { id: 'gsc', name: 'Google Search Console', configured: gscConfigured(), enabled: isLive() && gscConfigured() },
  ];
}

async function sendPosthog(ev: OutboundEvent): Promise<void> {
  await fetch(`${env.POSTHOG_HOST}/capture/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: env.POSTHOG_API_KEY,
      event: ev.eventType,
      properties: { distinct_id: ev.sessionId ?? 'anon', ...ev.metadata, $current_url: ev.url, country: ev.country, device: ev.device },
    }),
  });
}

async function sendGa4(ev: OutboundEvent): Promise<void> {
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${env.GA4_MEASUREMENT_ID}&api_secret=${env.GA4_API_SECRET}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: ev.sessionId ?? 'anon',
      events: [{ name: ev.eventType, params: { entity_type: ev.entityType, entity_id: ev.entityId, page_location: ev.url } }],
    }),
  });
}

/**
 * Forward one event to enabled external providers (server Measurement Protocol, §13.3).
 * Fire-and-forget + best-effort; failures are logged, never thrown. No-op in mock mode.
 */
export async function dispatchExternal(ev: OutboundEvent): Promise<void> {
  if (!isLive()) return;
  const jobs: Promise<void>[] = [];
  if (posthogConfigured()) jobs.push(sendPosthog(ev).catch((err) => logger.warn({ err }, 'posthog dispatch failed')));
  if (ga4Configured()) jobs.push(sendGa4(ev).catch((err) => logger.warn({ err }, 'ga4 dispatch failed')));
  await Promise.allSettled(jobs);
}

export interface GscRow {
  date: string;
  pageUrl: string;
  query: string;
  device: string;
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Daily Search Console pull (§13.6). Offline/mock returns [] (no credentials needed in
 * CI). The `live` implementation (OAuth + Search Analytics API) is a deployment concern;
 * the shape + upsert path are ready for it.
 */
export async function pullSearchConsole(): Promise<GscRow[]> {
  if (!isLive() || !gscConfigured()) return [];
  logger.info('GSC live pull requested — returning [] (OAuth wiring is a deployment task)');
  return [];
}
