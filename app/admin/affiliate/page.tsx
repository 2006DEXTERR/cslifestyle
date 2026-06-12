'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, MousePointer, ShoppingCart, TrendingUp, Link, ExternalLink, Copy, Eye, Filter, Search, Calendar, Download, ChevronDown, MoreHorizontal, Plus, Settings, BarChart3, Globe, Monitor, Smartphone, Tablet, ArrowUpRight, Activity } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { cn } from '@/lib/utils';

const earningsData = [
  { date: 'Jun 1', clicks: 1250, conversions: 42, revenue: 847 }, { date: 'Jun 2', clicks: 1480, conversions: 51, revenue: 1024 },
  { date: 'Jun 3', clicks: 1320, conversions: 38, revenue: 756 }, { date: 'Jun 4', clicks: 1890, conversions: 67, revenue: 1342 },
  { date: 'Jun 5', clicks: 2100, conversions: 72, revenue: 1456 }, { date: 'Jun 6', clicks: 1680, conversions: 55, revenue: 1102 },
  { date: 'Jun 7', clicks: 2350, conversions: 78, revenue: 1567 },
];

const topProducts = [
  { id: 1, name: 'Apple iPhone 15 Pro Max', clicks: 15420, conversions: 312, revenue: 6240, conversionRate: 2.02 },
  { id: 2, name: 'Sony WH-1000XM5 Headphones', clicks: 12350, conversions: 285, revenue: 3562, conversionRate: 2.31 },
  { id: 3, name: 'Samsung Galaxy S24 Ultra', clicks: 11200, conversions: 248, revenue: 4960, conversionRate: 2.21 },
  { id: 4, name: 'MacBook Pro 16-inch M3', clicks: 9870, conversions: 198, revenue: 3960, conversionRate: 2.01 },
];

const trafficSources = [
  { source: 'Google Organic', sessions: 285000, users: 198000, share: 35, trend: 8.2 },
  { source: 'Direct', sessions: 163000, users: 115000, share: 20, trend: 3.5 },
  { source: 'Bing', sessions: 114000, users: 80000, share: 14, trend: 5.2 },
  { source: 'Referral', sessions: 97000, users: 68000, share: 12, trend: 12.8 },
  { source: 'Social Media', sessions: 65000, users: 46000, share: 8, trend: 18.5 },
];

const deviceData = [
  { name: 'Mobile', value: 58, color: '#E91E8F' }, { name: 'Desktop', value: 32, color: '#FF7A00' }, { name: 'Tablet', value: 10, color: '#10b981' },
];

export default function AffiliateAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'clicks' | 'conversions' | 'links'>('overview');
  const [dateRange, setDateRange] = useState('last7days');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Affiliate Analytics</h1>
          <p className="text-muted-foreground">Track clicks, conversions, and revenue from affiliate links</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="last7days">Last 7 Days</option><option value="last30days">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
          </select>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <Download className="h-4 w-4" /> Export
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl">
            <Plus className="h-4 w-4" /> Add Link
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-950/30"><DollarSign className="h-6 w-6 text-green-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600"><ArrowUpRight className="h-4 w-4" />+18.5%</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">$32,847</p><p className="text-sm text-muted-foreground">Total Revenue</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-950/30"><MousePointer className="h-6 w-6 text-blue-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600"><ArrowUpRight className="h-4 w-4" />+23.2%</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">145,230</p><p className="text-sm text-muted-foreground">Total Clicks</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-950/30"><ShoppingCart className="h-6 w-6 text-purple-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600"><ArrowUpRight className="h-4 w-4" />+15.8%</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">2,847</p><p className="text-sm text-muted-foreground">Total Conversions</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-orange-100 p-3 dark:bg-orange-950/30"><TrendingUp className="h-6 w-6 text-orange-600" /></div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">$11.53</p><p className="text-sm text-muted-foreground">Avg. EPC</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 }, { id: 'clicks', label: 'Click Analytics', icon: MousePointer },
            { id: 'conversions', label: 'Conversions', icon: ShoppingCart }, { id: 'links', label: 'Affiliate Links', icon: Link },
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
              <h3 className="font-semibold text-foreground mb-4">Earnings Over Time</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={earningsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="revenue" fill="#E91E8F" opacity={0.6} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Top Performing Products</h3>
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-bold">{index + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.clicks.toLocaleString()} clicks</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">${product.revenue.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{product.conversionRate}% CVR</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Device Distribution</h3>
                <div className="h-40 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={deviceData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                        {deviceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {deviceData.map((device) => (
                    <div key={device.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: device.color }} />
                      <span className="text-sm text-muted-foreground">{device.name}: {device.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'clicks' && (
          <motion.div key="clicks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Traffic Sources</h3>
              <div className="space-y-3">
                {trafficSources.map((source) => (
                  <div key={source.source} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{source.source}</p>
                      <p className="text-sm text-muted-foreground">{source.sessions.toLocaleString()} sessions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{source.share}%</p>
                      <p className={cn('text-sm', source.trend > 0 ? 'text-green-600' : 'text-red-600')}>
                        {source.trend > 0 ? '+' : ''}{source.trend}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
