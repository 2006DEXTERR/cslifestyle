'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, RefreshCw, Settings, Activity, DollarSign, Zap, Clock, Check,
  ChevronDown, Plus, Cpu, Database, TrendingUp, AlertTriangle, FileText, Save, ThumbsUp,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { formatNumber, formatDate } from '@/lib/format';
import { aiApi, type AiJob, type AiLogEntry, type AiStats, type AiProvider, type AiUsage, type AiPrompt } from '@/lib/api/ai';

const PIE_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#94a3b8', '#E91E8F'];

const PROMPT_LABELS: Record<string, string> = {
  title: 'Product Title',
  meta: 'Meta Description',
  description: 'Product Description',
  pros_cons: 'Pros & Cons',
  faq: 'FAQ (5 items)',
  guide: 'Buying Guide',
  comparison: 'Comparison Verdict',
  category: 'Category Description',
  schema: 'JSON-LD Schema',
  internal_links: 'Internal Links',
};

// Backend AI status → the page's status vocabulary ("running" kept from the original mock).
function displayStatus(status: AiJob['status']): 'running' | 'pending' | 'completed' | 'failed' {
  if (status === 'processing') return 'running';
  if (status === 'done') return 'completed';
  return status;
}

export default function AICenterPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'logs' | 'providers' | 'usage' | 'prompts'>('queue');
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const [stats, setStats] = useState<AiStats | null>(null);
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [logs, setLogs] = useState<AiLogEntry[]>([]);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prompt editor state.
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, q, l, p, u, pr] = await Promise.all([
        aiApi.getStats(),
        aiApi.listQueue({ perPage: 50 }),
        aiApi.listLogs({ perPage: 50 }),
        aiApi.getProviders(),
        aiApi.getUsage(),
        aiApi.listPrompts(),
      ]);
      setStats(s);
      setJobs(q.items);
      setLogs(l.items);
      setProviders(p);
      setUsage(u);
      setPrompts(pr);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI data');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll while jobs are in-flight so the queue stays live.
  const hasActive = jobs.some((j) => j.status === 'pending' || j.status === 'processing');
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(() => void refreshRef.current(), 4000);
    return () => clearInterval(t);
  }, [hasActive]);

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

  const flash = (msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 4000);
  };

  const onNewJob = async () => {
    try {
      const r = await aiApi.bulkGenerate({ entityType: 'product', limit: 25 });
      flash(`Queued ${r.jobs} AI jobs across ${r.entities} products.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start AI jobs');
    }
  };

  const onRetry = async (id: string) => {
    try { await aiApi.retry(id); await refresh(); } catch (err) { setError(err instanceof Error ? err.message : 'Retry failed'); }
  };
  const onApprove = async (id: string) => {
    try { await aiApi.approve(id); flash('Content approved and applied.'); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Approve failed'); }
  };

  const startEditPrompt = (p: AiPrompt) => {
    setEditingPrompt(p.type);
    setPromptDraft(p.template);
  };
  const savePrompt = async () => {
    if (!editingPrompt) return;
    setSavingPrompt(true);
    try {
      await aiApi.updatePrompt(editingPrompt, promptDraft);
      flash('Prompt template saved.');
      setEditingPrompt(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const providersOnline = stats ? `${stats.activeProviders}/${stats.totalProviders}` : '—';
  const allOnline = stats ? stats.activeProviders === stats.totalProviders : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Center</h1>
          <p className="text-muted-foreground">Manage AI jobs, providers, and monitor token usage</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void refresh()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => void onNewJob()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all">
            <Plus className="h-4 w-4" /> New AI Job
          </button>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <Check className="h-4 w-4" /> {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-950/30"><Activity className="h-6 w-6 text-blue-600" /></div>
            <span className="text-xs font-medium text-green-600">this month</span>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">{stats ? formatNumber(stats.totalTokensThisMonth) : '—'}</p><p className="text-sm text-muted-foreground">Total Tokens This Month</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-950/30"><DollarSign className="h-6 w-6 text-green-600" /></div>
            <span className="text-xs font-medium text-yellow-600">this month</span>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">${stats ? stats.costThisMonth.toFixed(2) : '—'}</p><p className="text-sm text-muted-foreground">Cost This Month</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-950/30"><Zap className="h-6 w-6 text-purple-600" /></div>
            {stats && stats.activeJobs > 0
              ? <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600"><RefreshCw className="h-3 w-3 animate-spin" /> Live</span>
              : <span className="text-xs font-medium text-muted-foreground">Idle</span>}
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">{stats ? stats.activeJobs : '—'}</p><p className="text-sm text-muted-foreground">Active Jobs</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-orange-100 p-3 dark:bg-orange-950/30"><Cpu className="h-6 w-6 text-orange-600" /></div>
            <span className={cn('text-xs font-medium', allOnline ? 'text-green-600' : 'text-muted-foreground')}>{allOnline ? 'All Online' : 'Partial'}</span>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">{providersOnline}</p><p className="text-sm text-muted-foreground">Active Providers</p></div>
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
            { id: 'prompts', label: 'Prompts', icon: FileText },
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
              {jobs.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No AI jobs yet. Use “New AI Job” or import products to generate content.</div>}
              {jobs.map((job) => {
                const ds = displayStatus(job.status);
                return (
                  <div key={job.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={cn('rounded-lg p-2', getStatusColor(ds))}>
                          {ds === 'running' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{job.jobType.replace(/_/g, ' ')} · {job.entityType}</h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <span>{job.model ?? job.result?.provider ?? 'queued'}</span><span>•</span><span>{job.id.slice(0, 8)}</span><span>•</span><span>{formatDate(job.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.approved && <span className="rounded-full px-2 py-1 text-xs font-medium capitalize text-green-600 bg-green-50 dark:bg-green-950/30">approved</span>}
                        <span className={cn('rounded-full px-2 py-1 text-xs font-medium capitalize', getStatusColor(ds))}>{ds}</span>
                      </div>
                    </div>
                    {job.status === 'done' && job.result?.text && (
                      <p className="mt-3 line-clamp-2 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{job.result.text}</p>
                    )}
                    {job.status === 'failed' && job.error && (
                      <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600">{job.error}</p>
                    )}
                    {(job.status === 'failed' || (job.status === 'done' && !job.approved)) && (
                      <div className="flex items-center gap-2 mt-3">
                        {job.status === 'failed' && (
                          <button onClick={() => void onRetry(job.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                            <RefreshCw className="h-3.5 w-3.5" /> Retry
                          </button>
                        )}
                        {job.status === 'done' && !job.approved && (
                          <button onClick={() => void onApprove(job.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors">
                            <ThumbsUp className="h-3.5 w-3.5" /> Approve &amp; apply
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div key="logs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Job</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Provider</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tokens</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No AI logs yet.</td></tr>
                  )}
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{log.jobType.replace(/_/g, ' ')} · {log.entityType}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{log.provider ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{log.model ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatNumber(log.tokensInput + log.tokensOutput)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">${log.costUsd.toFixed(4)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={cn('rounded-full px-2 py-1 text-xs font-medium capitalize', getStatusColor(log.status))}>{log.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'usage' && (
          <motion.div key="usage" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Daily Token Usage</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usage?.daily ?? []}>
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
                      <Pie data={usage?.providerDistribution ?? []} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="tokens" nameKey="name">
                        {(usage?.providerDistribution ?? []).map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
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
                    <p className="text-2xl font-bold text-foreground">${usage ? usage.inputCost.toFixed(2) : '0.00'}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Output Tokens</p>
                    <p className="text-2xl font-bold text-foreground">${usage ? usage.outputCost.toFixed(2) : '0.00'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'providers' && (
          <motion.div key="providers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
            {providers.map((provider) => (
              <div key={provider.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn('rounded-lg p-3', getStatusColor(provider.status))}><Brain className="h-6 w-6" /></div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground">{provider.name}{provider.primary && <span className="ml-2 rounded-full bg-brand-pink/10 px-2 py-0.5 text-xs font-medium text-brand-pink">primary</span>}</h3>
                      <p className="text-sm text-muted-foreground">{provider.models.length} models • Last used: {provider.lastUsed ? formatDate(provider.lastUsed) : 'Never'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">${provider.usage.cost.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">this month</p>
                    </div>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-medium capitalize', getStatusColor(provider.status))}>{provider.status}</span>
                    <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', expandedProvider === provider.id && 'rotate-180')} />
                  </div>
                </button>
                <AnimatePresence>
                  {expandedProvider === provider.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border bg-muted/30">
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg border border-border bg-background p-4">
                            <p className="text-sm text-muted-foreground">Tokens Used</p>
                            <p className="text-xl font-bold text-foreground">{formatNumber(provider.usage.tokens)}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-background p-4">
                            <p className="text-sm text-muted-foreground">Models</p>
                            <p className="text-xl font-bold text-foreground">{provider.models.join(', ')}</p>
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

        {activeTab === 'prompts' && (
          <motion.div key="prompts" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
            {prompts.map((p) => (
              <div key={p.type} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => (editingPrompt === p.type ? setEditingPrompt(null) : startEditPrompt(p))}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg p-3 bg-purple-100 dark:bg-purple-950/30"><FileText className="h-6 w-6 text-purple-600" /></div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground">{PROMPT_LABELS[p.type] ?? p.type}</h3>
                      <p className="text-sm text-muted-foreground">{p.isDefault ? 'Using default template' : 'Customised'}</p>
                    </div>
                  </div>
                  <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', editingPrompt === p.type && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {editingPrompt === p.type && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border bg-muted/30">
                      <div className="p-4 space-y-3">
                        <textarea
                          value={promptDraft}
                          onChange={(e) => setPromptDraft(e.target.value)}
                          rows={6}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
                        />
                        <p className="text-xs text-muted-foreground">Placeholders like <code>{'{{title}}'}</code>, <code>{'{{brand}}'}</code>, <code>{'{{category}}'}</code>, <code>{'{{features}}'}</code> are filled per entity.</p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => void savePrompt()} disabled={savingPrompt}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                            <Save className="h-4 w-4" /> {savingPrompt ? 'Saving…' : 'Save Template'}
                          </button>
                          <button onClick={() => setEditingPrompt(null)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
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
