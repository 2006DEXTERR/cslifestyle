// Affiliate helpers: ASIN validation, amazon.in URL building (whitelist-safe),
// device-type + source-type parsing for the /go redirect engine.

import type { AffiliateDeviceType, AffiliateSourceType } from '@prisma/client';

/** Amazon ASIN: 10 uppercase alphanumeric chars. */
const ASIN_RE = /^[A-Z0-9]{10}$/;

export function normalizeAsin(raw: string): string {
  return (raw ?? '').trim().toUpperCase();
}

export function isValidAsin(raw: string): boolean {
  return ASIN_RE.test(normalizeAsin(raw));
}

/** Allowed redirect hosts (NFR-SEC-008 affiliate redirect whitelist). */
export function isWhitelistedDomain(domain: string): boolean {
  const d = domain.toLowerCase().replace(/^www\./, '');
  return d === 'amazon.in' || d === 'amzn.to' || d === 'amazon.com';
}

export interface BuildUrlOpts {
  tag: string;
  domain?: string;
  linkCode?: string;
  extraParams?: Record<string, string> | null;
}

/**
 * Build the affiliate redirect target:
 *   https://www.amazon.in/dp/{ASIN}?tag=...&linkCode=ogi&th=1&psc=1
 * The host is always the (whitelisted) configured domain, so the URL is
 * whitelist-safe by construction.
 */
export function buildAmazonUrl(asin: string, opts: BuildUrlOpts): string {
  const domain = opts.domain && isWhitelistedDomain(opts.domain) ? opts.domain : 'amazon.in';
  const params = new URLSearchParams();
  if (opts.tag) params.set('tag', opts.tag);
  params.set('linkCode', opts.linkCode || 'ogi');
  params.set('th', '1');
  params.set('psc', '1');
  if (opts.extraParams) {
    for (const [k, v] of Object.entries(opts.extraParams)) {
      if (typeof v === 'string') params.set(k, v);
    }
  }
  return `https://www.${domain.replace(/^www\./, '')}/dp/${normalizeAsin(asin)}?${params.toString()}`;
}

const SOURCE_TYPES = new Set<AffiliateSourceType>([
  'product',
  'guide',
  'comparison',
  'category',
  'deals',
  'search',
  'direct',
  'other',
]);

export function parseSourceType(raw: unknown): AffiliateSourceType {
  return typeof raw === 'string' && SOURCE_TYPES.has(raw as AffiliateSourceType)
    ? (raw as AffiliateSourceType)
    : 'other';
}

/** Coarse device classification from a User-Agent (no PII stored). */
export function parseDeviceType(ua: string | undefined): AffiliateDeviceType {
  if (!ua) return 'unknown';
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|kindle/.test(s) || (/android/.test(s) && !/mobile/.test(s))) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile|windows phone/.test(s)) {
    return 'mobile';
  }
  return 'desktop';
}
