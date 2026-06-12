'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Users, Monitor, Smartphone, Tablet, Globe, TrendingUp, TrendingDown, Eye, MousePointer, Clock, RefreshCw, Download, Calendar, ArrowUpRight, ArrowDownRight, MapPin, Activity, FileText, Link, Search, Filter } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Treemap, ComposedChart, ScatterChart, Scatter } from 'recharts';
import { cn } from '@/lib/utils';

const trafficData = [
  { date: 'Jun 1', sessions: 45200, users: 32000, pageViews: 125000 }, { date: 'Jun 2', sessions: 48500, users: 34000, pageViews: 138000 },
  { date: 'Jun 3', sessions: 42800, users: 31000, pageViews: 118000 }, { date: 'Jun 4', sessions: 54200, users: 38000, pageViews: 152000 },
  { date: 'Jun 5', sessions: 58700, users: 42000, pageViews: 168000 }, { date: 'Jun 6', sessions: 51200, users: 36000, pageViews: 145000 },
  { date: 'Jun 7', sessions: 62400, users: 45000, pageViews: 185000 }, { date: 'Jun 8', sessions: 54800, users: 39000, pageViews: 158000 },
  { date: 'Jun 9', sessions: 68200, users: 48000, pageViews: 195000 }, { date: 'Jun 10', sessions: 59500, users: 42000, pageViews: 172000 },
];

const deviceData = [
  { name: 'Mobile', value: 58, sessions: 261000, users: 185000, color: '#E91E8F' },
  { name: 'Desktop', value: 32, sessions: 144000, users: 102000, color: '#FF7A00' },
  { name: 'Tablet', value: 10, sessions: 45000, users: 32000, color: '#10b981' },
];

const geographicData = [
  { country: 'India', code: 'IN', users: 185000, sessions: 285000, share: 45, growth: 8.5 },
  { country: 'United States', code: 'US', users: 62000, sessions: 95000, share: 15, growth: 12.4 },
  { country: 'United Kingdom', code: 'UK', users: 31000, sessions: 48000, share: 7.5, growth: 5.2 },
  { country: 'Germany', code: 'DE', users: 24000, sessions: 37000, share: 6, growth: -2.1 },
  { country: 'Canada', code: 'CA', users: 18000, sessions: 27500, share: 4.5, growth: 15.8 },
];

const topPages = [
  { path: '/', views: 245000, uniqueViews: 185000, avgTime: '2:45', bounceRate: 28 },
  { path: '/products/iphone-15-pro-max', views: 128000, uniqueViews: 98000, avgTime: '4:23', bounceRate: 32 },
  { path: '/guides/best-wireless-headphones', views: 85000, uniqueViews: 62000, avgTime: '5:12', bounceRate: 25 },
];

const trafficSources = [
  { source: 'Google Organic', sessions: 285000, users: 198000, share: 35, trend: 8.2 },
  { source: 'Direct', sessions: 163000, users: 115000, share: 20, trend: 3.5 },
  { source: 'Referral', sessions: 130000, users: 92000, share: 16, trend: 12.8 },
  { source: 'Bing', sessions: 114000, users: 80000, share: 14, trend: 5.2 },
];

const contentPerformance = [
  { type: 'Products', views: 512000, engagement: 4.2, avgTime: '3:45', revenue: 28500 },
  { type: 'Guides', views: 235000, engagement: 6.8, avgTime: '5:32', revenue: 12450 },
  { type: 'Comparisons', views: 180000, engagement: 7.2, avgTime: '6:18', revenue: 8920 },
];

const realTimeData = [
  { time: '10:45', activeUsers: 1245 }, { time: '10:46', activeUsers: 1289 }, { time: '10:47', activeUsers: 1342 },
  { time: '10:48', activeUsers: 1298 }, { time: '10:49', activeUsers: 1367 }, { time: '10:50', activeUsers: 1412 },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'traffic' | 'geographic' | 'content'>('overview');
  const [dateRange, setDateRange] = useState('last7days');

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
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-950/30"><Users className="h-6 w-6 text-blue-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600"><ArrowUpRight className="h-4 w-4" />+15.2%</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">428.5K</p><p className="text-sm text-muted-foreground">Total Users</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-950/30"><Activity className="h-6 w-6 text-purple-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600"><ArrowUpRight className="h-4 w-4" />+18.5%</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">545.2K</p><p className="text-sm text-muted-foreground">Sessions</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-orange-100 p-3 dark:bg-orange-950/30"><Eye className="h-6 w-6 text-orange-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600"><ArrowUpRight className="h-4 w-4" />+22.1%</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">1.54M</p><p className="text-sm text-muted-foreground">Page Views</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-950/30"><MousePointer className="h-6 w-6 text-green-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600"><ArrowDownRight className="h-4 w-4" />-4.2%</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">38.6%</p><p className="text-sm text-muted-foreground">Bounce Rate</p></div>
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
              <p className="font-semibold text-foreground">Real-time: 1,412 active users</p>
              <p className="text-sm text-muted-foreground">Updated just now</p>
            </div>
          </div>
          <div className="h-12 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={realTimeData}>
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
                  <ComposedChart data={trafficData}>
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
                  {deviceData.map((device) => {
                    const Icon = device.name === 'Mobile' ? Smartphone : device.name === 'Desktop' ? Monitor : Tablet;
                    return (
                      <div key={device.name} className="text-center">
                        <div className="mx-auto w-fit rounded-lg bg-muted p-3 mb-2"><Icon className="h-6 w-6" /></div>
                        <p className="text-2xl font-bold text-foreground">{device.value}%</p>
                        <p className="text-sm text-muted-foreground">{device.name}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={deviceData} cx="50%" cy="50%" innerRadius={30} outerRadius={45} paddingAngle={2} dataKey="value">
                        {deviceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Top Pages</h3>
                <div className="space-y-3">
                  {topPages.map((page) => (
                    <div key={page.path} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{page.path}</p>
                        <p className="text-xs text-muted-foreground">{page.views.toLocaleString()} views • {page.avgTime} avg</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{page.bounceRate}% bounce</span>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trafficSources.map((source) => (
                    <tr key={source.source} className="hover:bg-muted/30">
                      <td className="px-4 py-4 font-medium text-foreground">{source.source}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{source.sessions.toLocaleString()}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{source.share}%</td>
                      <td className="px-4 py-4">
                        <span className={cn('inline-flex items-center gap-1 text-sm font-medium', source.trend > 0 ? 'text-green-600' : 'text-red-600')}>
                          {source.trend > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          {source.trend > 0 ? '+' : ''}{source.trend}%
                        </span>
                      </td>
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
                <span className="text-sm text-muted-foreground">185 countries</span>
              </div>
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Country</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Users</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Sessions</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Share</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {geographicData.map((country) => (
                    <tr key={country.code} className="hover:bg-muted/30">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {country.code === 'IN' ? '🇮🇳' : country.code === 'US' ? '🇺🇸' : country.code === 'UK' ? '🇬🇧' : country.code === 'DE' ? '🇩🇪' : country.code === 'CA' ? '🇨🇦' : '🏳️'}
                          </span>
                          <span className="font-medium text-foreground">{country.country}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{country.users.toLocaleString()}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{country.sessions.toLocaleString()}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{country.share}%</td>
                      <td className="px-4 py-4">
                        <span className={cn('inline-flex items-center gap-1 text-sm font-medium', country.growth > 0 ? 'text-green-600' : 'text-red-600')}>
                          {country.growth > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          {country.growth > 0 ? '+' : ''}{country.growth}%
                        </span>
                      </td>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Engagement</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Avg. Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contentPerformance.map((content) => (
                    <tr key={content.type} className="hover:bg-muted/30">
                      <td className="px-4 py-4 font-medium text-foreground">{content.type}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{content.views.toLocaleString()}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div className="h-full bg-brand-gradient" style={{ width: `${content.engagement * 10}%` }} />
                          </div>
                          <span className="text-sm text-muted-foreground">{content.engagement}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{content.avgTime}</td>
                      <td className="px-4 py-4 text-sm font-medium text-foreground">${content.revenue.toLocaleString()}</td>
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
