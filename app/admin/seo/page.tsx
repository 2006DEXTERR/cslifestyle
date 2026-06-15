'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertCircle, CheckCircle2, AlertTriangle, XCircle, Globe, FileText, Link, TrendingUp, Activity, RefreshCw, Download, Filter, Eye, ExternalLink, ChevronDown, ChevronRight, MoreHorizontal, Plus, Settings, Zap, Calendar, Clock, BarChart3, Layers } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';

const indexedPagesData = [
  { date: 'Jun 1', indexed: 2450, submitted: 2500 }, { date: 'Jun 2', indexed: 2475, submitted: 2510 },
  { date: 'Jun 3', indexed: 2490, submitted: 2520 }, { date: 'Jun 4', indexed: 2485, submitted: 2520 },
  { date: 'Jun 5', indexed: 2500, submitted: 2530 }, { date: 'Jun 6', indexed: 2510, submitted: 2540 },
  { date: 'Jun 7', indexed: 2525, submitted: 2550 }, { date: 'Jun 8', indexed: 2535, submitted: 2560 },
  { date: 'Jun 9', indexed: 2545, submitted: 2570 }, { date: 'Jun 10', indexed: 2560, submitted: 2580 },
];

const crawlErrors = [
  { type: '404 Not Found', count: 145, trend: -12, severity: 'high' },
  { type: '5xx Server Error', count: 23, trend: 5, severity: 'critical' },
  { type: 'Redirect Chain', count: 45, trend: -8, severity: 'medium' },
  { type: 'Blocked by robots.txt', count: 12, trend: 0, severity: 'low' },
];

const pageSeoData = [
  { id: 1, url: '/products/iphone-15-pro-max', title: 'Apple iPhone 15 Pro Max Review', score: 92, issues: 1, impressions: 45230, clicks: 3420, position: 3.2 },
  { id: 2, url: '/guides/best-wireless-headphones', title: 'Best Wireless Headphones 2024', score: 88, issues: 2, impressions: 38450, clicks: 2890, position: 4.5 },
  { id: 3, url: '/products/sony-wh-1000xm5', title: 'Sony WH-1000XM5 Review', score: 95, issues: 0, impressions: 28920, clicks: 2340, position: 2.8 },
];

const auditFindings = [
  { id: 1, category: 'Content', issue: 'Thin Content', count: 45, severity: 'high', description: 'Pages with less than 300 words' },
  { id: 2, category: 'Technical', issue: 'Missing Meta Descriptions', count: 28, severity: 'medium', description: 'Pages without meta descriptions' },
  { id: 3, category: 'Technical', issue: 'Duplicate Title Tags', count: 15, severity: 'high', description: 'Multiple pages with identical titles' },
  { id: 4, category: 'Links', issue: 'Broken Internal Links', count: 89, severity: 'high', description: 'Internal links returning 404' },
];

const severityColors = { critical: 'text-red-600 bg-red-50 dark:bg-red-950/30', high: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30', medium: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30', low: 'text-green-600 bg-green-50 dark:bg-green-950/30' };
const severityIcons = { critical: XCircle, high: AlertCircle, medium: AlertTriangle, low: CheckCircle2 };

export default function SEOCenterPage() {
  const [activeTab, setActiveTab] = useState<'health' | 'sitemap' | 'audit' | 'keywords'>('health');
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SEO Center</h1>
          <p className="text-muted-foreground">Monitor health, indexing status, and optimize for search</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <RefreshCw className="h-4 w-4" /> Run Audit
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <Download className="h-4 w-4" /> Export
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl">
            <Settings className="h-4 w-4" /> Settings
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-950/30"><CheckCircle2 className="h-6 w-6 text-green-600" /></div>
            <span className="rounded-full bg-green-100 dark:bg-green-950/30 px-2.5 py-0.5 text-xs font-medium text-green-600">Good</span>
          </div>
          <div className="mt-4"><p className="text-3xl font-bold text-foreground">86</p><p className="text-sm text-muted-foreground">Overall SEO Score</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-950/30"><Globe className="h-6 w-6 text-blue-600" /></div>
            <div className="flex items-center gap-1 text-xs text-green-600"><TrendingUp className="h-3 w-3" />+2.4%</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">2,560 / 2,580</p><p className="text-sm text-muted-foreground">Pages Indexed</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-orange-100 p-3 dark:bg-orange-950/30"><AlertTriangle className="h-6 w-6 text-orange-600" /></div>
            <span className="rounded-full bg-orange-100 dark:bg-orange-950/30 px-2.5 py-0.5 text-xs font-medium text-orange-600">Needs Fix</span>
          </div>
          <div className="mt-4"><p className="text-3xl font-bold text-foreground">303</p><p className="text-sm text-muted-foreground">Issues Found</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-950/30"><Activity className="h-6 w-6 text-purple-600" /></div>
            <div className="flex items-center gap-1 text-xs text-green-600"><TrendingUp className="h-3 w-3" />+12.8%</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">125.4K</p><p className="text-sm text-muted-foreground">Organic Impressions</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          {[
            { id: 'health', label: 'Health Dashboard', icon: Activity },
            { id: 'sitemap', label: 'Sitemap & Indexing', icon: Layers },
            { id: 'audit', label: 'Site Audit', icon: Search },
            { id: 'keywords', label: 'Keywords', icon: TrendingUp },
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
        {activeTab === 'health' && (
          <motion.div key="health" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Indexing Progress</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={indexedPagesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="indexed" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                    <Line type="monotone" dataKey="submitted" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Crawl Errors</h3>
                <div className="space-y-3">
                  {crawlErrors.map((error) => {
                    const SeverityIcon = severityIcons[error.severity as keyof typeof severityIcons];
                    return (
                      <div key={error.type} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                        <div className={cn('rounded-lg p-2', severityColors[error.severity as keyof typeof severityColors])}>
                          <SeverityIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{error.type}</p>
                          <p className="text-sm text-muted-foreground">{error.count} URLs affected</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Top Pages</h3>
                <div className="space-y-3">
                  {pageSeoData.map((page) => (
                    <div key={page.id} className="flex items-center gap-3">
                      <div className={cn('rounded-lg px-2.5 py-1.5 font-bold',
                        page.score >= 90 ? 'bg-green-100 dark:bg-green-950/30' : page.score >= 70 ? 'bg-yellow-100 dark:bg-yellow-950/30' : 'bg-red-100 dark:bg-red-950/30'
                      )}>
                        <span className={getScoreColor(page.score)}>{page.score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{page.url}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(page.impressions)} impr. • {formatNumber(page.clicks)} clicks</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-4">
                <div className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-600" /><span className="text-sm font-medium text-red-600">Critical</span></div>
                <p className="text-2xl font-bold text-red-600 mt-2">23</p>
              </div>
              <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/30 p-4">
                <div className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-orange-600" /><span className="text-sm font-medium text-orange-600">High</span></div>
                <p className="text-2xl font-bold text-orange-600 mt-2">89</p>
              </div>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 p-4">
                <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-600" /><span className="text-sm font-medium text-yellow-600">Medium</span></div>
                <p className="text-2xl font-bold text-yellow-600 mt-2">145</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 p-4">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /><span className="text-sm font-medium text-green-600">Low</span></div>
                <p className="text-2xl font-bold text-green-600 mt-2">46</p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Audit Findings</h3>
                <select className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground">
                  <option>All Categories</option><option>Content</option><option>Technical</option><option>Links</option>
                </select>
              </div>
              <div className="divide-y divide-border">
                {auditFindings.map((finding) => {
                  const SeverityIcon = severityIcons[finding.severity as keyof typeof severityIcons];
                  return (
                    <div key={finding.id}>
                      <button onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn('rounded-lg p-2.5', severityColors[finding.severity as keyof typeof severityColors])}>
                            <SeverityIcon className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{finding.category}</span>
                              <span className="font-medium text-foreground">{finding.issue}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{finding.count} pages affected</p>
                          </div>
                        </div>
                        <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', expandedFinding === finding.id && 'rotate-180')} />
                      </button>
                      <AnimatePresence>
                        {expandedFinding === finding.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border bg-muted/30">
                            <div className="p-4 space-y-3">
                              <p className="text-sm text-foreground">{finding.description}</p>
                              <div className="flex items-center gap-2 pt-2">
                                <button className="rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white hover:opacity-90">View Affected Pages</button>
                                <button className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Mark as Fixed</button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
