import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http';
import { logger } from '../../lib/logger';
import {
  getPaapiReadiness,
  resolvePaapiConfig,
  fetchAmazonReview,
  PaapiNotConfiguredError,
  type PaapiReadiness,
  type FetchReviewResult,
} from './amazon-paapi';

/**
 * Admin "Import through API" service. Wraps the shared PA-API implementation so the
 * admin Import Center can check provider readiness, start a review fetch, and view
 * recent import history — without ever scraping, exposing secrets, or publishing
 * products directly. Fetched results land in the existing review CSV; an admin still
 * reviews + applies them through the unchanged manual workflow before anything goes live.
 */

/** Provider readiness for the UI — never includes secret values. */
export function getApiImportConfig(): PaapiReadiness {
  return getPaapiReadiness();
}

export interface ApiImportStartResult extends FetchReviewResult {
  provider: 'amazon-paapi';
  message: string;
}

/**
 * Start an API import (PA-API SearchItems → review CSV). Fails clearly when credentials
 * are missing — never starts a job, never fakes success. Does NOT publish products.
 */
export async function startApiImport(): Promise<ApiImportStartResult> {
  const resolved = resolvePaapiConfig();
  if (!resolved.config) {
    // Clear, non-secret error — do not start the job.
    throw new ApiError(400, 'Amazon PA-API credentials are not configured.', { credentials: resolved.missing });
  }

  try {
    // Logs go through the server logger (PA-API never logs secrets — only keyword/ASIN progress).
    const result = await fetchAmazonReview({ log: (m) => logger.info({ scope: 'paapi-import' }, m.trim()) });
    return {
      provider: 'amazon-paapi',
      ...result,
      message: `Fetched ${result.rows} row(s) into ${result.reviewFile}. Review and apply before publishing.`,
    };
  } catch (err) {
    if (err instanceof PaapiNotConfiguredError) {
      throw new ApiError(400, err.message, { credentials: err.missing });
    }
    if (err instanceof ApiError) throw err;
    // Surface a clear, non-secret failure (e.g. missing keyword CSV / network error).
    throw new ApiError(502, `API import failed: ${(err as Error).message}`);
  }
}

export interface ApiImportHistoryRow {
  id: string;
  type: string;
  status: string;
  source: string;
  totalItems: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Recent import history. There is no API-specific job model, so this returns the
 * existing Import Center jobs (most recent first) — the same history the admin sees.
 */
export async function getApiImportHistory(limit = 10): Promise<ApiImportHistoryRow[]> {
  const jobs = await prisma.importJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 50),
    select: {
      id: true,
      type: true,
      status: true,
      source: true,
      totalItems: true,
      successCount: true,
      failedCount: true,
      createdAt: true,
      completedAt: true,
    },
  });
  return jobs.map((j) => ({
    id: j.id,
    type: j.type,
    status: j.status,
    source: j.source,
    totalItems: j.totalItems,
    successCount: j.successCount,
    failedCount: j.failedCount,
    createdAt: j.createdAt.toISOString(),
    completedAt: j.completedAt?.toISOString() ?? null,
  }));
}
