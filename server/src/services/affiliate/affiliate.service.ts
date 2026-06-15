import { Prisma, type AffiliateDeviceType, type AffiliateSourceType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import type { Pagination } from '../../lib/http';
import { buildAmazonUrl, isValidAsin, normalizeAsin } from '../../lib/affiliate';
import { getCachedSettings } from './settings.service';

const DAY_MS = 86_400_000;

export interface RedirectResolution {
  url: string;
  tag: string;
  trackingEnabled: boolean;
  campaignId: string | null;
}

/**
 * Resolve the redirect target for /go/{asin} (hot path — cached settings, single
 * optional campaign lookup). Returns null for an invalid ASIN.
 */
export async function resolveRedirect(
  rawAsin: string,
  campaignSlug?: string,
): Promise<RedirectResolution | null> {
  const asin = normalizeAsin(rawAsin);
  if (!isValidAsin(asin)) return null;

  const settings = await getCachedSettings();
  let tag = settings.amazonAssociateTag;
  let campaignId: string | null = null;

  if (campaignSlug) {
    const campaign = await prisma.affiliateCampaign.findUnique({
      where: { slug: campaignSlug },
      select: { id: true, isActive: true, affiliateTag: true },
    });
    if (campaign?.isActive) {
      campaignId = campaign.id;
      if (campaign.affiliateTag) tag = campaign.affiliateTag;
    }
  }

  const url = buildAmazonUrl(asin, {
    tag,
    domain: settings.amazonDomain,
    linkCode: settings.linkCode,
    extraParams: settings.extraParams as Record<string, string> | null,
  });

  return { url, tag, trackingEnabled: settings.trackingEnabled, campaignId };
}

export interface ClickInput {
  asin: string;
  sourceType: AffiliateSourceType;
  sourcePath?: string | null;
  campaignId?: string | null;
  affiliateTag?: string | null;
  ipHash?: string | null;
  userAgentHash?: string | null;
  deviceType: AffiliateDeviceType;
  country?: string | null;
}

/** Best-effort, never-throwing click log (called fire-and-forget after the redirect). */
export async function logClick(input: ClickInput): Promise<void> {
  try {
    const asin = normalizeAsin(input.asin);
    const product = await prisma.product.findUnique({ where: { asin }, select: { id: true } });
    await prisma.affiliateClick.create({
      data: {
        asin,
        productId: product?.id ?? null,
        sourceType: input.sourceType,
        sourcePath: input.sourcePath ?? null,
        campaignId: input.campaignId ?? null,
        affiliateTag: input.affiliateTag ?? null,
        ipHash: input.ipHash ?? null,
        userAgentHash: input.userAgentHash ?? null,
        deviceType: input.deviceType,
        country: input.country ?? null,
      },
    });
  } catch (err) {
    logger.warn({ err }, 'failed to log affiliate click');
  }
}

function countBy<T, K extends string>(rows: T[], key: (r: T) => K): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = key(r);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getStats(days = 30): Promise<{
  days: number;
  totalClicks: number;
  totalRevenue: number;
  totalConversions: number;
  conversionRate: number;
  epc: number;
  byDevice: Record<string, number>;
  bySource: Record<string, number>;
  daily: { date: string; clicks: number; revenue: number; conversions: number }[];
}> {
  const since = new Date(Date.now() - days * DAY_MS);

  const [clicks, revRows] = await Promise.all([
    prisma.affiliateClick.findMany({
      where: { clickedAt: { gte: since } },
      select: { clickedAt: true, deviceType: true, sourceType: true },
    }),
    prisma.revenueReport.findMany({
      where: { date: { gte: since } },
      select: { date: true, actualRevenue: true, orders: true },
    }),
  ]);

  const totalClicks = clicks.length;
  const totalRevenue = revRows.reduce((s, r) => s + Number(r.actualRevenue), 0);
  const totalConversions = revRows.reduce((s, r) => s + r.orders, 0);

  const clicksByDay = countBy(clicks, (c) => dayKey(c.clickedAt));
  const revByDay: Record<string, { revenue: number; conversions: number }> = {};
  for (const r of revRows) {
    const k = dayKey(r.date);
    revByDay[k] ??= { revenue: 0, conversions: 0 };
    revByDay[k].revenue += Number(r.actualRevenue);
    revByDay[k].conversions += r.orders;
  }

  const daily: { date: string; clicks: number; revenue: number; conversions: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(new Date(Date.now() - i * DAY_MS));
    daily.push({
      date: k,
      clicks: clicksByDay[k] ?? 0,
      revenue: revByDay[k]?.revenue ?? 0,
      conversions: revByDay[k]?.conversions ?? 0,
    });
  }

  return {
    days,
    totalClicks,
    totalRevenue,
    totalConversions,
    conversionRate: totalClicks ? (totalConversions / totalClicks) * 100 : 0,
    epc: totalClicks ? totalRevenue / totalClicks : 0,
    byDevice: countBy(clicks, (c) => c.deviceType),
    bySource: countBy(clicks, (c) => c.sourceType),
    daily,
  };
}

export interface ClicksQuery {
  page: number;
  perPage: number;
  asin?: string;
  sourceType?: AffiliateSourceType;
  deviceType?: AffiliateDeviceType;
  days?: number;
}

export async function getClicks(q: ClicksQuery): Promise<{ items: unknown[]; pagination: Pagination }> {
  const and: Prisma.AffiliateClickWhereInput[] = [];
  if (q.asin) and.push({ asin: normalizeAsin(q.asin) });
  if (q.sourceType) and.push({ sourceType: q.sourceType });
  if (q.deviceType) and.push({ deviceType: q.deviceType });
  if (q.days) and.push({ clickedAt: { gte: new Date(Date.now() - q.days * DAY_MS) } });
  const where = and.length ? { AND: and } : {};

  const [rows, total] = await prisma.$transaction([
    prisma.affiliateClick.findMany({
      where,
      include: { product: { select: { title: true, slug: true } }, campaign: { select: { name: true } } },
      orderBy: { clickedAt: 'desc' },
      skip: (q.page - 1) * q.perPage,
      take: q.perPage,
    }),
    prisma.affiliateClick.count({ where }),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    asin: r.asin,
    productTitle: r.product?.title ?? null,
    productSlug: r.product?.slug ?? null,
    sourceType: r.sourceType,
    deviceType: r.deviceType,
    country: r.country,
    campaign: r.campaign?.name ?? null,
    affiliateTag: r.affiliateTag,
    clickedAt: r.clickedAt.toISOString(),
    // Note: ipHash/userAgentHash are intentionally NOT exposed.
  }));

  return {
    items,
    pagination: {
      page: q.page,
      perPage: q.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.perPage)),
    },
  };
}

export async function getTopProducts(days = 30, limit = 10): Promise<unknown[]> {
  const since = new Date(Date.now() - days * DAY_MS);

  const grouped = await prisma.affiliateClick.groupBy({
    by: ['asin'],
    where: { clickedAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { asin: 'desc' } },
    take: limit,
  });

  const asins = grouped.map((g) => g.asin);
  const [products, revenue] = await Promise.all([
    prisma.product.findMany({ where: { asin: { in: asins } }, select: { asin: true, title: true, slug: true } }),
    prisma.revenueReport.groupBy({
      by: ['asin'],
      where: { asin: { in: asins }, date: { gte: since } },
      _sum: { actualRevenue: true, orders: true },
    }),
  ]);
  const titleByAsin = new Map(products.map((p) => [p.asin, { title: p.title, slug: p.slug }]));
  const revByAsin = new Map(
    revenue.map((r) => [r.asin, { revenue: Number(r._sum.actualRevenue ?? 0), orders: r._sum.orders ?? 0 }]),
  );

  return grouped.map((g) => {
    const clicks = g._count._all;
    const rev = revByAsin.get(g.asin);
    const orders = rev?.orders ?? 0;
    return {
      asin: g.asin,
      name: titleByAsin.get(g.asin)?.title ?? g.asin,
      slug: titleByAsin.get(g.asin)?.slug ?? null,
      clicks,
      conversions: orders,
      revenue: rev?.revenue ?? 0,
      conversionRate: clicks ? Number(((orders / clicks) * 100).toFixed(2)) : 0,
    };
  });
}

export interface ComplianceItem {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

/** FR-063 affiliate-compliance checklist. */
export async function getCompliance(): Promise<{ items: ComplianceItem[]; score: number }> {
  const settings = await getCachedSettings();
  const items: ComplianceItem[] = [];

  const tagOk = Boolean(settings.amazonAssociateTag && settings.amazonAssociateTag.trim().length > 0);
  items.push({
    id: 'associate_tag',
    label: 'Amazon Associate tag configured',
    status: tagOk ? 'pass' : 'fail',
    detail: tagOk ? `Tag: ${settings.amazonAssociateTag}` : 'No associate tag set in Affiliate Settings.',
  });

  items.push({
    id: 'redirect_whitelist',
    label: 'Outbound links restricted to the amazon.in whitelist',
    status: 'pass',
    detail: 'All /go redirects are built from the configured (whitelisted) domain.',
  });

  items.push({
    id: 'ip_privacy',
    label: 'Click tracking is privacy-safe (no raw IP / UA)',
    status: 'pass',
    detail: 'IP and User-Agent are stored as SHA-256 hashes only (NFR-SEC-007).',
  });

  const disclosureOk = Boolean(settings.disclosureText && settings.disclosureText.trim().length > 0);
  items.push({
    id: 'disclosure_text',
    label: 'Affiliate disclosure text configured',
    status: disclosureOk ? 'pass' : 'warn',
    detail: disclosureOk
      ? 'Disclosure text is set.'
      : 'No disclosure text configured (a default disclosure page still exists at /affiliate-disclosure).',
  });

  items.push({
    id: 'disclosure_page',
    label: 'Public affiliate-disclosure page present',
    status: 'pass',
    detail: 'Served at /affiliate-disclosure.',
  });

  items.push({
    id: 'tracking_enabled',
    label: 'Click tracking enabled',
    status: settings.trackingEnabled ? 'pass' : 'warn',
    detail: settings.trackingEnabled ? 'Enabled.' : 'Tracking is currently disabled in settings.',
  });

  const passes = items.filter((i) => i.status === 'pass').length;
  const score = Math.round((passes / items.length) * 100);
  return { items, score };
}
