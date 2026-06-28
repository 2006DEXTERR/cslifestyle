'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { formatNumber } from '@/lib/format';
import {
  Package,
  FolderTree,
  Building2,
  BookOpen,
  GitCompare,
  Users,
  TrendingUp,
  MousePointer,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { adminApi, type AdminOverview } from '@/lib/api/admin';
import { analyticsApi, type DashboardData } from '@/lib/api/analytics';

// Brand palette reused for the category pie (matches the previous static colors).
const PIE_COLORS = ['#E91E8F', '#FF4D4D', '#FF7A00', '#FFC107', '#22c55e', '#888'];

// Heavy recharts bundle is loaded lazily (client-only) so it never blocks the dashboard
// shell. Placeholder reserves the chart-row heights to avoid layout shift.
const DashboardCharts = dynamic(() => import('./DashboardCharts'), {
  ssr: false,
  loading: () => (
    <>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border bg-card h-[334px]" />
        <div className="p-6 rounded-xl border bg-card h-[334px]" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border bg-card h-[284px]" />
        <div className="p-6 rounded-xl border bg-card h-[284px]" />
        <div className="p-6 rounded-xl border bg-card h-[284px]" />
      </div>
    </>
  ),
});

export default function AdminDashboard() {
  const [overview, setOverview] = React.useState<AdminOverview | null>(null);
  const [analytics, setAnalytics] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      // Overview (entity counts) and analytics (traffic/clicks) are independent so a
      // missing analytics.view permission still renders the catalog counts.
      const [ov, an] = await Promise.all([
        adminApi.getOverview().catch(() => null),
        analyticsApi.getDashboard('last30days').catch(() => null),
      ]);
      if (!active) return;
      if (ov) setOverview(ov); else setError(true);
      setAnalytics(an);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const c = overview?.counts;
  const kpis = [
    { name: 'Total Products', value: c?.products.total ?? 0, icon: Package, sub: c ? `${formatNumber(c.products.published)} published` : undefined },
    { name: 'Categories', value: c?.categories ?? 0, icon: FolderTree },
    { name: 'Brands', value: c?.brands ?? 0, icon: Building2 },
    { name: 'Guides', value: c?.guides.total ?? 0, icon: BookOpen, sub: c ? `${formatNumber(c.guides.published)} published` : undefined },
    { name: 'Comparisons', value: c?.comparisons ?? 0, icon: GitCompare },
    { name: 'Authors', value: c?.authors ?? 0, icon: Users },
    { name: 'Page Views', value: analytics?.cards.pageViews ?? 0, icon: TrendingUp, delta: analytics?.deltas.pageViews },
    { name: 'Affiliate Clicks', value: analytics?.cards.affiliateClicks ?? 0, icon: MousePointer },
  ];

  const trafficData = (analytics?.traffic ?? []).map((t) => ({ month: t.date.slice(5), traffic: t.pageViews, users: t.users }));
  const contentGrowthData = overview?.contentGrowth ?? [];
  const affiliateClicksData = overview?.affiliateClicksDaily ?? [];
  const categoryDistributionData = (overview?.categoryDistribution ?? []).map((d, i) => ({ ...d, color: PIE_COLORS[i % PIE_COLORS.length] }));
  const recentProducts = overview?.recentProducts ?? [];
  const recentGuides = overview?.recentGuides ?? [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your platform.
          {loading && <span className="ml-2 text-xs">Loading live data…</span>}
          {error && <span className="ml-2 text-xs text-red-600">Live data is temporarily unavailable.</span>}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-xl border bg-card"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                <kpi.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              {typeof kpi.delta === 'number' ? (
                <span
                  className={`text-xs font-medium flex items-center gap-0.5 ${
                    kpi.delta >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {kpi.delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(Math.round(kpi.delta))}%
                </span>
              ) : kpi.sub ? (
                <span className="text-xs text-muted-foreground">{kpi.sub}</span>
              ) : null}
            </div>
            <p className="text-2xl font-bold">{formatNumber(kpi.value)}</p>
            <p className="text-xs text-muted-foreground">{kpi.name}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts (recharts) — lazily loaded so the heavy bundle never blocks the shell */}
      <DashboardCharts
        trafficData={trafficData}
        contentGrowthData={contentGrowthData}
        affiliateClicksData={affiliateClicksData}
        categoryDistributionData={categoryDistributionData}
      />

      {/* Tables Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border bg-card"
        >
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Recent Products</h2>
            <Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {recentProducts.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No products yet</div>
            ) : (
              recentProducts.map((product) => (
                <Link
                  key={product.id}
                  href="/admin/products"
                  className="p-4 flex items-center gap-4 hover:bg-muted/50"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.title}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      product.isPublished ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
                    }`}
                  >
                    {product.isPublished ? 'Published' : 'Draft'}
                  </span>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Guides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border bg-card"
        >
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Recent Guides</h2>
            <Link href="/admin/guides" className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {recentGuides.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No guides yet</div>
            ) : (
              recentGuides.map((guide) => (
                <div key={guide.id} className="p-4 flex items-center gap-4 hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{guide.title}</p>
                    <p className="text-xs text-muted-foreground">{guide.author ? `by ${guide.author}` : 'Unattributed'}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      guide.status === 'published' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
                    }`}
                  >
                    {guide.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
