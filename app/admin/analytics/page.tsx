'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Users, Monitor, Smartphone, Tablet, Globe, TrendingUp, Eye, MousePointer, RefreshCw, Download, Activity, FileText, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import { analyticsApi, type AnalyticsRange, type DashboardData } from '@/lib/api/analytics';

const DEVICE_COLORS: Record<string, string> = { mobile: '#E91E8F', desktop: '#FF7A00', tablet: '#10b981', unknown: '#94a3b8' };
const RANGE_MAP: Record<string, AnalyticsRange> = { today: 'today', last7days: 'last7days', last30days: 'last30days', thisMonth: 'thisMonth' };
const FLAGS: Record<string, string> = { IN: '🇮🇳', US: '🇺🇸', GB: '🇬🇧', UK: '🇬🇧', DE: '🇩🇪', CA: '🇨🇦' };

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <div className={cn('flex items-center gap-1 text-sm font-medium', up ? 'text-green-600' : 'text-red-600')}>
      {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
      {up ? '+' : ''}{value}%
    </div>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'traffic' | 'geographic' | 'content'>('overview');
  const [dateRange, setDateRange] = useState('last7days');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (range: string) => {
    try {
      setData(await analyticsApi.getDashboard(RANGE_MAP[range] ?? 'last7days'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    }
  }, []);

  useEffect(() => { void refresh(dateRange); }, [dateRange, refresh]);

  // Keep the realtime banner live.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    const t = setInterval(() => void refreshRef.current(dateRange), 15000);
    return () => clearInterval(t);
  }, [dateRange]);

  const onExport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `analytics-${dateRange}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const c = data?.cards;
  const totalDevices = (data?.devices ?? []).reduce((s, d) => s + d.value, 0) || 1;
  const totalSessions = (data?.geographic ?? []).reduce((s, g) => s + g.sessions, 0) || 1;
  const totalSourceSessions = (data?.trafficSources ?? []).reduce((s, x) => s + x.sessions, 0) || 1;
  const realtime = data?.realtime;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Track traffic, user behavior, and content performance</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="today">Today</option><option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option><option value="thisMonth">This Month</option>
          </select>
          <button onClick={() => void refresh(dateRange)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={onExport} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-950/30"><Users className="h-6 w-6 text-blue-600" /></div>
            <Delta value={data?.deltas.users ?? 0} />
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">{c ? formatNumber(c.users) : '—'}</p><p className="text-sm text-muted-foreground">Total Users</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-950/30"><Activity className="h-6 w-6 text-purple-600" /></div>
            <Delta value={data?.deltas.sessions ?? 0} />
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">{c ? formatNumber(c.sessions) : '—'}</p><p className="text-sm text-muted-foreground">Sessions</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-orange-100 p-3 dark:bg-orange-950/30"><Eye className="h-6 w-6 text-orange-600" /></div>
            <Delta value={data?.deltas.pageViews ?? 0} />
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">{c ? formatNumber(c.pageViews) : '—'}</p><p className="text-sm text-muted-foreground">Page Views</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-950/30"><MousePointer className="h-6 w-6 text-green-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">{c ? `${c.affiliateClicks} clicks` : ''}</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">{c ? `${c.bounceRate}%` : '—'}</p><p className="text-sm text-muted-foreground">Bounce Rate</p></div>
        </div>
      </div>

      {/* Real-time */}
      <div className="rounded-xl border border-brand-pink/20 bg-gradient-to-r from-brand-pink/5 to-brand-orange/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Real-time: {formatNumber(realtime?.activeUsers ?? 0)} active users</p>
              <p className="text-sm text-muted-foreground">Updated just now</p>
            </div>
          </div>
          <div className="h-12 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={realtime?.series ?? []}>
                <Line type="monotone" dataKey="activeUsers" stroke="#E91E8F" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'traffic', label: 'Traffic Sources', icon: TrendingUp },
            { id: 'geographic', label: 'Geographic', icon: Globe },
            { id: 'content', label: 'Content Performance', icon: FileText },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn('flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id ? 'border-brand-pink text-brand-pink' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Traffic Overview</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data?.traffic ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="sessions" stroke="#E91E8F" fill="#E91E8F" fillOpacity={0.2} strokeWidth={2} />
                    <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Device Distribution</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {(data?.devices ?? []).slice(0, 3).map((device) => {
                    const Icon = device.name === 'mobile' ? Smartphone : device.name === 'desktop' ? Monitor : Tablet;
                    const pct = Math.round((device.value / totalDevices) * 100);
                    return (
                      <div key={device.name} className="text-center">
                        <div className="mx-auto w-fit rounded-lg bg-muted p-3 mb-2"><Icon className="h-6 w-6" /></div>
                        <p className="text-2xl font-bold text-foreground">{pct}%</p>
                        <p className="text-sm text-muted-foreground capitalize">{device.name}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data?.devices ?? []} cx="50%" cy="50%" innerRadius={30} outerRadius={45} paddingAngle={2} dataKey="value" nameKey="name">
                        {(data?.devices ?? []).map((entry) => <Cell key={entry.name} fill={DEVICE_COLORS[entry.name] ?? '#94a3b8'} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Top Pages</h3>
                <div className="space-y-3">
                  {(data?.topPages ?? []).length === 0 && <p className="text-sm text-muted-foreground">No page views yet.</p>}
                  {(data?.topPages ?? []).map((page) => (
                    <div key={page.path} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{page.path}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(page.views)} views</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'traffic' && (
          <motion.div key="traffic" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Traffic Sources</h3>
              </div>
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Sessions</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.trafficSources ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">No traffic data yet.</td></tr>}
                  {(data?.trafficSources ?? []).map((source) => (
                    <tr key={source.source} className="hover:bg-muted/30">
                      <td className="px-4 py-4 font-medium text-foreground">{source.source}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{formatNumber(source.sessions)}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{Math.round((source.sessions / totalSourceSessions) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
        {activeTab === 'geographic' && (
          <motion.div key="geographic" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Geographic Distribution</h3>
                <span className="text-sm text-muted-foreground">{(data?.geographic ?? []).length} countries</span>
              </div>
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Country</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Sessions</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.geographic ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">No geographic data yet.</td></tr>}
                  {(data?.geographic ?? []).map((country) => (
                    <tr key={country.country} className="hover:bg-muted/30">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{FLAGS[country.country] ?? '🏳️'}</span>
                          <span className="font-medium text-foreground">{country.country}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{formatNumber(country.sessions)}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{Math.round((country.sessions / totalSessions) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
        {activeTab === 'content' && (
          <motion.div key="content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Content Performance</h3>
              </div>
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Views</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Clicks</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { type: 'Products', views: c?.productViews ?? 0 },
                    { type: 'Guides', views: c?.guideViews ?? 0 },
                    { type: 'Comparisons', views: c?.comparisonViews ?? 0 },
                  ].map((content) => (
                    <tr key={content.type} className="hover:bg-muted/30">
                      <td className="px-4 py-4 font-medium text-foreground">{content.type}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{formatNumber(content.views)}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{content.type === 'Products' ? formatNumber(c?.affiliateClicks ?? 0) : '—'}</td>
                      <td className="px-4 py-4 text-sm font-medium text-foreground">{content.type === 'Products' ? `₹${formatNumber(c?.revenue ?? 0)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
