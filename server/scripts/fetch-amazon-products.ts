/**
 * Fetch Amazon products by keyword via the official Amazon Product Advertising API
 * (PA-API 5.0 SearchItems) and write a REVIEW CSV. This is the safe, ToS-compliant
 * way to populate the catalog — NO SCRAPING, ever.
 *
 *   - Reads server/amazon-product-keywords.csv (category,keyword,brand?,limit?).
 *   - Calls PA-API SearchItems (AWS SigV4-signed; no SDK dependency).
 *   - Writes server/amazon-products.review.csv for a HUMAN to review.
 *   - Does NOT touch the DB, does NOT import, does NOT overwrite my-products.csv.
 *
 *   npm run products:fetch-amazon
 *
 * Required env (see server/.env.example):
 *   AMAZON_PAAPI_ACCESS_KEY  AMAZON_PAAPI_SECRET_KEY  AMAZON_PAAPI_PARTNER_TAG
 *   AMAZON_PAAPI_MARKETPLACE (default www.amazon.in)   AMAZON_PAAPI_REGION (default eu-west-1)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import { request as httpsRequest } from 'node:https';
import { env } from '../src/config/env';

const INPUT = 'amazon-product-keywords.csv';
const OUTPUT = 'amazon-products.review.csv';
const SERVICE = 'ProductAdvertisingAPI';
const PATH = '/paapi5/searchitems';
const TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems';
const RESOURCES = [
  'ItemInfo.Title',
  'ItemInfo.ByLineInfo',
  'Images.Primary.Large',
  'Offers.Listings.Price',
  'Offers.Listings.Availability.Message',
];
/** PA-API is throttled (≈1 req/s for new accounts) — pause between keywords. */
const REQUEST_DELAY_MS = 1100;

// ───────────────────────── CSV helpers ─────────────────────────

function parseCsv(text: string): string[][] {
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

interface PaapiConfig {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  marketplace: string;
  region: string;
  host: string;
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

interface ReviewRow {
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

async function searchKeyword(cfg: PaapiConfig, category: string, keyword: string, brand: string, limit: number): Promise<ReviewRow[]> {
  const payload = JSON.stringify({
    Keywords: keyword,
    ...(brand ? { Brand: brand } : {}),
    SearchIndex: 'All',
    ItemCount: Math.min(Math.max(limit, 1), 10),
    PartnerTag: cfg.partnerTag,
    PartnerType: 'Associates',
    Marketplace: cfg.marketplace,
    Resources: RESOURCES,
  });

  const { status, body } = await postJson(cfg, payload);
  const json = JSON.parse(body || '{}') as { SearchResult?: { Items?: PaapiItem[] }; Errors?: Array<{ Code?: string; Message?: string }> };

  if (status !== 200 || json.Errors) {
    const msg = json.Errors?.map((e) => `${e.Code}: ${e.Message}`).join('; ') || `HTTP ${status}`;
    console.error(`  ! ${keyword} — PA-API error: ${msg}`);
    return [{ category, keyword, asin: '', title: '', brand, image: '', amazonUrl: '', price: '', availability: '', selected: 'error' }];
  }

  const items = json.SearchResult?.Items ?? [];
  if (items.length === 0) {
    console.log(`  · ${keyword} — no result`);
    return [{ category, keyword, asin: '', title: '', brand, image: '', amazonUrl: '', price: '', availability: '', selected: 'no_result' }];
  }

  return items.slice(0, limit).map((it, i) => {
    const listing = it.Offers?.Listings?.[0];
    console.log(`  ${i === 0 ? '✓' : '·'} ${keyword} -> ${it.ASIN} (${it.ItemInfo?.Title?.DisplayValue ?? ''})`);
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

async function main(): Promise<void> {
  if (!existsSync(INPUT)) {
    console.error(`Missing ${INPUT}. Create it with columns: category,keyword,brand(optional),limit(optional)`);
    process.exit(2);
  }
  const table = parseCsv(readFileSync(INPUT, 'utf8'));
  if (table.length < 2) { console.error(`${INPUT} has no data rows.`); process.exit(2); }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const ci = { category: header.indexOf('category'), keyword: header.indexOf('keyword'), brand: header.indexOf('brand'), limit: header.indexOf('limit') };
  if (ci.category < 0 || ci.keyword < 0) {
    console.error('Input CSV must have at least "category" and "keyword" columns.');
    process.exit(2);
  }
  const rows = table.slice(1).map((r) => ({
    category: (r[ci.category] ?? '').trim(),
    keyword: (r[ci.keyword] ?? '').trim(),
    brand: ci.brand >= 0 ? (r[ci.brand] ?? '').trim() : '',
    limit: ci.limit >= 0 ? Math.max(parseInt(r[ci.limit] ?? '1', 10) || 1, 1) : 1,
  })).filter((r) => r.keyword);

  console.log(`Read ${rows.length} keyword(s) from ${INPUT}.`);

  const cfg: PaapiConfig | null = (() => {
    const accessKey = env.AMAZON_PAAPI_ACCESS_KEY, secretKey = env.AMAZON_PAAPI_SECRET_KEY, partnerTag = env.AMAZON_PAAPI_PARTNER_TAG || env.AMAZON_ASSOCIATE_TAG;
    if (!accessKey || !secretKey || !partnerTag) return null;
    const marketplace = env.AMAZON_PAAPI_MARKETPLACE;
    return { accessKey, secretKey, partnerTag, marketplace, region: env.AMAZON_PAAPI_REGION, host: `webservices.${marketplace.replace(/^www\./, '')}` };
  })();

  if (!cfg) {
    console.error(
      '\n❌ PA-API credentials not set. Set these env vars (PA-API only — never scraping):\n' +
        '   AMAZON_PAAPI_ACCESS_KEY, AMAZON_PAAPI_SECRET_KEY, AMAZON_PAAPI_PARTNER_TAG\n' +
        '   (optional: AMAZON_PAAPI_MARKETPLACE=www.amazon.in, AMAZON_PAAPI_REGION=eu-west-1)\n' +
        'See server/docs/amazon-paapi-workflow.md. No review CSV was written.',
    );
    process.exit(1);
  }

  const out: ReviewRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      out.push(...(await searchKeyword(cfg, r.category, r.keyword, r.brand, r.limit)));
    } catch (err) {
      console.error(`  ! ${r.keyword} — request failed: ${(err as Error).message}`);
      out.push({ category: r.category, keyword: r.keyword, asin: '', title: '', brand: r.brand, image: '', amazonUrl: '', price: '', availability: '', selected: 'error' });
    }
    if (i < rows.length - 1) await sleep(REQUEST_DELAY_MS); // respect PA-API rate limit
  }

  const head = 'category,keyword,asin,title,brand,image,amazonUrl,price,availability,selected';
  const lines = out.map((r) =>
    [r.category, r.keyword, r.asin, r.title, r.brand, r.image, r.amazonUrl, r.price, r.availability, r.selected].map(csvCell).join(','),
  );
  writeFileSync(OUTPUT, [head, ...lines].join('\n') + '\n', 'utf8');

  const selected = out.filter((r) => r.selected === 'true').length;
  console.log(
    `\n✓ Wrote ${OUTPUT} — ${out.length} row(s), ${selected} pre-selected.\n` +
      `REVIEW it, set selected=true/false, then:\n` +
      `  npm run products:apply-amazon-review   # → my-products.generated.csv\n` +
      `  npm run products:validate -- my-products.generated.csv`,
  );
}

main().catch((err) => { console.error('❌ fetch-amazon-products failed:', err); process.exit(1); });
