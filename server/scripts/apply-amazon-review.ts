/**
 * Convert the reviewed PA-API results into the existing product-import CSV format.
 * Reads ONLY rows you marked `selected=true`. Writes a SEPARATE file so it can
 * never clobber a hand-edited my-products.csv. Does NOT touch the DB and does NOT
 * run the bulk import — you review the generated CSV, then import it yourself.
 *
 *   npm run products:apply-amazon-review
 *
 * Output: server/my-products.generated.csv  (header: slug,name,asin,image,affiliateUrl)
 *   slug = slugify(title) (same rule as the app). affiliateUrl is left blank — it is
 *   generated from the ASIN by the import step.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { slugify } from '../src/lib/slug';

const INPUT = 'amazon-products.review.csv';
const OUTPUT = 'my-products.generated.csv';

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

function main(): void {
  if (!existsSync(INPUT)) {
    console.error(`Missing ${INPUT}. Run \`npm run products:fetch-amazon\` first.`);
    process.exit(2);
  }
  const table = parseCsv(readFileSync(INPUT, 'utf8'));
  if (table.length < 2) { console.error(`${INPUT} has no data rows.`); process.exit(2); }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (n: string) => header.indexOf(n);
  const idx = { asin: col('asin'), title: col('title'), image: col('image'), selected: col('selected') };
  if (idx.asin < 0 || idx.title < 0 || idx.selected < 0) {
    console.error('Review CSV must have asin, title and selected columns.');
    process.exit(2);
  }

  const lines: string[] = ['slug,name,asin,image,affiliateUrl'];
  const seenSlugs = new Set<string>();
  let applied = 0, skipped = 0;

  for (let r = 1; r < table.length; r++) {
    const cell = (i: number) => (i >= 0 ? (table[r][i] ?? '').trim() : '');
    if (cell(idx.selected).toLowerCase() !== 'true') { skipped++; continue; }

    const asin = cell(idx.asin);
    const title = cell(idx.title);
    const image = cell(idx.image);
    if (!asin || !title) { skipped++; console.log(`  · row ${r}: selected but missing asin/title — skipped`); continue; }

    let slug = slugify(title) || `product-${asin.toLowerCase()}`;
    if (seenSlugs.has(slug)) slug = `${slug}-${asin.toLowerCase()}`; // de-dupe within this file
    seenSlugs.add(slug);

    // affiliateUrl intentionally blank — generated from the ASIN on import.
    lines.push([csvCell(slug), csvCell(title), csvCell(asin), csvCell(image), ''].join(','));
    applied++;
  }

  writeFileSync(OUTPUT, lines.join('\n') + '\n', 'utf8');
  console.log(
    `✓ Wrote ${OUTPUT} — ${applied} selected row(s) applied, ${skipped} skipped.\n` +
      `Next:\n` +
      `  npm run products:validate -- ${OUTPUT}\n` +
      `  npm run products:bulk -- ${OUTPUT}        # NOTE: bulk UPDATES existing products by slug only.\n` +
      `  (New products must be CREATED via the admin Import Center — see docs.)`,
  );
}

main();
