'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, MousePointer, ShoppingCart, TrendingUp, Link as LinkIcon, BarChart3,
  Upload, Plus, Trash2, Power, CheckCircle2, AlertTriangle, XCircle, Save,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, ComposedChart, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { formatNumber, formatDate } from '@/lib/format';
import {
  affiliateApi, AffiliateApiError,
  type AffiliateStats, type TopProduct, type AffiliateClickRow, type ComplianceItem,
  type AffiliateSettings, type AffiliateCampaign, type RevenueSummary, type RevenueImportRow,
} from '@/lib/api/affiliate';

const DEVICE_COLORS: Record<string, string> = { mobile: '#E91E8F', desktop: '#FF7A00', tablet: '#10b981', unknown: '#94a3b8' };
const rupees = (n: number) => `₹${formatNumber(Math.round(n))}`;

export default function AffiliateAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'clicks' | 'conversions' | 'links'>('overview');
  const [dateRange, setDateRange] = useState('last30days');
  const days = dateRange === 'last7days' ? 7 : 30;

  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [clicks, setClicks] = useState<AffiliateClickRow[]>([]);
  const [compliance, setCompliance] = useState<{ items: ComplianceItem[]; score: number } | null>(null);
  const [settings, setSettings] = useState<AffiliateSettings | null>(null);
  const [campaigns, setCampaigns] = useState<AffiliateCampaign[]>([]);
  const [imports, setImports] = useState<RevenueImportRow[]>([]);

  const load = useCallback(() => {
    affiliateApi.getStats(days).then(setStats).catch(() => setStats(null));
    affiliateApi.getSummary(days).then(setSummary).catch(() => setSummary(null));
    affiliateApi.getTopProducts(days).then(setTopProducts).catch(() => setTopProducts([]));
    affiliateApi.getClicks({ perPage: 25, days }).then((r) => setClicks(r.items)).catch(() => setClicks([]));
    affiliateApi.getCompliance().then(setCompliance).catch(() => setCompliance(null));
    affiliateApi.getSettings().then(setSettings).catch(() => setSettings(null));
    affiliateApi.listCampaigns().then(setCampaigns).catch(() => setCampaigns([]));
    affiliateApi.listImports().then(setImports).catch(() => setImports([]));
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const chartData = (stats?.daily ?? []).map((d) => ({ label: d.date.slice(5), clicks: d.clicks, revenue: d.revenue, conversions: d.conversions }));
  const deviceData = Object.entries(stats?.byDevice ?? {}).map(([name, value]) => ({ name, value, color: DEVICE_COLORS[name] ?? '#94a3b8' }));
  const totalDeviceClicks = deviceData.reduce((s, d) => s + d.value, 0) || 1;
  const sources = Object.entries(stats?.bySource ?? {}).map(([source, c]) => ({ source, clicks: c })).sort((a, b) => b.clicks - a.clicks);
  const totalSourceClicks = sources.reduce((s, x) => s + x.clicks, 0) || 1;

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
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<DollarSign className="h-6 w-6 text-green-600" />} tone="green" value={rupees(summary?.totalRevenue ?? 0)} label="Total Revenue" />
        <StatCard icon={<MousePointer className="h-6 w-6 text-blue-600" />} tone="blue" value={formatNumber(stats?.totalClicks ?? 0)} label="Total Clicks" />
        <StatCard icon={<ShoppingCart className="h-6 w-6 text-purple-600" />} tone="purple" value={formatNumber(stats?.totalConversions ?? 0)} label="Total Conversions" />
        <StatCard icon={<TrendingUp className="h-6 w-6 text-orange-600" />} tone="orange" value={rupees(stats?.epc ?? 0)} label="Avg. EPC" />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 }, { id: 'clicks', label: 'Click Analytics', icon: MousePointer },
            { id: 'conversions', label: 'Revenue', icon: ShoppingCart }, { id: 'links', label: 'Links & Settings', icon: LinkIcon },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn('flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === tab.id ? 'border-brand-pink text-brand-pink' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <Panel title="Earnings Over Time">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="revenue" fill="#E91E8F" opacity={0.6} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Top Performing Products">
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.asin} className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-bold">{index + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{formatNumber(product.clicks)} clicks</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{rupees(product.revenue)}</p>
                        <p className="text-sm text-muted-foreground">{product.conversionRate}% CVR</p>
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && <p className="text-sm text-muted-foreground">No click data yet.</p>}
                </div>
              </Panel>
              <Panel title="Device Distribution">
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
                      <span className="text-sm text-muted-foreground capitalize">{device.name}: {Math.round((device.value / totalDeviceClicks) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </motion.div>
        )}

        {activeTab === 'clicks' && (
          <motion.div key="clicks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <Panel title="Traffic Sources">
              <div className="space-y-3">
                {sources.map((source) => (
                  <div key={source.source} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground capitalize">{source.source}</p>
                      <p className="text-sm text-muted-foreground">{formatNumber(source.clicks)} clicks</p>
                    </div>
                    <p className="font-medium text-foreground">{Math.round((source.clicks / totalSourceClicks) * 100)}%</p>
                  </div>
                ))}
                {sources.length === 0 && <p className="text-sm text-muted-foreground">No clicks recorded yet.</p>}
              </div>
            </Panel>
            <Panel title="Recent Clicks">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                    <tr><th className="px-3 py-2">Product / ASIN</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Device</th><th className="px-3 py-2">Country</th><th className="px-3 py-2">When</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {clicks.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2"><p className="font-medium truncate max-w-xs">{c.productTitle ?? c.asin}</p><p className="text-xs text-muted-foreground">{c.asin}</p></td>
                        <td className="px-3 py-2 capitalize">{c.sourceType}</td>
                        <td className="px-3 py-2 capitalize">{c.deviceType}</td>
                        <td className="px-3 py-2">{c.country ?? '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatDate(c.clickedAt)}</td>
                      </tr>
                    ))}
                    {clicks.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No clicks yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Panel>
          </motion.div>
        )}

        {activeTab === 'conversions' && (
          <motion.div key="conversions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <RevenueSection summary={summary} imports={imports} onImported={load} />
          </motion.div>
        )}

        {activeTab === 'links' && (
          <motion.div key="links" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <SettingsSection settings={settings} onSaved={load} />
            <CampaignsSection campaigns={campaigns} onChanged={load} />
            <ComplianceSection compliance={compliance} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, tone, value, label }: { icon: ReactNode; tone: string; value: string; label: string }) {
  const bg: Record<string, string> = { green: 'bg-green-100 dark:bg-green-950/30', blue: 'bg-blue-100 dark:bg-blue-950/30', purple: 'bg-purple-100 dark:bg-purple-950/30', orange: 'bg-orange-100 dark:bg-orange-950/30' };
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between"><div className={cn('rounded-lg p-3', bg[tone])}>{icon}</div></div>
      <div className="mt-4"><p className="text-2xl font-bold text-foreground">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-6"><h3 className="font-semibold text-foreground mb-4">{title}</h3>{children}</div>;
}

function RevenueSection({ summary, imports, onImported }: { summary: RevenueSummary | null; imports: RevenueImportRow[]; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true); setMsg(null);
    try {
      const csv = await file.text();
      const res = await affiliateApi.importRevenue({ fileName: file.name, source: 'amazon_csv', csv });
      setMsg(`Imported ${res.rowCount} row(s) — ${rupees(res.totalRevenue)}${res.skipped ? ` (${res.skipped} skipped)` : ''}.`);
      onImported();
    } catch (err) {
      setMsg(err instanceof AffiliateApiError ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<DollarSign className="h-6 w-6 text-green-600" />} tone="green" value={rupees(summary?.totalRevenue ?? 0)} label="Revenue" />
        <StatCard icon={<ShoppingCart className="h-6 w-6 text-purple-600" />} tone="purple" value={formatNumber(summary?.totalOrders ?? 0)} label="Orders" />
        <StatCard icon={<MousePointer className="h-6 w-6 text-blue-600" />} tone="blue" value={formatNumber(summary?.totalClicks ?? 0)} label="Attributed Clicks" />
      </div>

      <Panel title="Import Revenue CSV">
        <p className="text-sm text-muted-foreground mb-3">Upload an Amazon Associates earnings CSV (columns: date, asin, category, revenue, orders, clicks).</p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <button disabled={busy} onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          <Upload className="h-4 w-4" /> {busy ? 'Importing…' : 'Upload CSV'}
        </button>
        {msg && <p className="mt-3 text-sm text-foreground">{msg}</p>}
      </Panel>

      <Panel title="Import History">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-muted-foreground">
              <tr><th className="px-3 py-2">File</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Rows</th><th className="px-3 py-2">Revenue</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">When</th></tr>
            </thead>
            <tbody className="divide-y">
              {imports.map((i) => (
                <tr key={i.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{i.fileName}</td>
                  <td className="px-3 py-2">{i.source}</td>
                  <td className="px-3 py-2">{formatNumber(i.rowCount)}</td>
                  <td className="px-3 py-2">{rupees(i.totalRevenue)}</td>
                  <td className="px-3 py-2"><span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600">{i.status}</span></td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(i.createdAt)}</td>
                </tr>
              ))}
              {imports.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No imports yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function SettingsSection({ settings, onSaved }: { settings: AffiliateSettings | null; onSaved: () => void }) {
  const [form, setForm] = useState({ amazonAssociateTag: '', amazonDomain: 'amazon.in', linkCode: 'ogi', disclosureText: '', trackingEnabled: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (settings) setForm({ amazonAssociateTag: settings.amazonAssociateTag, amazonDomain: settings.amazonDomain, linkCode: settings.linkCode, disclosureText: settings.disclosureText ?? '', trackingEnabled: settings.trackingEnabled });
  }, [settings]);
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true); setMsg(null);
    try { await affiliateApi.updateSettings(form); setMsg('Saved.'); onSaved(); }
    catch (err) { setMsg(err instanceof AffiliateApiError ? err.message : 'Save failed.'); }
    finally { setBusy(false); }
  }

  return (
    <Panel title="Affiliate Settings (Associate Tag)">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amazon Associate Tag"><input value={form.amazonAssociateTag} onChange={(e) => set('amazonAssociateTag', e.target.value)} className="w-full h-10 rounded-lg border bg-background px-3" /></Field>
        <Field label="Amazon Domain">
          <select value={form.amazonDomain} onChange={(e) => set('amazonDomain', e.target.value)} className="w-full h-10 rounded-lg border bg-background px-3">
            <option value="amazon.in">amazon.in</option><option value="amazon.com">amazon.com</option>
          </select>
        </Field>
        <Field label="Link Code"><input value={form.linkCode} onChange={(e) => set('linkCode', e.target.value)} className="w-full h-10 rounded-lg border bg-background px-3" /></Field>
        <Field label="Tracking">
          <button onClick={() => set('trackingEnabled', !form.trackingEnabled)} className={cn('inline-flex items-center gap-2 h-10 px-3 rounded-lg border', form.trackingEnabled ? 'text-green-600' : 'text-muted-foreground')}>
            <Power className="h-4 w-4" /> {form.trackingEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </Field>
      </div>
      <Field label="Affiliate Disclosure Text"><textarea value={form.disclosureText} onChange={(e) => set('disclosureText', e.target.value)} className="w-full min-h-[80px] rounded-lg border bg-background p-3 text-sm" /></Field>
      <div className="mt-4 flex items-center gap-3">
        <button disabled={busy} onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save Settings'}</button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </Panel>
  );
}

function CampaignsSection({ campaigns, onChanged }: { campaigns: AffiliateCampaign[]; onChanged: () => void }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    try { await affiliateApi.createCampaign({ name: name.trim(), affiliateTag: tag.trim() || undefined }); setName(''); setTag(''); onChanged(); }
    finally { setBusy(false); }
  }
  async function toggle(c: AffiliateCampaign) { await affiliateApi.updateCampaign(c.id, { isActive: !c.isActive }); onChanged(); }
  async function remove(c: AffiliateCampaign) { if (window.confirm(`Delete campaign "${c.name}"?`)) { await affiliateApi.deleteCampaign(c.id); onChanged(); } }

  return (
    <Panel title="Campaigns">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end mb-4">
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Sale" className="w-full h-10 rounded-lg border bg-background px-3" /></Field>
        <Field label="Override Tag (optional)"><input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="cslifestyle-summer-21" className="w-full h-10 rounded-lg border bg-background px-3" /></Field>
        <button disabled={busy} onClick={add} className="inline-flex items-center gap-2 rounded-lg border px-4 h-10 text-sm font-medium hover:bg-accent"><Plus className="h-4 w-4" /> Add</button>
      </div>
      <div className="space-y-2">
        {campaigns.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
            <div className="flex-1 min-w-0">
              <p className="font-medium">{c.name} <span className="text-xs text-muted-foreground">/{c.slug}</span></p>
              <p className="text-xs text-muted-foreground">{c.clickCount} clicks · tag: {c.affiliateTag ?? 'default'} · use <code>{c.goUrl}</code></p>
            </div>
            <span className={cn('text-xs px-2 py-0.5 rounded-full', c.isActive ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600')}>{c.isActive ? 'active' : 'inactive'}</span>
            <button onClick={() => toggle(c)} className="p-2 rounded-lg hover:bg-muted"><Power className="h-4 w-4" /></button>
            <button onClick={() => remove(c)} className="p-2 rounded-lg hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {campaigns.length === 0 && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
      </div>
    </Panel>
  );
}

function ComplianceSection({ compliance }: { compliance: { items: ComplianceItem[]; score: number } | null }) {
  const icon = (s: string) => s === 'pass' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : s === 'warn' ? <AlertTriangle className="h-5 w-5 text-yellow-600" /> : <XCircle className="h-5 w-5 text-red-600" />;
  return (
    <Panel title={`Affiliate Compliance${compliance ? ` — ${compliance.score}%` : ''}`}>
      <div className="space-y-3">
        {(compliance?.items ?? []).map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
            {icon(item.status)}
            <div><p className="font-medium text-foreground">{item.label}</p><p className="text-sm text-muted-foreground">{item.detail}</p></div>
          </div>
        ))}
        {!compliance && <p className="text-sm text-muted-foreground">Loading…</p>}
      </div>
    </Panel>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1 flex-1"><label className="text-sm font-medium text-foreground">{label}</label>{children}</div>;
}
