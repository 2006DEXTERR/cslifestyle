'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, Users, TrendingUp, Eye, MousePointer, Plus, Edit, Clock, CheckCircle2, Settings, Target, Trash2, AlertTriangle, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, ComposedChart } from 'recharts';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import { marketingApi, type MarketingDashboard, type SubscriberStats, type Campaign } from '@/lib/api/marketing';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'sent': return 'text-green-600 bg-green-50 dark:bg-green-950/30';
    case 'sending': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30';
    case 'scheduled': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30';
    case 'failed': return 'text-red-600 bg-red-50 dark:bg-red-950/30';
    case 'draft': return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
    default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
  }
};

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<'newsletter' | 'campaigns' | 'segments'>('newsletter');
  const [dashboard, setDashboard] = useState<MarketingDashboard | null>(null);
  const [subStats, setSubStats] = useState<SubscriberStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compose form.
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [segment, setSegment] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [d, s, c] = await Promise.all([
        marketingApi.getDashboard(),
        marketingApi.getSubscriberStats(),
        marketingApi.listCampaigns({ perPage: 50 }),
      ]);
      setDashboard(d);
      setSubStats(s);
      setCampaigns(c.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load marketing data');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const flash = (m: string) => { setMessage(m); window.setTimeout(() => setMessage(null), 4000); };

  const compose = async (mode: 'send' | 'draft') => {
    if (!subject.trim()) { setError('Add a subject line'); return; }
    setBusy(true);
    setError(null);
    try {
      const campaign = await marketingApi.createCampaign({ name: subject.trim(), subject: subject.trim(), template: 'newsletter', content, segmentTag: segment || undefined });
      if (mode === 'send') {
        await marketingApi.sendCampaign(campaign.id);
        flash('Newsletter is sending to subscribers.');
      } else {
        flash('Saved as a draft campaign.');
      }
      setSubject(''); setContent(''); setSegment('');
      await refresh();
      setActiveTab('campaigns');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create campaign');
    } finally {
      setBusy(false);
    }
  };

  const removeCampaign = async (id: string) => {
    try { await marketingApi.deleteCampaign(id); await refresh(); } catch (err) { setError(err instanceof Error ? err.message : 'Delete failed'); }
  };

  const c = dashboard?.cards;
  const delivery = dashboard?.deliveryRate ?? 0;
  const bounceRate = subStats && subStats.total > 0 ? Number(((subStats.bounced / subStats.total) * 100).toFixed(1)) : 0;
  const unsubRate = subStats && subStats.total > 0 ? Number(((subStats.unsubscribed / subStats.total) * 100).toFixed(1)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing</h1>
          <p className="text-muted-foreground">Manage newsletters, campaigns, and push notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <Settings className="h-4 w-4" /> Settings
          </button>
          <button onClick={() => { setActiveTab('newsletter'); setSubject(''); setContent(''); }} className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl">
            <Plus className="h-4 w-4" /> New Campaign
          </button>
        </div>
      </div>

      {message && <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-700 dark:text-green-400"><Check className="h-4 w-4" /> {message}</div>}
      {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600"><AlertTriangle className="h-4 w-4" /> {error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-950/30"><Users className="h-6 w-6 text-blue-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600"><TrendingUp className="h-4 w-4" />{c ? `${formatNumber(c.activeSubscribers)} active` : ''}</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">{c ? formatNumber(c.totalSubscribers) : '—'}</p><p className="text-sm text-muted-foreground">Total Subscribers</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-950/30"><Eye className="h-6 w-6 text-green-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600"><TrendingUp className="h-4 w-4" />{c ? `${c.campaignsSent} sent` : ''}</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">{c ? `${c.avgOpenRate}%` : '—'}</p><p className="text-sm text-muted-foreground">Avg. Open Rate</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-950/30"><MousePointer className="h-6 w-6 text-purple-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600"><TrendingUp className="h-4 w-4" />{`${delivery}% delivered`}</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">{c ? `${c.avgClickRate}%` : '—'}</p><p className="text-sm text-muted-foreground">Avg. Click Rate</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-orange-100 p-3 dark:bg-orange-950/30"><Target className="h-6 w-6 text-orange-600" /></div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">{subStats ? formatNumber(subStats.active) : '—'}</p><p className="text-sm text-muted-foreground">Confirmed Subscribers</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          {[
            { id: 'newsletter', label: 'Newsletter', icon: Mail },
            { id: 'campaigns', label: 'Campaigns', icon: Send },
            { id: 'segments', label: 'Audience Segments', icon: Users },
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
        {activeTab === 'newsletter' && (
          <motion.div key="newsletter" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Newsletter Performance</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dashboard?.performance ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="sent" fill="#E91E8F" opacity={0.6} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="opened" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="clicked" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Compose Newsletter</h3>
                <div className="space-y-4">
                  <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line..." className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink" />
                  <textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your newsletter content..." className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink resize-none" />
                  <select value={segment} onChange={(e) => setSegment(e.target.value)} className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm">
                    <option value="">All Subscribers ({subStats ? formatNumber(subStats.active) : 0})</option>
                    {(subStats?.segments ?? []).map((s) => <option key={s.name} value={s.name}>{s.name} ({formatNumber(s.count)})</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <button onClick={() => void compose('draft')} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
                      <Clock className="h-4 w-4" /> Save Draft
                    </button>
                    <button onClick={() => void compose('send')} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                      <Send className="h-4 w-4" /> {busy ? 'Working…' : 'Send Now'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Delivery Rate</span>
                    <span className="font-semibold text-foreground">{delivery}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Bounce Rate</span>
                    <span className="font-semibold text-foreground">{bounceRate}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Unsubscribe Rate</span>
                    <span className="font-semibold text-foreground">{unsubRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'campaigns' && (
          <motion.div key="campaigns" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Sent</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Opened</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Clicked</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaigns.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No campaigns yet. Compose one in the Newsletter tab.</td></tr>}
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-muted/30">
                      <td className="px-4 py-4">
                        <p className="font-medium text-foreground">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize', getStatusColor(campaign.status))}>
                          {campaign.status === 'sent' && <CheckCircle2 className="h-3 w-3" />}
                          {campaign.status === 'scheduled' && <Clock className="h-3 w-3" />}
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{campaign.recipientCount > 0 ? formatNumber(campaign.recipientCount) : '-'}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{campaign.openedCount > 0 ? `${formatNumber(campaign.openedCount)} (${campaign.openRate}%)` : '-'}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{campaign.clickedCount > 0 ? `${formatNumber(campaign.clickedCount)} (${campaign.clickRate}%)` : '-'}</td>
                      <td className="px-4 py-4">
                        {(campaign.status === 'draft' || campaign.status === 'failed') && (
                          <button onClick={() => void removeCampaign(campaign.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
        {activeTab === 'segments' && (
          <motion.div key="segments" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-foreground">All Subscribers</span></div>
                <p className="text-2xl font-bold text-foreground">{subStats ? formatNumber(subStats.active) : '—'}</p>
                <p className="text-xs text-muted-foreground">subscribers</p>
              </div>
              {(subStats?.segments ?? []).slice(0, 2).map((segment) => (
                <div key={segment.name} className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-foreground">{segment.name}</span></div>
                  <p className="text-2xl font-bold text-foreground">{formatNumber(segment.count)}</p>
                  <p className="text-xs text-muted-foreground">subscribers</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Manage Segments</h3>
              </div>
              <div className="divide-y divide-border">
                {(subStats?.segments ?? []).length === 0 && <div className="p-6 text-sm text-muted-foreground">No tag segments yet. Tag subscribers to create segments.</div>}
                {(subStats?.segments ?? []).map((segment) => (
                  <div key={segment.name} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-muted p-2.5"><Users className="h-5 w-5 text-muted-foreground" /></div>
                      <div>
                        <p className="font-medium text-foreground">{segment.name}</p>
                        <p className="text-sm text-muted-foreground">{formatNumber(segment.count)} subscribers</p>
                      </div>
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
