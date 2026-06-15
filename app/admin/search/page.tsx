'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Link2, BarChart3, Plus, Trash2, RefreshCw, Check, X, AlertTriangle, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import { discoveryApi, type Synonym, type RecommendationRule, type InternalLink } from '@/lib/api/discovery';
import { analyticsApi, type SearchAnalytics } from '@/lib/api/analytics';

const RULE_TYPES = ['category', 'brand', 'price', 'rating', 'trending', 'affiliate', 'related_products', 'similar'];

export default function DiscoveryAdminPage() {
  const [tab, setTab] = useState<'synonyms' | 'rules' | 'links' | 'analytics'>('synonyms');
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [rules, setRules] = useState<RecommendationRule[]>([]);
  const [links, setLinks] = useState<InternalLink[]>([]);
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [broken, setBroken] = useState<{ sourceType: string; sourceId: string; url: string }[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Forms.
  const [synTerm, setSynTerm] = useState('');
  const [synList, setSynList] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('category');
  const [ruleWeight, setRuleWeight] = useState('2');
  const [linkSourceType, setLinkSourceType] = useState<'guide' | 'comparison'>('guide');
  const [linkSourceId, setLinkSourceId] = useState('');

  const flash = (m: string) => { setMessage(m); window.setTimeout(() => setMessage(null), 4000); };

  const refresh = useCallback(async () => {
    try {
      const [s, r, l] = await Promise.all([discoveryApi.listSynonyms({ perPage: 100 }), discoveryApi.listRules({ perPage: 100 }), discoveryApi.listLinks({ perPage: 100 })]);
      setSynonyms(s.items); setRules(r.items); setLinks(l.items);
      setAnalytics(await analyticsApi.getSearch('last30days').catch(() => null));
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load'); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const wrap = (fn: () => Promise<void>, ok: string) => async () => {
    try { await fn(); flash(ok); await refresh(); } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); }
  };

  const addSynonym = wrap(async () => {
    if (!synTerm.trim() || !synList.trim()) throw new Error('Enter a term and synonyms');
    await discoveryApi.createSynonym(synTerm.trim(), synList.split(',').map((s) => s.trim()).filter(Boolean));
    setSynTerm(''); setSynList('');
  }, 'Synonym added.');
  const addRule = wrap(async () => {
    if (!ruleName.trim()) throw new Error('Enter a rule name');
    await discoveryApi.createRule({ name: ruleName.trim(), type: ruleType, weight: Number(ruleWeight) || 1 });
    setRuleName('');
  }, 'Rule added.');
  const genLinks = wrap(async () => {
    if (!linkSourceId.trim()) throw new Error('Enter a source id');
    await discoveryApi.generateLinks(linkSourceType, linkSourceId.trim());
    setLinkSourceId('');
  }, 'Suggestions generated.');
  const scanBroken = async () => {
    try { const r = await discoveryApi.detectBroken(); setBroken(r.broken); flash(`Scanned ${r.scanned} — ${r.broken.length} broken link(s).`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Scan failed'); }
  };
  const reindex = async () => {
    try { const r = await discoveryApi.reindex(); flash(`Search index rebuilt (${r.indexed} entries).`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Reindex failed'); }
  };

  const statusColor = (s: string) => s === 'approved' ? 'text-green-600 bg-green-50 dark:bg-green-950/30' : s === 'rejected' ? 'text-red-600 bg-red-50 dark:bg-red-950/30' : s === 'broken' ? 'text-orange-600 bg-orange-50 dark:bg-orange-950/30' : 'text-blue-600 bg-blue-50 dark:bg-blue-950/30';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Discovery &amp; Search</h1>
          <p className="text-muted-foreground">Synonyms, recommendation rules, internal links and search analytics</p>
        </div>
        <button onClick={() => void reindex()} className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl">
          <RefreshCw className="h-4 w-4" /> Rebuild Index
        </button>
      </div>

      {message && <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-700 dark:text-green-400"><Check className="h-4 w-4" /> {message}</div>}
      {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600"><AlertTriangle className="h-4 w-4" /> {error}</div>}

      <div className="border-b border-border">
        <nav className="flex gap-4">
          {[
            { id: 'synonyms', label: 'Synonyms', icon: Sparkles },
            { id: 'rules', label: 'Recommendation Rules', icon: Search },
            { id: 'links', label: 'Internal Links', icon: Link2 },
            { id: 'analytics', label: 'Search Analytics', icon: BarChart3 },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={cn('flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors', tab === t.id ? 'border-brand-pink text-brand-pink' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'synonyms' && (
          <motion.div key="synonyms" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row gap-2">
              <input value={synTerm} onChange={(e) => setSynTerm(e.target.value)} placeholder="Term (e.g. earphones)" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink" />
              <input value={synList} onChange={(e) => setSynList(e.target.value)} placeholder="Synonyms, comma-separated (earbuds, headphones)" className="flex-[2] rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink" />
              <button onClick={() => void addSynonym()} className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add</button>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50"><tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Term</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Synonyms</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {synonyms.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">No synonyms yet.</td></tr>}
                  {synonyms.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{s.term}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.synonyms.join(', ')}</td>
                      <td className="px-4 py-3 text-right"><button onClick={wrap(async () => { await discoveryApi.deleteSynonym(s.id); }, 'Deleted.')} className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-3.5 w-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 'rules' && (
          <motion.div key="rules" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row gap-2">
              <input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Rule name" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink" />
              <select value={ruleType} onChange={(e) => setRuleType(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">{RULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
              <input value={ruleWeight} onChange={(e) => setRuleWeight(e.target.value)} type="number" step="0.5" className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Weight" />
              <button onClick={() => void addRule()} className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add</button>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50"><tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Active</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {rules.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">No rules yet — defaults apply.</td></tr>}
                  {rules.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{r.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.type}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.weight}</td>
                      <td className="px-4 py-3"><button onClick={wrap(async () => { await discoveryApi.updateRule(r.id, { isActive: !r.isActive }); }, 'Updated.')} className={cn('rounded-full px-2.5 py-1 text-xs font-medium', r.isActive ? 'text-green-600 bg-green-50 dark:bg-green-950/30' : 'text-gray-600 bg-gray-50 dark:bg-gray-800')}>{r.isActive ? 'Active' : 'Inactive'}</button></td>
                      <td className="px-4 py-3 text-right"><button onClick={wrap(async () => { await discoveryApi.deleteRule(r.id); }, 'Deleted.')} className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-3.5 w-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 'links' && (
          <motion.div key="links" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row gap-2 items-stretch">
              <select value={linkSourceType} onChange={(e) => setLinkSourceType(e.target.value as 'guide' | 'comparison')} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="guide">Guide</option><option value="comparison">Comparison</option></select>
              <input value={linkSourceId} onChange={(e) => setLinkSourceId(e.target.value)} placeholder="Source id" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink" />
              <button onClick={() => void genLinks()} className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white"><Wand2 className="h-4 w-4" /> Generate</button>
              <button onClick={() => void scanBroken()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"><AlertTriangle className="h-4 w-4" /> Detect Broken</button>
            </div>
            {broken && <div className="rounded-xl border border-border bg-card p-4 text-sm">{broken.length === 0 ? <span className="text-green-600">No broken internal links found.</span> : <ul className="space-y-1">{broken.map((b, i) => <li key={i} className="text-orange-600">{b.sourceType} · {b.url}</li>)}</ul>}</div>}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50"><tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Target / Anchor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Review</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {links.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">No internal-link suggestions yet — generate from a guide/comparison.</td></tr>}
                  {links.map((l) => (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{l.sourceType}</td>
                      <td className="px-4 py-3 text-sm"><span className="font-medium text-foreground">{l.anchorText}</span><span className="block text-xs text-muted-foreground">{l.targetUrl}</span></td>
                      <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-1 text-xs font-medium capitalize', statusColor(l.status))}>{l.status}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={wrap(async () => { await discoveryApi.setLinkStatus(l.id, 'approved'); }, 'Approved.')} title="Approve" className="rounded-lg border border-green-200 p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"><Check className="h-3.5 w-3.5" /></button>
                          <button onClick={wrap(async () => { await discoveryApi.setLinkStatus(l.id, 'rejected'); }, 'Rejected.')} title="Reject" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-accent"><X className="h-3.5 w-3.5" /></button>
                          <button onClick={wrap(async () => { await discoveryApi.deleteLink(l.id); }, 'Deleted.')} title="Delete" className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Top Searches</h3>
              <div className="space-y-2">
                {(analytics?.topSearches ?? []).length === 0 && <p className="text-sm text-muted-foreground">No search data yet.</p>}
                {(analytics?.topSearches ?? []).map((s) => (
                  <div key={s.query} className="flex items-center justify-between text-sm"><span className="text-foreground">{s.query}</span><span className="text-muted-foreground">{formatNumber(s.count)} · {s.avgResults} results</span></div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Zero-Result Searches</h3>
              <div className="space-y-2">
                {(analytics?.zeroResultSearches ?? []).length === 0 && <p className="text-sm text-muted-foreground">No zero-result searches — nice!</p>}
                {(analytics?.zeroResultSearches ?? []).map((s) => (
                  <div key={s.query} className="flex items-center justify-between text-sm"><span className="text-orange-600">{s.query}</span><span className="text-muted-foreground">{formatNumber(s.count)}×</span></div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
