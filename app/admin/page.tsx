'use client';

import * as React from 'react';
import Link from 'next/link';
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
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { adminApi, type AdminOverview } from '@/lib/api/admin';
import { analyticsApi, type DashboardData } from '@/lib/api/analytics';

// Brand palette reused for the category pie (matches the previous static colors).
const PIE_COLORS = ['#E91E8F', '#FF4D4D', '#FF7A00', '#FFC107', '#22c55e', '#888'];

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

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Traffic Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border bg-card"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Traffic Trend</h2>
              <p className="text-sm text-muted-foreground">Page views and users (last 30 days)</p>
            </div>
          </div>
          <div className="h-[250px]">
            {trafficData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No traffic data yet</div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="traffic" stroke="#E91E8F" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="users" stroke="#FF7A00" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Content Growth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-xl border bg-card"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Content Growth</h2>
              <p className="text-sm text-muted-foreground">Products, guides, comparisons</p>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={contentGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="products" stackId="1" stroke="#E91E8F" fill="#E91E8F" fillOpacity={0.2} />
                <Area type="monotone" dataKey="guides" stackId="1" stroke="#FF4D4D" fill="#FF4D4D" fillOpacity={0.2} />
                <Area type="monotone" dataKey="comparisons" stackId="1" stroke="#FFC107" fill="#FFC107" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Second Row Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Affiliate Clicks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-xl border bg-card"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Affiliate Clicks</h2>
            <p className="text-sm text-muted-foreground">Last 7 days</p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={affiliateClicksData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="clicks" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#E91E8F" />
                    <stop offset="50%" stopColor="#FF4D4D" />
                    <stop offset="100%" stopColor="#FFC107" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-xl border bg-card"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Category Distribution</h2>
            <p className="text-sm text-muted-foreground">Published products by category</p>
          </div>
          <div className="h-[200px]">
            {categoryDistributionData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No products yet</div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-xl border bg-card"
        >
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { name: 'Add Product', href: '/admin/products/new' },
              { name: 'Create Guide', href: '/admin/guides/new' },
              { name: 'New Comparison', href: '/admin/comparisons/new' },
              { name: 'Add Author', href: '/admin/authors/new' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">{action.name}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

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
