/**
 * Amazon Product Advertising API (PA-API 5.0) core — shared by the CLI script
 * (`npm run products:fetch-amazon`) and the admin "Import through API" endpoint.
 *
 * Safe + ToS-compliant: signs requests with AWS SigV4 and calls the official
 * SearchItems endpoint. It NEVER scrapes Amazon web pages, never browser-automates,
 * and never writes to the DB. Output is a REVIEW CSV that a human edits before the
 * existing apply/import workflow turns selected rows into products.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import { request as httpsRequest } from 'node:https';
import { env } from '../../config/env';

export const KEYWORDS_FILE = 'amazon-product-keywords.csv';
export const REVIEW_FILE = 'amazon-products.review.csv';

/** Required env vars for PA-API. Reported by name only — values are never exposed. */
export const REQUIRED_PAAPI_VARS = [
  'AMAZON_PAAPI_ACCESS_KEY',
  'AMAZON_PAAPI_SECRET_KEY',
  'AMAZON_PAAPI_PARTNER_TAG',
] as const;

const SERVICE = 'ProductAdvertisingAPI';
const PATH = '/paapi5/searchitems';
const TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems';
const PARTNER_TYPE = 'Associates';
const RESOURCES = [
  'ItemInfo.Title',
  'ItemInfo.ByLineInfo',
  'Images.Primary.Large',
  'Offers.Listings.Price',
  'Offers.Listings.Availability.Message',
];
/** PA-API is throttled (≈1 req/s for new accounts) — pause between keywords. */
const REQUEST_DELAY_MS = 1100;

export interface PaapiConfig {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  marketplace: string;
  region: string;
  host: string;
}

/** Non-secret readiness view of PA-API configuration (safe to return to the UI). */
export interface PaapiReadiness {
  provider: 'amazon-paapi';
  partnerType: typeof PARTNER_TYPE;
  ready: boolean;
  required: string[];
  missing: string[];
  partnerTagConfigured: boolean;
  marketplace: string;
  region: string;
  host: string | null;
  keywordsFile: string;
  reviewFile: string;
}

/** Resolve PA-API config from env. Returns `{ config: null, missing }` when not ready. */
export function resolvePaapiConfig(): { config: PaapiConfig } | { config: null; missing: string[] } {
  const accessKey = env.AMAZON_PAAPI_ACCESS_KEY;
  const secretKey = env.AMAZON_PAAPI_SECRET_KEY;
  const partnerTag = env.AMAZON_PAAPI_PARTNER_TAG || env.AMAZON_ASSOCIATE_TAG;

  const missing: string[] = [];
  if (!accessKey) missing.push('AMAZON_PAAPI_ACCESS_KEY');
  if (!secretKey) missing.push('AMAZON_PAAPI_SECRET_KEY');
  if (!partnerTag) missing.push('AMAZON_PAAPI_PARTNER_TAG');
  if (!accessKey || !secretKey || !partnerTag) return { config: null, missing };

  const marketplace = env.AMAZON_PAAPI_MARKETPLACE;
  return {
    config: {
      accessKey,
      secretKey,
      partnerTag,
      marketplace,
      region: env.AMAZON_PAAPI_REGION,
      host: `webservices.${marketplace.replace(/^www\./, '')}`,
    },
  };
}

/** Readiness for the UI — never includes secret values. */
export function getPaapiReadiness(): PaapiReadiness {
  const resolved = resolvePaapiConfig();
  const marketplace = env.AMAZON_PAAPI_MARKETPLACE;
  return {
    provider: 'amazon-paapi',
    partnerType: PARTNER_TYPE,
    ready: resolved.config !== null,
    required: [...REQUIRED_PAAPI_VARS],
    missing: resolved.config ? [] : resolved.missing,
    partnerTagConfigured: Boolean(env.AMAZON_PAAPI_PARTNER_TAG || env.AMAZON_ASSOCIATE_TAG),
    marketplace,
    region: env.AMAZON_PAAPI_REGION,
    host: resolved.config ? resolved.config.host : null,
    keywordsFile: KEYWORDS_FILE,
    reviewFile: REVIEW_FILE,
  };
}

// ───────────────────────── CSV helpers ─────────────────────────

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '', inQuotes = false;
  let row: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* ignore */ }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const csvCell = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

// ───────────────────────── AWS SigV4 (PA-API) ─────────────────────────

const sha256hex = (data: string): string => createHash('sha256').update(data, 'utf8').digest('hex');
const hmac = (key: Buffer | string, data: string): Buffer => createHmac('sha256', key).update(data, 'utf8').digest();

function signingKey(secret: string, dateStamp: string, region: string): Buffer {
  return hmac(hmac(hmac(hmac('AWS4' + secret, dateStamp), region), SERVICE), 'aws4_request');
}

function signedHeaders(cfg: PaapiConfig, payload: string): Record<string, string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const canonicalHeaders =
    `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\n` +
    `host:${cfg.host}\nx-amz-date:${amzDate}\nx-amz-target:${TARGET}\n`;
  const signed = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
  const canonicalRequest = `POST\n${PATH}\n\n${canonicalHeaders}\n${signed}\n${sha256hex(payload)}`;
  const scope = `${dateStamp}/${cfg.region}/${SERVICE}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256hex(canonicalRequest)}`;
  const signature = hmac(signingKey(cfg.secretKey, dateStamp, cfg.region), stringToSign).toString('hex');
  return {
    'content-encoding': 'amz-1.0',
    'content-type': 'application/json; charset=utf-8',
    host: cfg.host,
    'x-amz-date': amzDate,
    'x-amz-target': TARGET,
    Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
  };
}

function postJson(cfg: PaapiConfig, payload: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const headers = { ...signedHeaders(cfg, payload), 'Content-Length': Buffer.byteLength(payload).toString() };
    const req = httpsRequest({ host: cfg.host, path: PATH, method: 'POST', headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ───────────────────────── PA-API SearchItems ─────────────────────────

export interface ReviewRow {
  category: string;
  keyword: string;
  asin: string;
  title: string;
  brand: string;
  image: string;
  amazonUrl: string;
  price: string;
  availability: string;
  selected: string; // 'true' | 'false' | 'no_result' | 'error'
}

interface PaapiItem {
  ASIN?: string;
  DetailPageURL?: string;
  ItemInfo?: { Title?: { DisplayValue?: string }; ByLineInfo?: { Brand?: { DisplayValue?: string }; Manufacturer?: { DisplayValue?: string } } };
  Images?: { Primary?: { Large?: { URL?: string } } };
  Offers?: { Listings?: Array<{ Price?: { DisplayAmount?: string }; Availability?: { Message?: string } }> };
}

type Logger = (msg: string) => void;
const noop: Logger = () => undefined;

export async function searchKeyword(
  cfg: PaapiConfig,
  category: string,
  keyword: string,
  brand: string,
  limit: number,
  log: Logger = noop,
): Promise<ReviewRow[]> {
  const payload = JSON.stringify({
    Keywords: keyword,
    ...(brand ? { Brand: brand } : {}),
    SearchIndex: 'All',
    ItemCount: Math.min(Math.max(limit, 1), 10),
    PartnerTag: cfg.partnerTag,
    PartnerType: PARTNER_TYPE,
    Marketplace: cfg.marketplace,
    Resources: RESOURCES,
  });

  const { status, body } = await postJson(cfg, payload);
  const json = JSON.parse(body || '{}') as { SearchResult?: { Items?: PaapiItem[] }; Errors?: Array<{ Code?: string; Message?: string }> };

  if (status !== 200 || json.Errors) {
    const msg = json.Errors?.map((e) => `${e.Code}: ${e.Message}`).join('; ') || `HTTP ${status}`;
    log(`  ! ${keyword} — PA-API error: ${msg}`);
    return [{ category, keyword, asin: '', title: '', brand, image: '', amazonUrl: '', price: '', availability: '', selected: 'error' }];
  }

  const items = json.SearchResult?.Items ?? [];
  if (items.length === 0) {
    log(`  · ${keyword} — no result`);
    return [{ category, keyword, asin: '', title: '', brand, image: '', amazonUrl: '', price: '', availability: '', selected: 'no_result' }];
  }

  return items.slice(0, limit).map((it, i) => {
    const listing = it.Offers?.Listings?.[0];
    log(`  ${i === 0 ? '✓' : '·'} ${keyword} -> ${it.ASIN} (${it.ItemInfo?.Title?.DisplayValue ?? ''})`);
    return {
      category,
      keyword,
      asin: it.ASIN ?? '',
      title: it.ItemInfo?.Title?.DisplayValue ?? '',
      brand: it.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? it.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue ?? brand,
      image: it.Images?.Primary?.Large?.URL ?? '',
      amazonUrl: it.DetailPageURL ?? '',
      price: listing?.Price?.DisplayAmount ?? '',
      availability: listing?.Availability?.Message ?? '',
      selected: i === 0 ? 'true' : 'false', // only the first result is pre-selected
    };
  });
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export class PaapiNotConfiguredError extends Error {
  missing: string[];
  constructor(missing: string[]) {
    super('Amazon PA-API credentials are not configured.');
    this.name = 'PaapiNotConfiguredError';
    this.missing = missing;
  }
}

export interface FetchReviewResult {
  keywords: number;
  rows: number;
  selected: number;
  reviewFile: string;
}

/**
 * Read the keyword CSV, call PA-API SearchItems per keyword (rate-limited), and write
 * the review CSV. Returns a non-secret summary. Throws {@link PaapiNotConfiguredError}
 * if credentials are missing — callers must surface that clearly, never fake success.
 */
export async function fetchAmazonReview(opts: { inputPath?: string; outputPath?: string; log?: Logger } = {}): Promise<FetchReviewResult> {
  const input = opts.inputPath ?? KEYWORDS_FILE;
  const output = opts.outputPath ?? REVIEW_FILE;
  const log = opts.log ?? noop;

  const resolved = resolvePaapiConfig();
  if (!resolved.config) throw new PaapiNotConfiguredError(resolved.missing);

  if (!existsSync(input)) throw new Error(`Missing ${input}. Create it with columns: category,keyword,brand(optional),limit(optional)`);
  const table = parseCsv(readFileSync(input, 'utf8'));
  if (table.length < 2) throw new Error(`${input} has no data rows.`);

  const header = table[0].map((h) => h.trim().toLowerCase());
  const ci = { category: header.indexOf('category'), keyword: header.indexOf('keyword'), brand: header.indexOf('brand'), limit: header.indexOf('limit') };
  if (ci.category < 0 || ci.keyword < 0) throw new Error('Input CSV must have at least "category" and "keyword" columns.');

  const rows = table.slice(1).map((r) => ({
    category: (r[ci.category] ?? '').trim(),
    keyword: (r[ci.keyword] ?? '').trim(),
    brand: ci.brand >= 0 ? (r[ci.brand] ?? '').trim() : '',
    limit: ci.limit >= 0 ? Math.max(parseInt(r[ci.limit] ?? '1', 10) || 1, 1) : 1,
  })).filter((r) => r.keyword);

  log(`Read ${rows.length} keyword(s) from ${input}.`);

  const out: ReviewRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      out.push(...(await searchKeyword(resolved.config, r.category, r.keyword, r.brand, r.limit, log)));
    } catch (err) {
      log(`  ! ${r.keyword} — request failed: ${(err as Error).message}`);
      out.push({ category: r.category, keyword: r.keyword, asin: '', title: '', brand: r.brand, image: '', amazonUrl: '', price: '', availability: '', selected: 'error' });
    }
    if (i < rows.length - 1) await sleep(REQUEST_DELAY_MS); // respect PA-API rate limit
  }

  const head = 'category,keyword,asin,title,brand,image,amazonUrl,price,availability,selected';
  const lines = out.map((r) =>
    [r.category, r.keyword, r.asin, r.title, r.brand, r.image, r.amazonUrl, r.price, r.availability, r.selected].map(csvCell).join(','),
  );
  writeFileSync(output, [head, ...lines].join('\n') + '\n', 'utf8');

  return {
    keywords: rows.length,
    rows: out.length,
    selected: out.filter((r) => r.selected === 'true').length,
    reviewFile: output,
  };
}
