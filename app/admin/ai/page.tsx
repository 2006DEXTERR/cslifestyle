'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Play, Pause, Trash2, RefreshCw, Settings, Activity, DollarSign, Zap, Clock, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Cpu, Database, ChevronDown, Copy, Eye, Filter, Search, MoreHorizontal, Plus, Edit } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

const dailyUsageData = [
  { date: 'Jun 1', tokens: 45000, cost: 45 }, { date: 'Jun 2', tokens: 52000, cost: 52 }, { date: 'Jun 3', tokens: 38000, cost: 38 },
  { date: 'Jun 4', tokens: 65000, cost: 65 }, { date: 'Jun 5', tokens: 72000, cost: 72 }, { date: 'Jun 6', tokens: 58000, cost: 58 },
  { date: 'Jun 7', tokens: 81000, cost: 81 }, { date: 'Jun 8', tokens: 45000, cost: 45 }, { date: 'Jun 9', tokens: 92000, cost: 92 },
  { date: 'Jun 10', tokens: 68000, cost: 68 },
];

const providerUsageData = [
  { name: 'OpenAI', value: 45, color: '#10b981' }, { name: 'Anthropic', value: 30, color: '#6366f1' },
  { name: 'Google AI', value: 15, color: '#f59e0b' }, { name: 'Other', value: 10, color: '#94a3b8' },
];

const aiQueue = [
  { id: 'job-001', name: 'Product Description Generation', type: 'content', model: 'GPT-4 Turbo', status: 'running', progress: 67, tokensUsed: 12500, createdAt: '2024-06-10 09:15', estimatedTime: '12 min' },
  { id: 'job-002', name: 'Category Tagging Batch', type: 'classification', model: 'Claude 3', status: 'pending', progress: 0, tokensUsed: 0, createdAt: '2024-06-10 09:20', estimatedTime: 'Queued' },
  { id: 'job-003', name: 'SEO Metadata Generation', type: 'seo', model: 'GPT-3.5', status: 'pending', progress: 0, tokensUsed: 0, createdAt: '2024-06-10 09:25', estimatedTime: 'Queued' },
];

const aiProviders = [
  { id: 'openai', name: 'OpenAI', status: 'active', models: ['GPT-4 Turbo', 'GPT-3.5'], usage: { tokens: 850000, cost: 850 }, rateLimit: { used: 450, limit: 500 }, lastUsed: '2 min ago' },
  { id: 'anthropic', name: 'Anthropic', status: 'active', models: ['Claude 3 Opus', 'Claude 3 Sonnet'], usage: { tokens: 620000, cost: 492 }, rateLimit: { used: 180, limit: 200 }, lastUsed: '5 min ago' },
  { id: 'google', name: 'Google AI', status: 'active', models: ['Gemini Pro'], usage: { tokens: 150000, cost: 45 }, rateLimit: { used: 75, limit: 100 }, lastUsed: '1 hour ago' },
  { id: 'mistral', name: 'Mistral AI', status: 'inactive', models: ['Mistral Large'], usage: { tokens: 0, cost: 0 }, rateLimit: { used: 0, limit: 100 }, lastUsed: 'Never' },
];

export default function AICenterPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'logs' | 'providers' | 'usage'>('queue');
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30';
      case 'pending': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30';
      case 'completed': case 'success': case 'active': return 'text-green-600 bg-green-50 dark:bg-green-950/30';
      case 'failed': case 'error': return 'text-red-600 bg-red-50 dark:bg-red-950/30';
      case 'warning': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30';
      case 'inactive': return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Center</h1>
          <p className="text-muted-foreground">Manage AI jobs, providers, and monitor token usage</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all">
            <Plus className="h-4 w-4" /> New AI Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-950/30"><Activity className="h-6 w-6 text-blue-600" /></div>
            <span className="text-xs font-medium text-green-600">+12%</span>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">2,847,231</p><p className="text-sm text-muted-foreground">Total Tokens This Month</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-950/30"><DollarSign className="h-6 w-6 text-green-600" /></div>
            <span className="text-xs font-medium text-yellow-600">+8%</span>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">$2,847</p><p className="text-sm text-muted-foreground">Cost This Month</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-950/30"><Zap className="h-6 w-6 text-purple-600" /></div>
            <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600"><RefreshCw className="h-3 w-3 animate-spin" /> Live</span>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">2</p><p className="text-sm text-muted-foreground">Active Jobs</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-orange-100 p-3 dark:bg-orange-950/30"><Cpu className="h-6 w-6 text-orange-600" /></div>
            <span className="text-xs font-medium text-green-600">All Online</span>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">3/4</p><p className="text-sm text-muted-foreground">Active Providers</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          {[
            { id: 'queue', label: 'AI Queue', icon: Activity },
            { id: 'logs', label: 'AI Logs', icon: Database },
            { id: 'providers', label: 'AI Providers', icon: Settings },
            { id: 'usage', label: 'Usage & Costs', icon: TrendingUp },
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
        {activeTab === 'queue' && (
          <motion.div key="queue" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {aiQueue.map((job) => (
                <div key={job.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('rounded-lg p-2', getStatusColor(job.status))}>
                        {job.status === 'running' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{job.name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>{job.model}</span><span>•</span><span>{job.id}</span><span>•</span><span>{job.createdAt}</span>
                        </div>
                      </div>
                    </div>
                    <span className={cn('rounded-full px-2 py-1 text-xs font-medium capitalize', getStatusColor(job.status))}>{job.status}</span>
                  </div>
                  {job.status === 'running' && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-foreground">{job.progress}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full bg-brand-gradient rounded-full" style={{ width: `${job.progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'usage' && (
          <motion.div key="usage" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Daily Token Usage</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyUsageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="tokens" stroke="#E91E8F" fill="#E91E8F" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Provider Distribution</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={providerUsageData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                        {providerUsageData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Cost Breakdown</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Input Tokens</p>
                    <p className="text-2xl font-bold text-foreground">$1,247</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Output Tokens</p>
                    <p className="text-2xl font-bold text-foreground">$1,389</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'providers' && (
          <motion.div key="providers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
            {aiProviders.map((provider) => (
              <div key={provider.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn('rounded-lg p-3', getStatusColor(provider.status))}><Brain className="h-6 w-6" /></div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground">{provider.name}</h3>
                      <p className="text-sm text-muted-foreground">{provider.models.length} models • Last used: {provider.lastUsed}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">${provider.usage.cost}</p>
                      <p className="text-xs text-muted-foreground">this month</p>
                    </div>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-medium capitalize', getStatusColor(provider.status))}>{provider.status}</span>
                    <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', expandedProvider === provider.id && 'rotate-180')} />
                  </div>
                </button>
                <AnimatePresence>
                  {expandedProvider === provider.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border bg-muted/30">
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg border border-border bg-background p-4">
                            <p className="text-sm text-muted-foreground">Tokens Used</p>
                            <p className="text-xl font-bold text-foreground">{provider.usage.tokens.toLocaleString()}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-background p-4">
                            <p className="text-sm text-muted-foreground">Rate Limit</p>
                            <p className="text-xl font-bold text-foreground">{provider.rateLimit.used}/{provider.rateLimit.limit}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
