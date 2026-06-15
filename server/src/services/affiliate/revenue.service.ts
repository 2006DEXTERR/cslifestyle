import { Prisma, type RevenueSource } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http';
import type { Pagination } from '../../lib/http';
import { normalizeAsin } from '../../lib/affiliate';
import { parseCsv, parseNumber as toNumber } from '../../lib/csv';

export { parseCsv }; // re-exported for backwards-compatible imports

const DAY_MS = 86_400_000;

interface ParsedRow {
  date: Date;
  asin: string | null;
  category: string | null;
  actualRevenue: number;
  orders: number;
  clicks: number;
}

function findCol(headers: string[], names: string[]): number {
  for (const n of names) {
    const i = headers.indexOf(n);
    if (i >= 0) return i;
  }
  return -1;
}

export interface ImportInput {
  fileName: string;
  source: RevenueSource;
  csv: string;
  userId?: string | null;
}

export async function importRevenueCsv(input: ImportInput): Promise<{
  importId: string;
  rowCount: number;
  totalRevenue: number;
  skipped: number;
}> {
  const matrix = parseCsv(input.csv);
  if (matrix.length < 2) throw ApiError.badRequest('CSV must have a header row and at least one data row');

  const headers = matrix[0].map((h) => h.trim().toLowerCase());
  const di = findCol(headers, ['date', 'day', 'order date']);
  const ai = findCol(headers, ['asin', 'product id']);
  const ri = findCol(headers, ['revenue', 'earnings', 'ad_fees', 'ad fees', 'shipped revenue', 'commission']);
  const oi = findCol(headers, ['orders', 'items shipped', 'units', 'qty']);
  const ci = findCol(headers, ['clicks']);
  const cati = findCol(headers, ['category', 'product category']);
  if (di < 0 || ri < 0) {
    throw ApiError.badRequest('CSV must include a "date" and a "revenue" column', {
      columns: [`found headers: ${headers.join(', ')}`],
    });
  }

  const parsed: ParsedRow[] = [];
  let skipped = 0;
  for (const r of matrix.slice(1)) {
    const dRaw = (r[di] ?? '').trim();
    const date = new Date(dRaw);
    if (!dRaw || Number.isNaN(date.getTime())) {
      skipped++;
      continue;
    }
    parsed.push({
      date,
      asin: ai >= 0 && r[ai]?.trim() ? normalizeAsin(r[ai]) : null,
      category: cati >= 0 && r[cati]?.trim() ? r[cati].trim() : null,
      actualRevenue: toNumber(r[ri]),
      orders: oi >= 0 ? Math.round(toNumber(r[oi])) : 0,
      clicks: ci >= 0 ? Math.round(toNumber(r[ci])) : 0,
    });
  }
  if (parsed.length === 0) throw ApiError.badRequest('No valid data rows found in CSV');

  // Resolve productId by ASIN (batch).
  const asins = [...new Set(parsed.map((p) => p.asin).filter(Boolean) as string[])];
  const products = asins.length
    ? await prisma.product.findMany({ where: { asin: { in: asins } }, select: { id: true, asin: true } })
    : [];
  const productByAsin = new Map(products.map((p) => [p.asin, p.id]));

  const totalRevenue = parsed.reduce((s, p) => s + p.actualRevenue, 0);
  const dates = parsed.map((p) => p.date.getTime());
  const periodStart = new Date(Math.min(...dates));
  const periodEnd = new Date(Math.max(...dates));

  const importId = await prisma.$transaction(async (tx) => {
    const imp = await tx.revenueImport.create({
      data: {
        fileName: input.fileName,
        source: input.source,
        status: 'completed',
        rowCount: parsed.length,
        totalRevenue,
        periodStart,
        periodEnd,
        importedById: input.userId ?? null,
      },
    });
    await tx.revenueReport.createMany({
      data: parsed.map((p) => ({
        date: p.date,
        asin: p.asin,
        productId: p.asin ? (productByAsin.get(p.asin) ?? null) : null,
        category: p.category,
        actualRevenue: p.actualRevenue,
        orders: p.orders,
        clicks: p.clicks,
        source: input.source,
        importId: imp.id,
      })),
    });
    return imp.id;
  });

  return { importId, rowCount: parsed.length, totalRevenue, skipped };
}

export async function listImports(): Promise<unknown[]> {
  const rows = await prisma.revenueImport.findMany({
    include: { importedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    source: r.source,
    status: r.status,
    rowCount: r.rowCount,
    totalRevenue: Number(r.totalRevenue),
    periodStart: r.periodStart ? r.periodStart.toISOString().slice(0, 10) : null,
    periodEnd: r.periodEnd ? r.periodEnd.toISOString().slice(0, 10) : null,
    importedBy: r.importedBy?.name ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export interface ReportsQuery {
  page: number;
  perPage: number;
  source?: RevenueSource;
  days?: number;
}

export async function getReports(q: ReportsQuery): Promise<{ items: unknown[]; pagination: Pagination }> {
  const and: Prisma.RevenueReportWhereInput[] = [];
  if (q.source) and.push({ source: q.source });
  if (q.days) and.push({ date: { gte: new Date(Date.now() - q.days * DAY_MS) } });
  const where = and.length ? { AND: and } : {};

  const [rows, total] = await prisma.$transaction([
    prisma.revenueReport.findMany({
      where,
      include: { product: { select: { title: true, slug: true } } },
      orderBy: [{ date: 'desc' }],
      skip: (q.page - 1) * q.perPage,
      take: q.perPage,
    }),
    prisma.revenueReport.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      asin: r.asin,
      productTitle: r.product?.title ?? null,
      category: r.category,
      actualRevenue: Number(r.actualRevenue),
      estimatedRevenue: r.estimatedRevenue != null ? Number(r.estimatedRevenue) : null,
      orders: r.orders,
      clicks: r.clicks,
      source: r.source,
    })),
    pagination: {
      page: q.page,
      perPage: q.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.perPage)),
    },
  };
}

export async function getSummary(days = 30): Promise<{
  days: number;
  totalRevenue: number;
  totalOrders: number;
  totalClicks: number;
  bySource: Record<string, number>;
  topCategories: { category: string; revenue: number }[];
}> {
  const since = new Date(Date.now() - days * DAY_MS);
  const rows = await prisma.revenueReport.findMany({
    where: { date: { gte: since } },
    select: { actualRevenue: true, orders: true, clicks: true, source: true, category: true },
  });

  const bySource: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalClicks = 0;
  for (const r of rows) {
    const rev = Number(r.actualRevenue);
    totalRevenue += rev;
    totalOrders += r.orders;
    totalClicks += r.clicks;
    bySource[r.source] = (bySource[r.source] ?? 0) + rev;
    if (r.category) byCategory[r.category] = (byCategory[r.category] ?? 0) + rev;
  }

  const topCategories = Object.entries(byCategory)
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return { days, totalRevenue, totalOrders, totalClicks, bySource, topCategories };
}
