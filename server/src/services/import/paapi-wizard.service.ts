import type { DuplicateMode } from '@prisma/client';
import { env } from '../../config/env';
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
import { getPaapiWizardQueue } from '../../queues/paapiWizardBullmq';

/**
 * Amazon PA-API Import Wizard (additive). The HTTP request only VALIDATES and ENQUEUES —
 * PA-API is never called in-request. A dedicated `paapi-wizard` BullMQ worker resolves the
 * keywords in memory (no CSV/temp files) and then hands the generated product rows to the
 * EXISTING `createCsvJob()`, so the normal csv_product ImportJob performs the actual import
 * (progress, retry, history, dedupe, drafts, AI generation, media, review/publish).
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

interface WizardJobData {
  input: PaapiWizardInput;
  userId: string | null;
}

/** Preview row surfaced to the admin during a dry run (no products created). */
export interface WizardPreviewRow {
  category: string;
  keyword: string;
  asin: string;
  title: string;
  brand: string;
  image: string;
}

const MAX_KEYWORDS = 200; // protects PA-API rate limits per wizard run
const PACE_MS = 1100; // matches the existing PA-API pacing between keyword searches
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

/**
 * Validate + enqueue a wizard run. Runs in the HTTP request — NO PA-API call here.
 * Requires the BullMQ queue driver (always-queued architecture); refuses under `inline`.
 */
export async function submitPaapiWizard(
  input: PaapiWizardInput,
  userId: string | null,
): Promise<{ resolveJobId: string; dryRun: boolean }> {
  if (env.QUEUE_DRIVER !== 'bullmq') {
    throw ApiError.badRequest(
      'The PA-API Import Wizard runs on the background queue. Set QUEUE_DRIVER=bullmq and start the worker (npm run worker) to use it.',
    );
  }
  resolveConfig(input.marketplace); // validates credentials up front (throws 400 if missing) — no network call
  const count = totalKeywords(input);
  if (count === 0) throw ApiError.badRequest('Provide at least one keyword');
  if (count > MAX_KEYWORDS) throw ApiError.badRequest(`Too many keywords (${count}); max ${MAX_KEYWORDS} per run`);

  const data: WizardJobData = { input, userId };
  const job = await getPaapiWizardQueue().add('resolve', data);
  logger.info({ jobId: job.id, dryRun: Boolean(input.dryRun), keywords: count }, 'PA-API wizard job enqueued');
  return { resolveJobId: String(job.id), dryRun: Boolean(input.dryRun) };
}

/** Read the live state of a wizard resolution job from BullMQ (no DB, no schema). */
export async function getPaapiWizardStatus(resolveJobId: string): Promise<Record<string, unknown>> {
  const job = await getPaapiWizardQueue().getJob(resolveJobId);
  if (!job) throw ApiError.notFound('Wizard job not found (it may have expired)');
  const state = await job.getState();
  const ret = job.returnvalue as
    | { dryRun: true; resolved: number; rows: WizardPreviewRow[] }
    | { dryRun: false; importJobId: string; resolved: number; productRows: number }
    | undefined;
  return {
    resolveJobId: String(job.id),
    state, // waiting | active | completed | failed | delayed | ...
    progress: typeof job.progress === 'number' ? job.progress : 0,
    result: ret ?? null,
    error: job.failedReason ?? null,
  };
}

/** CSV field escaping (RFC-4180) — wrap in quotes when the value has a comma/quote/newline. */
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
 * Worker entrypoint: resolve every keyword via PA-API in memory. For a dry run, return the
 * resolved rows for preview. Otherwise generate the product CSV in memory and hand it to the
 * EXISTING createCsvJob() — the returned csv_product ImportJob does the real import.
 */
export async function runPaapiWizardResolution(
  data: WizardJobData,
  onProgress: (pct: number) => void = () => undefined,
): Promise<
  | { dryRun: true; resolved: number; rows: WizardPreviewRow[] }
  | { dryRun: false; importJobId: string; resolved: number; productRows: number }
> {
  const { input, userId } = data;
  const cfg = resolveConfig(input.marketplace);
  const limit = Math.min(Math.max(input.productsPerKeyword ?? 1, 1), 10);

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
    onProgress(Math.round(((i + 1) / tasks.length) * 100));
    if (i < tasks.length - 1) await sleep(PACE_MS); // respect PA-API TPS
  }

  if (input.dryRun) {
    return { dryRun: true, resolved: rows.length, rows };
  }
  if (rows.length === 0) {
    throw new Error('PA-API returned no products for the given keywords');
  }

  // Hand the in-memory CSV to the EXISTING importer — this creates the real csv_product job.
  const csv = buildProductCsv(rows);
  const fileName = input.name?.trim() || `paapi-wizard-${rows.length}-products.csv`;
  const job = await createCsvJob({ fileName, csv, duplicateMode: input.duplicateMode, name: input.name, userId });
  const importJobId = String((job as { id?: string }).id ?? '');
  logger.info({ importJobId, productRows: rows.length }, 'PA-API wizard resolved → csv_product import created');
  return { dryRun: false, importJobId, resolved: rows.length, productRows: rows.length };
}
