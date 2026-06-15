import { Prisma, type DuplicateMode, type ImportJob, type ImportJobStatus, type ImportType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http';
import type { Pagination } from '../../lib/http';
import { csvToObjects } from '../../lib/csv';
import { dispatchImport } from '../../queues/importQueue';
import type { ProductRowInput } from './product-import';
import type { CategoryRowInput } from './category-import';

// ───────────────────────── Presenters ─────────────────────────

function presentJob(job: ImportJob): Record<string, unknown> {
  return {
    id: job.id,
    type: job.type,
    name: job.name,
    status: job.status,
    source: job.source,
    duplicateMode: job.duplicateMode,
    totalItems: job.totalItems,
    processedItems: job.processedItems,
    successCount: job.successCount,
    failedCount: job.failedCount,
    skippedCount: job.skippedCount,
    progress: job.totalItems ? Math.round((job.processedItems / job.totalItems) * 100) : 0,
    startedAt: job.startedAt ? job.startedAt.toISOString() : null,
    completedAt: job.completedAt ? job.completedAt.toISOString() : null,
    report: job.report ?? null,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
  };
}

// ───────────────────────── CSV header mapping ─────────────────────────

function mapProductRow(obj: Record<string, string>): ProductRowInput {
  const pick = (aliases: string[]): string => {
    for (const a of aliases) if (obj[a]) return obj[a];
    return '';
  };
  return {
    asin: pick(['asin', 'product id', 'productid']),
    title: pick(['title', 'name', 'product name', 'product']),
    brand: pick(['brand', 'manufacturer']),
    category: pick(['category', 'categories']),
    price: pick(['price', 'current price', 'currentprice', 'sale price']),
    originalPrice: pick(['originalprice', 'original price', 'mrp', 'list price']),
    rating: pick(['rating', 'stars']),
    reviewCount: pick(['reviewcount', 'review count', 'reviews', 'ratings count']),
    imageUrl: pick(['imageurl', 'image url', 'image', 'image_url']),
    description: pick(['description', 'desc']),
  };
}

// ───────────────────────── Job creation ─────────────────────────

interface BaseJobInput {
  name?: string;
  duplicateMode?: DuplicateMode;
  userId?: string | null;
}

async function createAndDispatch(
  type: ImportType,
  source: string,
  items: { externalId: string | null; rawData: Prisma.InputJsonValue | undefined }[],
  base: BaseJobInput,
): Promise<Record<string, unknown>> {
  if (items.length === 0) throw ApiError.badRequest('No valid items to import');

  const job = await prisma.importJob.create({
    data: {
      type,
      name: base.name ?? null,
      source,
      duplicateMode: base.duplicateMode ?? 'skip',
      totalItems: items.length,
      status: 'pending',
      createdById: base.userId ?? null,
      items: {
        create: items.map((it, i) => ({
          position: i,
          externalId: it.externalId,
          rawData: it.rawData,
          status: 'pending',
        })),
      },
    },
  });

  await dispatchImport(job.id, type);
  const fresh = await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } });
  return presentJob(fresh);
}

export async function createCsvJob(input: BaseJobInput & { fileName: string; csv: string }): Promise<Record<string, unknown>> {
  const { rows } = csvToObjects(input.csv);
  if (rows.length === 0) throw ApiError.badRequest('CSV has a header but no data rows');
  const items = rows.map((r) => {
    const mapped = mapProductRow(r);
    return { externalId: mapped.asin || null, rawData: mapped as unknown as Prisma.InputJsonValue };
  });
  return createAndDispatch('csv_product', input.fileName, items, input);
}

export async function createAsinJob(input: BaseJobInput & { asins: string[] }): Promise<Record<string, unknown>> {
  const seen = new Set<string>();
  const items = input.asins
    .map((a) => a.trim().toUpperCase())
    .filter((a) => a && !seen.has(a) && (seen.add(a), true))
    .map((a) => ({ externalId: a, rawData: undefined }));
  return createAndDispatch('asin', 'asin-list', items, input);
}

export async function createCategoryJob(
  input: BaseJobInput & { categories: CategoryRowInput[] },
): Promise<Record<string, unknown>> {
  const items = input.categories
    .filter((c) => (c.name ?? '').trim())
    .map((c) => ({ externalId: (c.name ?? '').trim(), rawData: c as unknown as Prisma.InputJsonValue }));
  return createAndDispatch('category', 'category-list', items, input);
}

// ───────────────────────── Queries ─────────────────────────

export interface JobsQuery {
  page: number;
  perPage: number;
  status?: ImportJobStatus | 'active';
  type?: ImportType;
}

export async function listJobs(q: JobsQuery): Promise<{ items: unknown[]; pagination: Pagination }> {
  const and: Prisma.ImportJobWhereInput[] = [];
  if (q.status === 'active') and.push({ status: { in: ['pending', 'processing'] } });
  else if (q.status) and.push({ status: q.status });
  if (q.type) and.push({ type: q.type });
  const where = and.length ? { AND: and } : {};

  const [rows, total] = await prisma.$transaction([
    prisma.importJob.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.perPage, take: q.perPage }),
    prisma.importJob.count({ where }),
  ]);
  return {
    items: rows.map(presentJob),
    pagination: { page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) },
  };
}

export async function getJob(id: string): Promise<Record<string, unknown>> {
  const job = await prisma.importJob.findUnique({
    where: { id },
    include: { items: { orderBy: { position: 'asc' }, take: 1000 } },
  });
  if (!job) throw ApiError.notFound('Import job not found');
  return {
    ...presentJob(job),
    items: job.items.map((it) => ({
      id: it.id,
      position: it.position,
      externalId: it.externalId,
      status: it.status,
      errors: it.errors ?? [],
      createdProductId: it.createdProductId,
      createdCategoryId: it.createdCategoryId,
    })),
  };
}

export async function getReport(id: string): Promise<unknown> {
  const job = await prisma.importJob.findUnique({ where: { id }, select: { report: true, status: true } });
  if (!job) throw ApiError.notFound('Import job not found');
  return job.report ?? { message: 'Report not available yet', status: job.status };
}

export async function getStats(): Promise<Record<string, unknown>> {
  const startOfToday = new Date(new Date().toISOString().slice(0, 10));
  const [activeJobs, completedJobs, failedJobs, queuedItems, todayAgg, totalsAgg] = await Promise.all([
    prisma.importJob.count({ where: { status: { in: ['pending', 'processing'] } } }),
    prisma.importJob.count({ where: { status: 'completed' } }),
    prisma.importJob.count({ where: { status: 'failed' } }),
    prisma.importItem.count({ where: { status: 'pending' } }),
    prisma.importJob.aggregate({ where: { completedAt: { gte: startOfToday } }, _sum: { successCount: true } }),
    prisma.importJob.aggregate({ _sum: { successCount: true, failedCount: true } }),
  ]);
  const s = totalsAgg._sum.successCount ?? 0;
  const f = totalsAgg._sum.failedCount ?? 0;
  return {
    activeJobs,
    completedJobs,
    failedJobs,
    queuedItems,
    todayImported: todayAgg._sum.successCount ?? 0,
    successRate: s + f > 0 ? Number(((s / (s + f)) * 100).toFixed(1)) : 100,
  };
}

export async function retryJob(id: string): Promise<Record<string, unknown>> {
  const job = await prisma.importJob.findUnique({ where: { id } });
  if (!job) throw ApiError.notFound('Import job not found');
  if (job.status === 'processing' || job.status === 'pending') {
    throw ApiError.badRequest('Job is already pending/processing');
  }
  await prisma.importItem.updateMany({ where: { jobId: id, status: 'failed' }, data: { status: 'pending', errors: [] } });
  await prisma.importJob.update({ where: { id }, data: { status: 'pending', error: null } });
  await dispatchImport(id, job.type);
  const fresh = await prisma.importJob.findUniqueOrThrow({ where: { id } });
  return presentJob(fresh);
}

export async function cancelJob(id: string): Promise<Record<string, unknown>> {
  const job = await prisma.importJob.findUnique({ where: { id } });
  if (!job) throw ApiError.notFound('Import job not found');
  if (job.status !== 'pending' && job.status !== 'processing') {
    throw ApiError.badRequest(`Cannot cancel a ${job.status} job`);
  }
  const updated = await prisma.importJob.update({ where: { id }, data: { status: 'cancelled', completedAt: new Date() } });
  return presentJob(updated);
}

// ───────────────────────── Templates ─────────────────────────

export async function listTemplates(): Promise<unknown[]> {
  const rows = await prisma.importTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    mappings: t.mappings,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function createTemplate(input: {
  name: string;
  type: ImportType;
  mappings: Prisma.InputJsonValue;
  userId?: string | null;
}): Promise<unknown> {
  const t = await prisma.importTemplate.create({
    data: { name: input.name, type: input.type, mappings: input.mappings, createdById: input.userId ?? null },
  });
  return { id: t.id, name: t.name, type: t.type, mappings: t.mappings, createdAt: t.createdAt.toISOString() };
}

export async function deleteTemplate(id: string): Promise<void> {
  const existing = await prisma.importTemplate.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Template not found');
  await prisma.importTemplate.delete({ where: { id } });
}
