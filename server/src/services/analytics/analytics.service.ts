import { Prisma, type AnalyticsEventType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError, type Pagination } from '../../lib/http';
import { env } from '../../config/env';

/**
 * First-party analytics engine (spec §13). Aggregates over the existing event sources
 * (AffiliateClick / AiLog / SearchQuery / ImportJob / RevenueReport) plus the new
 * view tables (PageView / ProductView / AnalyticsEvent). All reads; no external calls.
 */

export type RangeKey = 'today' | 'last7days' | 'last30days' | 'thisMonth';

export function rangeToSince(range: RangeKey = 'last7days'): Date {
  const now = new Date();
  if (range === 'today') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (range === 'thisMonth') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const days = range === 'last30days' ? 30 : 7;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

const dayKey = (d: Date): string => d.toISOString().slice(0, 10);
const num = (v: Prisma.Decimal | number | null | undefined): number => (v == null ? 0 : Number(v));

/** Classify a referrer into a coarse traffic source (no external lookups). */
function classifySource(referrer: string | null | undefined): string {
  if (!referrer) return 'Direct';
  const r = referrer.toLowerCase();
  if (r.includes('google')) return 'Google';
  if (r.includes('bing')) return 'Bing';
  if (r.includes('duckduckgo') || r.includes('yahoo')) return 'Other Search';
  return 'Referral';
}

// ───────────────────────── Dashboard (FR-057/062) ─────────────────────────

export async function getDashboard(range: RangeKey = 'last7days'): Promise<Record<string, unknown>> {
  const since = rangeToSince(range);
  const where = { createdAt: { gte: since } };

  const [
    pageViews, productViews, guideViews, comparisonViews,
    affiliateClicks, searchCount, importCount,
    revenueAgg, aiAgg, pvRows, realtimeRows,
  ] = await Promise.all([
    prisma.pageView.count({ where }),
    prisma.analyticsEvent.count({ where: { ...where, eventType: 'product_view' } }),
    prisma.analyticsEvent.count({ where: { ...where, eventType: 'guide_view' } }),
    prisma.analyticsEvent.count({ where: { ...where, eventType: 'comparison_view' } }),
    prisma.affiliateClick.count({ where: { clickedAt: { gte: since } } }),
    prisma.searchQuery.count({ where }),
    prisma.importJob.count({ where }),
    prisma.revenueReport.aggregate({ where: { date: { gte: since } }, _sum: { actualRevenue: true, estimatedRevenue: true } }),
    prisma.aiLog.aggregate({ where, _sum: { costUsd: true } }),
    prisma.pageView.findMany({
      where,
      select: { sessionId: true, device: true, country: true, url: true, referrer: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 50000,
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
      select: { sessionId: true, createdAt: true },
      take: 5000,
    }),
  ]);

  // One pass over page views → sessions/users/bounce/traffic/devices/geo/top-pages.
  const sessions = new Set<string>();
  const users = new Set<string>();
  const perSession = new Map<string, number>();
  const daily = new Map<string, { pageViews: number; sessions: Set<string> }>();
  const devices = new Map<string, number>();
  const geo = new Map<string, number>();
  const pages = new Map<string, number>();
  const sources = new Map<string, number>();
  for (const r of pvRows) {
    const sid = r.sessionId ?? 'anon';
    sessions.add(sid);
    users.add(sid);
    perSession.set(sid, (perSession.get(sid) ?? 0) + 1);
    const d = dayKey(r.createdAt);
    const bucket = daily.get(d) ?? { pageViews: 0, sessions: new Set<string>() };
    bucket.pageViews++;
    bucket.sessions.add(sid);
    daily.set(d, bucket);
    if (r.device) devices.set(r.device, (devices.get(r.device) ?? 0) + 1);
    if (r.country) geo.set(r.country, (geo.get(r.country) ?? 0) + 1);
    if (r.url) pages.set(r.url, (pages.get(r.url) ?? 0) + 1);
    sources.set(classifySource(r.referrer), (sources.get(classifySource(r.referrer)) ?? 0) + 1);
  }
  const bounced = [...perSession.values()].filter((n) => n === 1).length;
  const bounceRate = sessions.size > 0 ? Number(((bounced / sessions.size) * 100).toFixed(1)) : 0;

  // Real intra-period momentum (second half vs first half of the daily series) for the
  // existing card trend chips — no fabricated percentages.
  const series = [...daily.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
  const pctDelta = (pick: (v: { pageViews: number; sessions: Set<string> }) => number): number => {
    if (series.length < 2) return 0;
    const mid = Math.floor(series.length / 2);
    const first = series.slice(0, mid).reduce((s, v) => s + pick(v), 0);
    const second = series.slice(mid).reduce((s, v) => s + pick(v), 0);
    if (first === 0) return second > 0 ? 100 : 0;
    return Number((((second - first) / first) * 100).toFixed(1));
  };
  const deltas = {
    pageViews: pctDelta((v) => v.pageViews),
    sessions: pctDelta((v) => v.sessions.size),
    users: pctDelta((v) => v.sessions.size),
  };

  const realtimeSessions = new Set(realtimeRows.map((r) => r.sessionId ?? 'anon'));
  const realtimeSeries = new Map<string, Set<string>>();
  for (const r of realtimeRows) {
    const m = r.createdAt.toISOString().slice(11, 16);
    (realtimeSeries.get(m) ?? realtimeSeries.set(m, new Set()).get(m)!).add(r.sessionId ?? 'anon');
  }

  return {
    cards: {
      pageViews,
      productViews,
      guideViews,
      comparisonViews,
      affiliateClicks,
      revenue: num(revenueAgg._sum.actualRevenue),
      aiCost: Number(num(aiAgg._sum.costUsd).toFixed(2)),
      searchCount,
      importCount,
      sessions: sessions.size,
      users: users.size,
      bounceRate,
    },
    deltas,
    traffic: [...daily.entries()].map(([date, v]) => ({ date, pageViews: v.pageViews, sessions: v.sessions.size, users: v.sessions.size })),
    devices: [...devices.entries()].map(([name, value]) => ({ name, value })),
    geographic: [...geo.entries()].map(([country, sessions]) => ({ country, sessions })).sort((a, b) => b.sessions - a.sessions).slice(0, 10),
    topPages: [...pages.entries()].map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views).slice(0, 10),
    trafficSources: [...sources.entries()].map(([source, sessions]) => ({ source, sessions })).sort((a, b) => b.sessions - a.sessions),
    realtime: {
      activeUsers: realtimeSessions.size,
      series: [...realtimeSeries.entries()].map(([time, s]) => ({ time, activeUsers: s.size })),
    },
  };
}

// ───────────────────────── Product analytics (FR-057) ─────────────────────────

export async function getProductAnalytics(range: RangeKey = 'last30days', limit = 10): Promise<Record<string, unknown>> {
  const since = rangeToSince(range);
  const trendingSince = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const [viewed, clicked, revenue, trending] = await Promise.all([
    prisma.productView.groupBy({ by: ['productId'], where: { createdAt: { gte: since } }, _count: { productId: true }, orderBy: { _count: { productId: 'desc' } }, take: limit }),
    prisma.affiliateClick.groupBy({ by: ['productId'], where: { clickedAt: { gte: since }, productId: { not: null } }, _count: { productId: true }, orderBy: { _count: { productId: 'desc' } }, take: limit }),
    prisma.revenueReport.groupBy({ by: ['productId'], where: { date: { gte: since }, productId: { not: null } }, _sum: { actualRevenue: true }, orderBy: { _sum: { actualRevenue: 'desc' } }, take: limit }),
    prisma.productView.groupBy({ by: ['productId'], where: { createdAt: { gte: trendingSince } }, _count: { productId: true }, orderBy: { _count: { productId: 'desc' } }, take: limit }),
  ]);

  const ids = [...new Set([...viewed, ...clicked, ...revenue, ...trending].map((r) => r.productId).filter((x): x is string => Boolean(x)))];
  const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, slug: true } });
  const name = new Map(products.map((p) => [p.id, p]));
  const label = (id: string | null): { id: string; title: string; slug: string } | null =>
    id && name.has(id) ? { id, title: name.get(id)!.title, slug: name.get(id)!.slug } : null;

  return {
    mostViewed: viewed.map((r) => ({ product: label(r.productId), views: r._count.productId })).filter((r) => r.product),
    mostClicked: clicked.map((r) => ({ product: label(r.productId), clicks: r._count.productId })).filter((r) => r.product),
    highestRevenue: revenue.map((r) => ({ product: label(r.productId), revenue: num(r._sum.actualRevenue) })).filter((r) => r.product),
    trending: trending.map((r) => ({ product: label(r.productId), views: r._count.productId })).filter((r) => r.product),
  };
}

// ───────────────────────── Search analytics (FR-058) ─────────────────────────

export async function getSearchAnalytics(range: RangeKey = 'last30days', limit = 15): Promise<Record<string, unknown>> {
  const since = rangeToSince(range);
  const [top, zero, rows] = await Promise.all([
    prisma.searchQuery.groupBy({ by: ['query'], where: { createdAt: { gte: since } }, _count: { query: true }, _avg: { resultsCount: true }, orderBy: { _count: { query: 'desc' } }, take: limit }),
    prisma.searchQuery.groupBy({ by: ['query'], where: { createdAt: { gte: since }, resultsCount: 0 }, _count: { query: true }, orderBy: { _count: { query: 'desc' } }, take: limit }),
    prisma.searchQuery.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true }, take: 50000 }),
  ]);
  const daily = new Map<string, number>();
  for (const r of rows) daily.set(dayKey(r.createdAt), (daily.get(dayKey(r.createdAt)) ?? 0) + 1);
  return {
    topSearches: top.map((r) => ({ query: r.query, count: r._count.query, avgResults: Math.round(r._avg.resultsCount ?? 0) })),
    zeroResultSearches: zero.map((r) => ({ query: r.query, count: r._count.query })),
    trends: [...daily.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    total: rows.length,
  };
}

// ───────────────────────── Revenue analytics (FR-059, §13.4) ─────────────────────────

export async function getRevenueAnalytics(range: RangeKey = 'last30days'): Promise<Record<string, unknown>> {
  const since = rangeToSince(range);
  const [rows, byCat, clicks] = await Promise.all([
    prisma.revenueReport.findMany({ where: { date: { gte: since } }, select: { date: true, actualRevenue: true, estimatedRevenue: true, productId: true }, take: 50000 }),
    prisma.revenueReport.groupBy({ by: ['category'], where: { date: { gte: since } }, _sum: { actualRevenue: true }, orderBy: { _sum: { actualRevenue: 'desc' } }, take: 15 }),
    prisma.affiliateClick.count({ where: { clickedAt: { gte: since } } }),
  ]);

  const daily = new Map<string, number>();
  const weekly = new Map<string, number>();
  const monthly = new Map<string, number>();
  let total = 0;
  const productIds = new Set<string>();
  for (const r of rows) {
    const v = num(r.actualRevenue);
    total += v;
    const d = r.date;
    daily.set(dayKey(d), (daily.get(dayKey(d)) ?? 0) + v);
    const week = `${d.getUTCFullYear()}-W${String(Math.ceil(((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7)).padStart(2, '0')}`;
    weekly.set(week, (weekly.get(week) ?? 0) + v);
    monthly.set(d.toISOString().slice(0, 7), (monthly.get(d.toISOString().slice(0, 7)) ?? 0) + v);
    if (r.productId) productIds.add(r.productId);
  }

  // Revenue by brand (join productId → brand).
  const byBrand = new Map<string, number>();
  if (productIds.size > 0) {
    const prods = await prisma.product.findMany({ where: { id: { in: [...productIds] } }, select: { id: true, brand: { select: { name: true } } } });
    const brandOf = new Map(prods.map((p) => [p.id, p.brand?.name ?? 'Unbranded']));
    for (const r of rows) if (r.productId) byBrand.set(brandOf.get(r.productId) ?? 'Unbranded', (byBrand.get(brandOf.get(r.productId) ?? 'Unbranded') ?? 0) + num(r.actualRevenue));
  }

  const estimated = Number((clicks * env.REVENUE_DEFAULT_CVR * env.REVENUE_DEFAULT_COMMISSION * 100).toFixed(2)); // illustrative ₹ estimate
  return {
    total: Number(total.toFixed(2)),
    estimated,
    estimateInputs: { clicks, cvr: env.REVENUE_DEFAULT_CVR, commission: env.REVENUE_DEFAULT_COMMISSION },
    daily: [...daily.entries()].map(([date, revenue]) => ({ date, revenue: Number(revenue.toFixed(2)) })).sort((a, b) => a.date.localeCompare(b.date)),
    weekly: [...weekly.entries()].map(([week, revenue]) => ({ week, revenue: Number(revenue.toFixed(2)) })).sort((a, b) => a.week.localeCompare(b.week)),
    monthly: [...monthly.entries()].map(([month, revenue]) => ({ month, revenue: Number(revenue.toFixed(2)) })).sort((a, b) => a.month.localeCompare(b.month)),
    byCategory: byCat.map((r) => ({ category: r.category ?? 'Uncategorised', revenue: num(r._sum.actualRevenue) })),
    byBrand: [...byBrand.entries()].map(([brand, revenue]) => ({ brand, revenue: Number(revenue.toFixed(2)) })).sort((a, b) => b.revenue - a.revenue).slice(0, 15),
  };
}

// ───────────────────────── AI analytics (FR-064, reuses AiLog) ─────────────────────────

export async function getAiAnalytics(range: RangeKey = 'last30days'): Promise<Record<string, unknown>> {
  const since = rangeToSince(range);
  const where = { createdAt: { gte: since } };
  const [agg, byProvider, byModel, generationCount, failedJobs, rows] = await Promise.all([
    prisma.aiLog.aggregate({ where, _sum: { tokensInput: true, tokensOutput: true, costUsd: true } }),
    prisma.aiLog.groupBy({ by: ['provider'], where, _sum: { tokensInput: true, tokensOutput: true, costUsd: true }, _count: { id: true } }),
    prisma.aiLog.groupBy({ by: ['modelUsed'], where, _sum: { costUsd: true }, _count: { id: true } }),
    prisma.aiLog.count({ where }),
    prisma.aiLog.count({ where: { ...where, status: 'failed' } }),
    prisma.aiLog.findMany({ where, select: { createdAt: true, tokensInput: true, tokensOutput: true, costUsd: true }, take: 50000 }),
  ]);
  const daily = new Map<string, { tokens: number; cost: number }>();
  for (const r of rows) {
    const k = dayKey(r.createdAt);
    const b = daily.get(k) ?? { tokens: 0, cost: 0 };
    b.tokens += (r.tokensInput ?? 0) + (r.tokensOutput ?? 0);
    b.cost += num(r.costUsd);
    daily.set(k, b);
  }
  return {
    tokens: (agg._sum.tokensInput ?? 0) + (agg._sum.tokensOutput ?? 0),
    cost: Number(num(agg._sum.costUsd).toFixed(2)),
    generationCount,
    failedJobs,
    byProvider: byProvider.map((r) => ({ provider: r.provider ?? 'unknown', tokens: (r._sum.tokensInput ?? 0) + (r._sum.tokensOutput ?? 0), cost: Number(num(r._sum.costUsd).toFixed(2)), count: r._count.id })),
    byModel: byModel.map((r) => ({ model: r.modelUsed ?? 'unknown', cost: Number(num(r._sum.costUsd).toFixed(2)), count: r._count.id })),
    daily: [...daily.entries()].map(([date, v]) => ({ date, tokens: v.tokens, cost: Number(v.cost.toFixed(2)) })).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// ───────────────────────── Content analytics (FR-065) ─────────────────────────

async function topByView(eventType: AnalyticsEventType, since: Date, limit: number): Promise<{ entityId: string; views: number }[]> {
  const rows = await prisma.analyticsEvent.groupBy({
    by: ['entityId'],
    where: { eventType, createdAt: { gte: since }, entityId: { not: null } },
    _count: { entityId: true },
    orderBy: { _count: { entityId: 'desc' } },
    take: limit,
  });
  return rows.map((r) => ({ entityId: r.entityId as string, views: r._count.entityId }));
}

export async function getContentAnalytics(range: RangeKey = 'last30days', limit = 10): Promise<Record<string, unknown>> {
  const since = rangeToSince(range);
  const [guides, comparisons, authors, categories, brands] = await Promise.all([
    topByView('guide_view', since, limit),
    topByView('comparison_view', since, limit),
    topByView('author_view', since, limit),
    topByView('category_view', since, limit),
    topByView('brand_view', since, limit),
  ]);

  const [gNames, cNames, aNames, catNames, bNames] = await Promise.all([
    prisma.guide.findMany({ where: { id: { in: guides.map((g) => g.entityId) } }, select: { id: true, title: true, slug: true } }),
    prisma.comparison.findMany({ where: { id: { in: comparisons.map((g) => g.entityId) } }, select: { id: true, title: true, slug: true } }),
    prisma.author.findMany({ where: { id: { in: authors.map((g) => g.entityId) } }, select: { id: true, name: true, slug: true } }),
    prisma.category.findMany({ where: { id: { in: categories.map((g) => g.entityId) } }, select: { id: true, name: true, slug: true } }),
    prisma.brand.findMany({ where: { id: { in: brands.map((g) => g.entityId) } }, select: { id: true, name: true, slug: true } }),
  ]);
  const join = <T extends { id: string }>(rows: { entityId: string; views: number }[], named: T[], pick: (t: T) => Record<string, unknown>) => {
    const map = new Map(named.map((n) => [n.id, n]));
    return rows.filter((r) => map.has(r.entityId)).map((r) => ({ ...pick(map.get(r.entityId)!), views: r.views }));
  };
  return {
    topGuides: join(guides, gNames, (g) => ({ id: g.id, title: g.title, slug: g.slug })),
    topComparisons: join(comparisons, cNames, (c) => ({ id: c.id, title: c.title, slug: c.slug })),
    topAuthors: join(authors, aNames, (a) => ({ id: a.id, name: a.name, slug: a.slug })),
    topCategories: join(categories, catNames, (c) => ({ id: c.id, name: c.name, slug: c.slug })),
    topBrands: join(brands, bNames, (b) => ({ id: b.id, name: b.name, slug: b.slug })),
  };
}

// ───────────────────────── Events list (FR-066) ─────────────────────────

export interface EventsQuery {
  page: number;
  perPage: number;
  eventType?: AnalyticsEventType;
  entityType?: string;
}

export async function listEvents(q: EventsQuery): Promise<{ items: unknown[]; pagination: Pagination }> {
  const where: Prisma.AnalyticsEventWhereInput = {};
  if (q.eventType) where.eventType = q.eventType;
  if (q.entityType) where.entityType = q.entityType;
  const [rows, total] = await prisma.$transaction([
    prisma.analyticsEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.perPage, take: q.perPage }),
    prisma.analyticsEvent.count({ where }),
  ]);
  return {
    items: rows.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      entityType: e.entityType,
      entityId: e.entityId,
      sessionId: e.sessionId,
      device: e.device,
      country: e.country,
      createdAt: e.createdAt.toISOString(),
    })),
    pagination: { page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) },
  };
}

// ───────────────────────── Report snapshots (FR-066) ─────────────────────────

export interface ReportsQuery {
  page: number;
  perPage: number;
  type?: string;
}

export async function listReports(q: ReportsQuery): Promise<{ items: unknown[]; pagination: Pagination }> {
  const where: Prisma.ReportSnapshotWhereInput = q.type ? { type: q.type } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.reportSnapshot.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.perPage, take: q.perPage }),
    prisma.reportSnapshot.count({ where }),
  ]);
  return {
    items: rows.map((r) => ({ id: r.id, type: r.type, periodStart: r.periodStart?.toISOString() ?? null, periodEnd: r.periodEnd?.toISOString() ?? null, payload: r.payload, createdAt: r.createdAt.toISOString() })),
    pagination: { page: q.page, perPage: q.perPage, total, totalPages: Math.max(1, Math.ceil(total / q.perPage)) },
  };
}

export async function getReport(id: string): Promise<Record<string, unknown>> {
  const r = await prisma.reportSnapshot.findUnique({ where: { id } });
  if (!r) throw ApiError.notFound('Report not found');
  return { id: r.id, type: r.type, periodStart: r.periodStart?.toISOString() ?? null, periodEnd: r.periodEnd?.toISOString() ?? null, payload: r.payload, createdAt: r.createdAt.toISOString() };
}

/** Build + persist a report snapshot (also used by the daily worker). */
export async function generateReport(type: string, range: RangeKey, userId?: string | null): Promise<Record<string, unknown>> {
  const [dashboard, products, search, revenue, ai, content] = await Promise.all([
    getDashboard(range),
    getProductAnalytics(range),
    getSearchAnalytics(range),
    getRevenueAnalytics(range),
    getAiAnalytics(range),
    getContentAnalytics(range),
  ]);
  const payload = { range, dashboard, products, search, revenue, ai, content, generatedAt: new Date().toISOString() };
  const snap = await prisma.reportSnapshot.create({
    data: { type, payload: payload as unknown as Prisma.InputJsonValue, periodStart: rangeToSince(range), periodEnd: new Date(), createdById: userId ?? null },
  });
  return { id: snap.id, type: snap.type, payload, createdAt: snap.createdAt.toISOString() };
}

export async function deleteReport(id: string): Promise<void> {
  const existing = await prisma.reportSnapshot.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Report not found');
  await prisma.reportSnapshot.delete({ where: { id } });
}

/** Cleanup worker: prune raw page views / events beyond the retention window. */
export async function pruneRawAnalytics(): Promise<{ pageViews: number; events: number }> {
  const cutoff = new Date(Date.now() - env.ANALYTICS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const [pv, ev] = await prisma.$transaction([
    prisma.pageView.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);
  return { pageViews: pv.count, events: ev.count };
}
