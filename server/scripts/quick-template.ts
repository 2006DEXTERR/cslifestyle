/**
 * QUICK testing template — generate `my-products.csv` with a ready-made Amazon.in
 * SEARCH URL per product so you only need to click + copy two things per row.
 *
 * Columns: slug,name,amazonSearchUrl,asin,image,affiliateUrl
 *   - slug / name / amazonSearchUrl : prefilled (don't edit)
 *   - asin / image                  : the ONLY fields you fill (NEEDS_ → real value)
 *   - affiliateUrl                  : leave blank — generated from the ASIN on import
 *
 * Per row: open `amazonSearchUrl`, click the first product, copy the ASIN from the
 * URL (/dp/XXXXXXXXXX), right-click the main image → "Copy image address", and paste
 * both into the CSV. Unfilled (NEEDS_) rows are skipped safely on import.
 *
 *   npm run products:quick-template            # writes ./my-products.csv
 *   npm run products:quick-template -- --force # overwrite a file that has real data
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { isRealAsin, isPlaceholderImage } from '../src/lib/affiliate';

const prisma = new PrismaClient();
const OUT = 'my-products.csv';

/** RFC-4180 quote a cell when it contains a comma, quote or newline. */
function csv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Minimal CSV parse (quotes/escaped quotes/CRLF) — to detect existing real data. */
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

/** True if the existing CSV already holds at least one real ASIN or image. */
function hasRealData(file: string): boolean {
  const table = parseCsv(readFileSync(file, 'utf8'));
  if (table.length < 2) return false;
  const header = table[0].map((h) => h.trim().toLowerCase());
  const ai = header.indexOf('asin');
  const ii = header.indexOf('image');
  for (let r = 1; r < table.length; r++) {
    const asin = (ai >= 0 ? table[r][ai] ?? '' : '').trim();
    const image = (ii >= 0 ? table[r][ii] ?? '' : '').trim();
    if (isRealAsin(asin)) return true;
    if (image && !isPlaceholderImage(image)) return true;
  }
  return false;
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  if (existsSync(OUT) && !force && hasRealData(OUT)) {
    console.error(`${OUT} already contains real data. Re-run with --force to overwrite it:\n  npm run products:quick-template -- --force`);
    process.exit(2);
  }

  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
    select: { slug: true, title: true },
  });
  if (products.length === 0) {
    console.error('No products found. Run `npm run db:seed` first.');
    process.exit(2);
  }

  const lines = ['slug,name,amazonSearchUrl,asin,image,affiliateUrl'];
  for (const p of products) {
    const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(p.title)}`;
    // asin/image are the only fields to fill; affiliateUrl stays blank (auto-generated).
    lines.push([csv(p.slug), csv(p.title), csv(searchUrl), 'NEEDS_ASIN', 'NEEDS_IMAGE', ''].join(','));
  }
  writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');

  console.log(
    `✓ Wrote ${OUT} with ${products.length} products.\n\n` +
      `For each row (asin + image are the ONLY fields to fill):\n` +
      `  1. Open the amazonSearchUrl in a browser.\n` +
      `  2. Click the first product.\n` +
      `  3. Copy the ASIN from the URL (.../dp/XXXXXXXXXX).\n` +
      `  4. Right-click the main image → "Copy image address".\n` +
      `  5. Paste ASIN into "asin" and the image link into "image". Leave affiliateUrl blank.\n\n` +
      `Then:  npm run products:validate   &&   npm run products:bulk\n` +
      `(Unfilled NEEDS_ rows are skipped safely — fill as few or as many as you like.)`,
  );
}

main()
  .catch((err) => { console.error('❌ quick-template failed:', err); process.exit(1); })
  .finally(() => void prisma.$disconnect());
