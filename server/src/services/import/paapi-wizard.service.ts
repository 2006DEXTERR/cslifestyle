import type { DuplicateMode } from '@prisma/client';
import { ApiError } from '../../lib/http';
import { logger } from '../../lib/logger';
import {
  resolvePaapiConfig,
  searchKeyword,
  PaapiNotConfiguredError,
  type PaapiConfig,
  type ReviewRow,
} from './amazon-paapi';
import { createCsvJob } from './import.service';

/**
 * Amazon PA-API Import Wizard — DIRECT synchronous flow (no BullMQ/Redis worker).
 *
 * The HTTP request resolves the keywords against Amazon PA-API SearchItems in memory,
 * de-dupes by ASIN, builds product rows in memory, and hands them straight to the EXISTING
 * `createCsvJob()` importer — which creates the csv_product ImportJob, products/drafts,
 * history and progress exactly as a normal CSV import does. No queue, no disk/temp files.
 * The batch is capped small so the request stays bounded (~1.1s per keyword of PA-API pacing).
 */

export interface PaapiWizardCategory {
  category: string;
  keywords: string[];
  brand?: string;
}
export interface PaapiWizardInput {
  marketplace?: string;
  categories: PaapiWizardCategory[];
  productsPerKeyword?: number;
  duplicateMode?: DuplicateMode;
  dryRun?: boolean;
  name?: string;
}

/** Row surfaced in a dry-run preview (nothing imported). */
export interface WizardPreviewRow {
  category: string;
  keyword: string;
  asin: string;
  title: string;
  brand: string;
  image: string;
}

export type PaapiWizardResult =
  | { dryRun: true; resolved: number; rows: WizardPreviewRow[] }
  | { dryRun: false; importJobId: string; resolved: number; productRows: number };

// Direct/synchronous → keep the batch small so the request cannot run long. Each keyword is
// ONE PA-API call (SearchItems returns up to productsPerKeyword items in that single call).
const MAX_KEYWORDS = 20;
const PACE_MS = 1100; // PA-API TPS pacing between keyword searches
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function totalKeywords(input: PaapiWizardInput): number {
  return input.categories.reduce((n, c) => n + c.keywords.length, 0);
}

/** Resolve the PA-API config, honouring an optional per-run marketplace override. */
function resolveConfig(marketplace?: string): PaapiConfig {
  const res = resolvePaapiConfig();
  if (res.config === null) throw new PaapiNotConfiguredError(res.missing);
  if (marketplace && marketplace.trim() && marketplace.trim() !== res.config.marketplace) {
    const mp = marketplace.trim();
    return { ...res.config, marketplace: mp, host: `webservices.${mp.replace(/^www\./, '')}` };
  }
  return res.config;
}

/** CSV field escaping (RFC-4180). */
function csvField(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Build the product CSV STRING in memory (headers the existing importer already maps). */
function buildProductCsv(rows: WizardPreviewRow[]): string {
  const header = 'asin,title,brand,category,image';
  const body = rows.map((r) => [r.asin, r.title, r.brand, r.category, r.image].map(csvField).join(','));
  return [header, ...body].join('\n');
}

/**
 * Resolve the wizard input directly (synchronous). For a dry run, returns the resolved rows
 * for preview. Otherwise builds the in-memory product CSV and hands it to the EXISTING
 * createCsvJob() importer, returning the created csv_product ImportJob id.
 */
export async function runPaapiWizard(input: PaapiWizardInput, userId: string | null): Promise<PaapiWizardResult> {
  const cfg = resolveConfig(input.marketplace); // validates credentials up front (throws 400 if missing)
  const count = totalKeywords(input);
  if (count === 0) throw ApiError.badRequest('Provide at least one keyword');
  if (count > MAX_KEYWORDS) throw ApiError.badRequest(`Too many keywords (${count}); max ${MAX_KEYWORDS} per direct import`);
  const limit = Math.min(Math.max(input.productsPerKeyword ?? 1, 1), 10); // PA-API SearchItems hard cap is 10

  // Flatten to keyword tasks (carry category + optional brand).
  const tasks: { category: string; keyword: string; brand: string }[] = [];
  for (const c of input.categories) for (const k of c.keywords) tasks.push({ category: c.category, keyword: k, brand: c.brand ?? '' });

  const seen = new Set<string>(); // de-dupe products by ASIN across keywords
  const rows: WizardPreviewRow[] = [];
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    let results: ReviewRow[] = [];
    try {
      results = await searchKeyword(cfg, t.category, t.keyword, t.brand, limit);
    } catch (err) {
      logger.warn({ err, keyword: t.keyword }, 'PA-API wizard: keyword search failed');
    }
    for (const r of results) {
      if (!r.asin || r.selected === 'no_result' || r.selected === 'error') continue;
      if (seen.has(r.asin)) continue;
      seen.add(r.asin);
      rows.push({ category: t.category, keyword: t.keyword, asin: r.asin, title: r.title, brand: r.brand, image: r.image });
    }
    if (i < tasks.length - 1) await sleep(PACE_MS); // respect PA-API TPS
  }

  if (input.dryRun) {
    return { dryRun: true, resolved: rows.length, rows };
  }
  if (rows.length === 0) {
    throw ApiError.badRequest('PA-API returned no products for the given keywords');
  }

  // Hand the in-memory CSV straight to the EXISTING importer — creates the csv_product job.
  const csv = buildProductCsv(rows);
  const fileName = input.name?.trim() || `paapi-wizard-${rows.length}-products.csv`;
  const job = await createCsvJob({ fileName, csv, duplicateMode: input.duplicateMode, name: input.name, userId });
  const importJobId = String((job as { id?: string }).id ?? '');
  logger.info({ importJobId, productRows: rows.length }, 'PA-API wizard resolved → csv_product import created (direct)');
  return { dryRun: false, importJobId, resolved: rows.length, productRows: rows.length };
}
