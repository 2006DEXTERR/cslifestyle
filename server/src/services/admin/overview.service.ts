import { prisma } from '../../lib/prisma';

/**
 * Admin dashboard overview (Phase 13.x) — live counts + recent activity + small
 * time-series for the /admin landing page, which previously rendered hardcoded mock
 * data. Everything here is Prisma aggregation over the existing tables; no new models.
 */

export interface AdminOverview {
  counts: {
    products: { total: number; published: number; draft: number };
    categories: number;
    brands: number;
    guides: { total: number; published: number; draft: number };
    comparisons: number;
    authors: number;
    users: number;
    roles: number;
    subscribers: number;
  };
  categoryDistribution: { name: string; value: number }[];
  recentProducts: { id: string; title: string; slug: string; category: string; isPublished: boolean }[];
  recentGuides: { id: string; title: string; slug: string; author: string; status: string }[];
  contentGrowth: { month: string; products: number; guides: number; comparisons: number }[];
  affiliateClicksDaily: { day: string; clicks: number }[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function getAdminOverview(): Promise<AdminOverview> {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    productsTotal,
    productsPublished,
    categories,
    brands,
    guidesTotal,
    guidesPublished,
    comparisons,
    authors,
    users,
    roles,
    subscribers,
    categoryGroups,
    categoryList,
    recentProductRows,
    recentGuideRows,
    growthProducts,
    growthGuides,
    growthComparisons,
    clickRows,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isPublished: true } }),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.guide.count(),
    prisma.guide.count({ where: { status: 'published' } }),
    prisma.comparison.count(),
    prisma.author.count(),
    prisma.user.count(),
    prisma.role.count(),
    prisma.newsletterSubscriber.count({ where: { status: 'active' } }),
    prisma.product.groupBy({ by: ['categoryId'], where: { isPublished: true }, _count: { _all: true } }),
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, slug: true, isPublished: true, category: { select: { name: true } } },
    }),
    prisma.guide.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, slug: true, status: true, author: { select: { name: true } } },
    }),
    prisma.product.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    prisma.guide.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    prisma.comparison.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    prisma.affiliateClick.findMany({ where: { clickedAt: { gte: sevenDaysAgo } }, select: { clickedAt: true } }),
  ]);

  // ── Category distribution (published products per category; top 5 + Others) ──
  const nameById = new Map(categoryList.map((c) => [c.id, c.name]));
  const dist = categoryGroups
    .map((g) => ({ name: nameById.get(g.categoryId) ?? 'Unknown', value: g._count._all }))
    .sort((a, b) => b.value - a.value);
  const others = dist.slice(5).reduce((s, d) => s + d.value, 0);
  const categoryDistribution = others > 0 ? [...dist.slice(0, 5), { name: 'Others', value: others }] : dist.slice(0, 5);

  // ── Content growth (last 6 calendar months, bucketed by createdAt) ──
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()] };
  });
  const bucketByMonth = (rows: { createdAt: Date }[]) => {
    const m = new Map(months.map((x) => [x.key, 0]));
    for (const r of rows) {
      const k = `${r.createdAt.getFullYear()}-${r.createdAt.getMonth()}`;
      if (m.has(k)) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const bp = bucketByMonth(growthProducts);
  const bg = bucketByMonth(growthGuides);
  const bc = bucketByMonth(growthComparisons);
  const contentGrowth = months.map((x) => ({
    month: x.label,
    products: bp.get(x.key) ?? 0,
    guides: bg.get(x.key) ?? 0,
    comparisons: bc.get(x.key) ?? 0,
  }));

  // ── Affiliate clicks (last 7 days, bucketed by clickedAt) ──
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return { key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, label: DOW_LABELS[d.getDay()] };
  });
  const clickMap = new Map(days.map((x) => [x.key, 0]));
  for (const c of clickRows) {
    const k = `${c.clickedAt.getFullYear()}-${c.clickedAt.getMonth()}-${c.clickedAt.getDate()}`;
    if (clickMap.has(k)) clickMap.set(k, (clickMap.get(k) ?? 0) + 1);
  }
  const affiliateClicksDaily = days.map((x) => ({ day: x.label, clicks: clickMap.get(x.key) ?? 0 }));

  return {
    counts: {
      products: { total: productsTotal, published: productsPublished, draft: productsTotal - productsPublished },
      categories,
      brands,
      guides: { total: guidesTotal, published: guidesPublished, draft: guidesTotal - guidesPublished },
      comparisons,
      authors,
      users,
      roles,
      subscribers,
    },
    categoryDistribution,
    recentProducts: recentProductRows.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      category: p.category?.name ?? '',
      isPublished: p.isPublished,
    })),
    recentGuides: recentGuideRows.map((g) => ({
      id: g.id,
      title: g.title,
      slug: g.slug,
      author: g.author?.name ?? '',
      status: g.status,
    })),
    contentGrowth,
    affiliateClicksDaily,
  };
}
