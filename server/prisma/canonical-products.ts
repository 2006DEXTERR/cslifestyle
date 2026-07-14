/**
 * Canonical product data — the SINGLE SOURCE OF TRUTH for the fields the site owner
 * maintains by hand, loaded from `server/my-products.csv`.
 *
 * The CSV (columns: slug,name,amazonSearchUrl,asin,image,affiliateUrl) is where the
 * owner pastes the latest real values. Only these fields are canonical here:
 *   - name   → Product.title
 *   - asin   → Product.asin
 *   - image  → Product.image + gallery + ProductImage
 *   (affiliateUrl is intentionally derived from the ASIN at use-site, never stored raw;
 *    amazonSearchUrl is a human helper column and is ignored.)
 *
 * Every OTHER product field (price, description, specs, rating, flags, …) has NO
 * canonical value in this source and must be PRESERVED, never invented. Both the seed
 * and `scripts/sync-canonical-products.ts` import this so they can never drift.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isFakeAsin, isPlaceholderImage } from '../src/lib/affiliate';

export interface CanonicalProduct {
  slug: string;
  /** Product.title — omitted when the CSV cell is blank/placeholder. */
  name?: string;
  /** Real Amazon ASIN — omitted when blank/placeholder/fake. */
  asin?: string;
  /** Product image URL — omitted when blank/placeholder. */
  image?: string;
}

export const CANONICAL_CSV_PATH = join(__dirname, '..', 'my-products.csv');

/** Unfilled template placeholders count as "not provided" (never written). */
const PENDING_RE = /^(needs_|paste_|todo|tbd|<.*>$|xxx+)$/i;
const isPending = (v: string): boolean => v === '' || PENDING_RE.test(v.trim());

/** Minimal RFC-4180-ish CSV parser (quotes, escaped quotes, CRLF). */
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
    else if (c === '\r') { /* handled by \n */ }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function load(): Record<string, CanonicalProduct> {
  if (!existsSync(CANONICAL_CSV_PATH)) return {};
  const table = parseCsv(readFileSync(CANONICAL_CSV_PATH, 'utf8'));
  if (table.length < 2) return {};
  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (n: string) => header.indexOf(n);
  const iSlug = col('slug'), iName = col('name'), iAsin = col('asin'), iImage = col('image');

  const out: Record<string, CanonicalProduct> = {};
  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const at = (i: number) => (i >= 0 && i < cells.length ? cells[i].trim() : '');
    const slug = at(iSlug);
    if (!slug) continue;

    const nameRaw = at(iName);
    const asinRaw = at(iAsin);
    const imageRaw = at(iImage);

    const entry: CanonicalProduct = { slug };
    if (!isPending(nameRaw)) entry.name = nameRaw;
    // Only accept a REAL asin — never a fake/placeholder (would disable the affiliate link).
    if (!isPending(asinRaw) && !isFakeAsin(asinRaw.toUpperCase())) entry.asin = asinRaw.toUpperCase();
    if (!isPending(imageRaw) && !isPlaceholderImage(imageRaw)) entry.image = imageRaw;
    out[slug] = entry;
  }
  return out;
}

/** slug → canonical product fields (only fields with an explicit, valid value are present). */
export const CANONICAL_PRODUCTS: Record<string, CanonicalProduct> = load();
