import type { ImportItemStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { importProductRow, type ProductRowInput } from './product-import';
import { importAsinRow } from './asin-import';
import { importCategoryRow, type CategoryRowInput } from './category-import';
import { enqueueJobs } from '../ai/ai.service';
import { attachMediaByUrl } from '../media/media.service';

export interface ImportReport {
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
  total: number;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  errors: { externalId: string | null; errors: string[] }[];
}

/**
 * Process an ImportJob: run each item, persist per-row outcome, update progress +
 * counts, and write the final report. Used by both the inline driver and the
 * BullMQ workers (ADR-023). Re-running re-processes only failed/pending items (retry).
 */
export async function processImportJob(jobId: string, onProgress?: (pct: number) => void): Promise<void> {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: { items: { orderBy: { position: 'asc' } } },
  });
  if (!job || job.status === 'cancelled' || job.status === 'completed') return;

  const startedAt = job.startedAt ?? new Date();
  await prisma.importJob.update({ where: { id: jobId }, data: { status: 'processing', startedAt } });

  let success = 0;
  let failed = 0;
  let duplicate = 0;
  let processed = 0;
  const errorReport: { externalId: string | null; errors: string[] }[] = [];
  const total = job.items.length;
  const createdProductIds: string[] = []; // for AI auto-trigger (FR-006/050)

  for (const item of job.items) {
    // Retry: leave already-successful / duplicate items as-is.
    if (item.status === 'success' || item.status === 'duplicate') {
      processed++;
      if (item.status === 'success') success++;
      else duplicate++;
      continue;
    }

    let status: ImportItemStatus = 'failed';
    let productId: string | undefined;
    let categoryId: string | undefined;
    let errors: string[] = [];
    try {
      if (job.type === 'csv_product') {
        const r = await importProductRow((item.rawData ?? {}) as ProductRowInput, job.duplicateMode);
        ({ status, productId, errors } = r);
      } else if (job.type === 'asin') {
        const r = await importAsinRow(item.externalId ?? '', job.duplicateMode);
        ({ status, productId, errors } = r);
      } else {
        const r = await importCategoryRow((item.rawData ?? {}) as CategoryRowInput, job.duplicateMode);
        ({ status, categoryId, errors } = r);
      }
    } catch (err) {
      status = 'failed';
      errors = [err instanceof Error ? err.message : 'Unknown error'];
      logger.warn({ err, itemId: item.id }, 'import item failed');
    }

    await prisma.importItem.update({
      where: { id: item.id },
      data: {
        status,
        errors,
        createdProductId: productId ?? null,
        createdCategoryId: categoryId ?? null,
      },
    });

    processed++;
    if (status === 'success') success++;
    else if (status === 'duplicate') duplicate++;
    else failed++;
    if (status === 'success' && productId && (job.type === 'csv_product' || job.type === 'asin')) {
      createdProductIds.push(productId);
      // CSV imports may attach a Media Library asset by its /uploads URL (Phase 10).
      if (job.type === 'csv_product') {
        const imageUrl = (item.rawData as { imageUrl?: string } | null)?.imageUrl;
        await attachMediaByUrl(imageUrl, 'product', productId, 'image').catch(() => undefined);
      }
    }
    if (errors.length > 0 && status !== 'success') errorReport.push({ externalId: item.externalId, errors });

    if (processed % 10 === 0) {
      await prisma.importJob.update({
        where: { id: jobId },
        data: { processedItems: processed, successCount: success, failedCount: failed, skippedCount: duplicate },
      });
      onProgress?.(total ? Math.round((processed / total) * 100) : 100);
    }
  }

  const completedAt = new Date();
  const report: ImportReport = {
    imported: success,
    duplicates: duplicate,
    skipped: duplicate,
    failed,
    total,
    durationMs: completedAt.getTime() - startedAt.getTime(),
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    errors: errorReport.slice(0, 500),
  };
  const finalStatus = total > 0 && failed === total ? 'failed' : 'completed';

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: finalStatus,
      processedItems: processed,
      successCount: success,
      failedCount: failed,
      skippedCount: duplicate,
      completedAt,
      report: report as unknown as object,
    },
  });
  onProgress?.(100);

  // FR-006/FR-050: importing a product auto-triggers AI content generation. Best-effort —
  // a failure here must not fail the import (the products are already created).
  for (const productId of createdProductIds) {
    try {
      await enqueueJobs({ entityType: 'product', entityId: productId });
    } catch (err) {
      logger.warn({ err, productId }, 'AI auto-trigger enqueue failed (import still succeeded)');
    }
  }
}
