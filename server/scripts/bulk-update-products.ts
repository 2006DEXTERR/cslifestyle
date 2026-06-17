/**
 * Bulk product update from a CSV — load REAL ASINs / images for the seeded
 * placeholder catalog. Admin-safe and idempotent:
 *
 *   - Matches existing products by `slug` (never creates rows blindly).
 *   - Blank cells AND unfilled placeholders (NEEDS_ASIN / NEEDS_IMAGE / PASTE_…)
 *     are left unchanged — so you can fill the CSV gradually.
 *   - Rejects fake data (B0SEED-style ASINs, amazon.in/dp/example, non-URL/stock
 *     images) — the offending row is skipped and reported.
 *   - `affiliateUrl` is AUTO-GENERATED from the ASIN — you never type one.
 *   - `--validate` checks the CSV and exits non-zero on any error (no writes).
 *   - `--dry` previews changes without writing.
 *
 * CSV header (order-independent, case-insensitive): slug,name,asin,image,affiliateUrl
 *
 * Usage (defaults to ./my-products.csv):
 *   npm run products:validate            # check, no writes (fails on errors)
 *   npm run products:bulk                # apply
 *   npm run products:bulk -- ./other.csv --dry
 *
 * Does NOT scrape Amazon and does NOT call the PA-API — you paste the real
 * ASINs/images into the CSV yourself.
 */
import { readFileSync, existsSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env';
import {
  isRealAsin,
  isFakeAsin,
  isPlaceholderAffiliateUrl,
  isPlaceholderImage,
  resolveAffiliateUrl,
} from '../src/lib/affiliate';

const prisma = new PrismaClient();

const DEFAULT_CSV = 'my-products.csv';
const REQUIRED_HEADERS = ['slug'] as const;
const KNOWN_HEADERS = ['slug', 'name', 'asin', 'image', 'affiliateurl'] as const;

/** Unfilled template placeholders — treated as "not provided yet" (not an error). */
const PENDING_RE = /^(needs_|paste_|todo|tbd|<.*>$|xxx+)/i;
const isPending = (v: string): boolean => v === '' || PENDING_RE.test(v.trim());

/** Minimal RFC-4180-ish CSV parser (handles quotes, escaped quotes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* ignore — handled by \n */ }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

type Status = 'updated' | 'skipped' | 'unchanged' | 'pending';
interface RowResult {
  slug: string;
  status: Status;
  changes: string[];
  notes: string[];
  errors: string[];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const validate = args.includes('--validate');
  const dryRun = validate || args.includes('--dry');
  const file = args.find((a) => !a.startsWith('--')) ?? DEFAULT_CSV;

  if (!existsSync(file)) {
    console.error(`CSV not found: ${file}\nGenerate one first:  npm run products:template`);
    process.exit(2);
  }

  const table = parseCsv(readFileSync(file, 'utf8'));
  if (table.length < 2) { console.error('CSV has no data rows.'); process.exit(2); }

  const header = table[0].map((h) => h.trim().toLowerCase());
  for (const req of REQUIRED_HEADERS) {
    if (!header.includes(req)) {
      console.error(`CSV is missing the required "${req}" column. Expected: ${KNOWN_HEADERS.join(',')}`);
      process.exit(2);
    }
  }
  const col = (name: string) => header.indexOf(name);
  const idx = { slug: col('slug'), name: col('name'), asin: col('asin'), image: col('image'), affiliateUrl: col('affiliateurl') };

  const tag = env.AMAZON_ASSOCIATE_TAG;
  const domain = env.AMAZON_DOMAIN;
  const results: RowResult[] = [];

  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const cell = (i: number) => (i >= 0 && i < cells.length ? cells[i].trim() : '');
    const slug = cell(idx.slug);
    const res: RowResult = { slug, status: 'unchanged', changes: [], notes: [], errors: [] };

    if (!slug) { res.status = 'skipped'; res.errors.push('empty slug'); results.push(res); continue; }

    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) { res.status = 'skipped'; res.errors.push('no product with this slug'); results.push(res); continue; }

    // Pending placeholders → treat as "not provided" (leave unchanged, no error).
    const nameRaw = cell(idx.name);
    const asinRaw = cell(idx.asin);
    const imageRaw = cell(idx.image);
    const affRaw = cell(idx.affiliateUrl);

    const name = isPending(nameRaw) ? '' : nameRaw;
    const asin = isPending(asinRaw) ? '' : asinRaw.toUpperCase();
    const image = isPending(imageRaw) ? '' : imageRaw;
    const csvAffiliate = isPending(affRaw) ? '' : affRaw;

    if (isPending(asinRaw)) res.notes.push('asin pending');
    if (isPending(imageRaw)) res.notes.push('image pending');

    // Validate only REAL (non-pending) provided values.
    if (asin && isFakeAsin(asin)) res.errors.push(`fake/invalid ASIN "${asin}"`);
    if (image && isPlaceholderImage(image)) res.errors.push(`invalid image URL "${image}" (must be an http(s) product image)`);
    if (csvAffiliate && isPlaceholderAffiliateUrl(csvAffiliate)) res.errors.push('placeholder affiliate URL');

    if (res.errors.length > 0) { res.status = 'skipped'; results.push(res); continue; }

    // Duplicate-ASIN guard (asin is unique).
    if (asin && asin !== product.asin) {
      const clash = await prisma.product.findUnique({ where: { asin }, select: { slug: true } });
      if (clash && clash.slug !== slug) {
        res.status = 'skipped';
        res.errors.push(`ASIN ${asin} already used by "${clash.slug}"`);
        results.push(res);
        continue;
      }
    }

    // ── build the update ──
    const data: Record<string, unknown> = {};
    const effectiveAsin = asin || product.asin;

    if (name && name !== product.title) { data.title = name; res.changes.push('name'); }
    if (asin && asin !== product.asin) { data.asin = asin; res.changes.push('asin'); }
    if (image && image !== product.image) { data.image = image; data.gallery = [image]; res.changes.push('image'); }

    // affiliate URL: explicit (real) value wins; else regenerate from the effective ASIN.
    const nextAffiliate = resolveAffiliateUrl(effectiveAsin, csvAffiliate || null, { tag, domain }) || null;
    if (nextAffiliate !== (product.affiliateUrl ?? null)) { data.affiliateUrl = nextAffiliate; res.changes.push('affiliateUrl'); }

    if (Object.keys(data).length === 0) {
      res.status = res.notes.length ? 'pending' : 'unchanged';
      results.push(res);
      continue;
    }

    if (!dryRun) {
      await prisma.$transaction(async (tx) => {
        await tx.product.update({ where: { slug }, data });
        if (typeof data.image === 'string') {
          await tx.productImage.deleteMany({ where: { productId: product.id } });
          await tx.productImage.create({ data: { productId: product.id, imageUrl: data.image as string, sortOrder: 0 } });
        }
      });
    }
    res.status = 'updated';
    if (!isRealAsin(effectiveAsin)) res.notes.push('ASIN still placeholder — affiliate link stays disabled until a real ASIN is provided');
    results.push(res);
  }

  // ── report ──
  const updated = results.filter((r) => r.status === 'updated');
  const pending = results.filter((r) => r.status === 'pending');
  const unchanged = results.filter((r) => r.status === 'unchanged');
  const skipped = results.filter((r) => r.status === 'skipped');
  const mode = validate ? '[VALIDATE] ' : dryRun ? '[DRY RUN] ' : '';
  console.log(`\n${mode}Bulk product update (${file}) — ${results.length} rows`);
  for (const r of updated) console.log(`  ✓ ${r.slug} — ${dryRun ? 'would update' : 'updated'}: ${r.changes.join(', ')}${r.notes.length ? ` (${r.notes.join('; ')})` : ''}`);
  for (const r of pending) console.log(`  … ${r.slug} — pending: ${r.notes.join('; ')} (paste real values to apply)`);
  for (const r of unchanged) console.log(`  · ${r.slug} — no change`);
  for (const r of skipped) console.log(`  ✗ ${r.slug || '(blank)'} — ERROR: ${r.errors.join('; ')}`);
  console.log(
    `\nSummary: ${updated.length} ${dryRun ? 'ready' : 'updated'}, ${pending.length} pending, ${unchanged.length} unchanged, ${skipped.length} error(s).`,
  );

  if (validate) {
    if (skipped.length > 0) {
      console.error(`\n❌ Validation FAILED — fix the ${skipped.length} error row(s) above, then re-run.`);
      process.exit(1);
    }
    console.log(`\n✅ Validation PASSED — safe to apply with:  npm run products:bulk${pending.length ? `   (${pending.length} row(s) still pending real data)` : ''}`);
  }
}

main()
  .catch((err) => { console.error('❌ Bulk update failed:', err); process.exit(1); })
  .finally(() => void prisma.$disconnect());
