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

/**
 * Detect placeholder/seed ASINs that have the right *shape* but are not real
 * Amazon catalog items (e.g. the `B0SEED0001` values minted by the seed). These
 * pass `isValidAsin` (10 alphanumerics) yet 404 on Amazon, so they must never
 * drive a real affiliate redirect. Extend the prefixes as new placeholders appear.
 */
const FAKE_ASIN_PREFIXES = ['B0SEED', 'B0FAKE', 'B0TEST', 'B0EXAMPLE'];
export function isFakeAsin(raw: string): boolean {
  const a = normalizeAsin(raw);
  if (!a) return true;
  if (!isValidAsin(a)) return true; // wrong shape is "fake" for our purposes
  return FAKE_ASIN_PREFIXES.some((p) => a.startsWith(p));
}

/** A real, usable ASIN: correct shape AND not a known placeholder. */
export function isRealAsin(raw: string): boolean {
  return isValidAsin(raw) && !isFakeAsin(raw);
}

/**
 * Narrower check for WRITE validation: blocks empty + the known seed/placeholder
 * prefixes (e.g. `B0SEED0001`) WITHOUT enforcing strict 10-char format — so admins
 * can still save edge-case identifiers. Runtime URL generation (`isRealAsin`) is the
 * strict gate; a non-conforming ASIN just won't produce an affiliate link.
 */
export function isPlaceholderAsin(raw: string): boolean {
  const a = normalizeAsin(raw);
  if (!a) return true;
  return FAKE_ASIN_PREFIXES.some((p) => a.startsWith(p));
}

/**
 * Detect placeholder affiliate URLs (the literal `amazon.in/dp/example` shipped
 * in the mock, or any `/dp/EXAMPLE`-style stub). Empty strings count as placeholder.
 */
export function isPlaceholderAffiliateUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  const u = url.trim().toLowerCase();
  if (!u) return true;
  if (/\/dp\/(example|asin|xxxx+|placeholder|test)\b/.test(u)) return true;
  // A bare amazon URL with no /dp/<asin> path segment is not a usable product link.
  if (/amazon\./.test(u) && !/\/dp\/[a-z0-9]{10}(\b|[/?])/.test(u)) return true;
  return false;
}

/**
 * Detect placeholder / generic-stock product images. Empty strings and the
 * seeded stock-photo hosts (Pexels/Unsplash/placeholder services) are flagged so
 * the admin knows to upload a real product image. Real images are not invented.
 */
const STOCK_IMAGE_HOSTS = [
  'images.pexels.com',
  'pexels.com',
  'images.unsplash.com',
  'unsplash.com',
  'placehold',
  'placeholder.com',
  'via.placeholder',
  'example.com',
];
export function isPlaceholderImage(url: string | null | undefined): boolean {
  if (!url) return true;
  const u = url.trim().toLowerCase();
  if (!u) return true;
  // A real product image is always an absolute http(s) URL — anything else
  // (empty, a sentinel like NEEDS_IMAGE, a bare filename) is a placeholder.
  if (!/^https?:\/\//.test(u)) return true;
  return STOCK_IMAGE_HOSTS.some((h) => u.includes(h));
}

/**
 * Resolve the public affiliate URL for a product. When the ASIN is real, the
 * canonical `https://www.amazon.in/dp/{ASIN}?tag=...` is generated (single source
 * of truth — never a stored placeholder). Otherwise returns '' so the UI shows no
 * link rather than a fake one. Stored non-placeholder URLs are honoured as a fallback.
 */
export function resolveAffiliateUrl(
  asin: string,
  storedUrl: string | null | undefined,
  opts: BuildUrlOpts,
): string {
  if (isRealAsin(asin)) return buildAmazonUrl(asin, opts);
  if (storedUrl && !isPlaceholderAffiliateUrl(storedUrl)) return storedUrl.trim();
  return '';
}

export interface ProductDataIssue {
  field: 'asin' | 'image' | 'affiliateUrl';
  message: string;
}

/**
 * Admin-side data-quality warnings for a product. The product stays visible; these
 * just tell an editor what needs real data imported (fake ASIN, stock/empty image,
 * placeholder affiliate link). Pure + synchronous so presenters can call it per row.
 */
export function productDataWarnings(p: {
  asin: string;
  image?: string | null;
  affiliateUrl?: string | null;
}): ProductDataIssue[] {
  const warnings: ProductDataIssue[] = [];
  if (isFakeAsin(p.asin)) {
    warnings.push({ field: 'asin', message: 'Placeholder ASIN — import the real Amazon ASIN to enable the affiliate link.' });
  }
  if (isPlaceholderImage(p.image)) {
    warnings.push({ field: 'image', message: 'Stock/placeholder image — upload or import the real product image.' });
  }
  if (isPlaceholderAffiliateUrl(p.affiliateUrl) && !isRealAsin(p.asin)) {
    warnings.push({ field: 'affiliateUrl', message: 'No usable affiliate URL — needs a real ASIN.' });
  }
  return warnings;
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
