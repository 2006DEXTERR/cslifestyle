'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, Users, TrendingUp, Eye, MousePointer, Bell, Plus, Edit, Trash2, Copy, MoreHorizontal, Search, Filter, Calendar, Clock, CheckCircle2, Settings, BarChart3, Globe, Smartphone, Play, Target, Zap } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { cn } from '@/lib/utils';

const newsletterStats = [
  { date: 'Jun 1', sent: 12500, opened: 4200, clicked: 840 }, { date: 'Jun 2', sent: 0, opened: 320, clicked: 48 },
  { date: 'Jun 3', sent: 0, opened: 180, clicked: 32 }, { date: 'Jun 4', sent: 15000, opened: 4800, clicked: 1020 },
  { date: 'Jun 5', sent: 0, opened: 450, clicked: 72 }, { date: 'Jun 6', sent: 0, opened: 280, clicked: 45 },
  { date: 'Jun 7', sent: 18000, opened: 5670, clicked: 1247 },
];

const campaigns = [
  { id: 1, name: 'Summer Sale 2024', type: 'newsletter', status: 'sent', subject: 'Hot Summer Deals!', sentAt: '2024-06-07', recipients: 45000, opened: 15200, clicked: 3240, revenue: 12450 },
  { id: 2, name: 'Weekly Top Picks', type: 'newsletter', status: 'sent', subject: 'This Week\'s Best Deals', sentAt: '2024-06-04', recipients: 42000, opened: 13800, clicked: 2856, revenue: 8920 },
  { id: 3, name: 'iPhone 15 Launch', type: 'newsletter', status: 'sent', subject: 'iPhone 15 is Here!', sentAt: '2024-06-01', recipients: 48000, opened: 24000, clicked: 4800, revenue: 18450 },
  { id: 4, name: 'Mid-Year Tech Review', type: 'newsletter', status: 'scheduled', scheduledAt: '2024-06-15', recipients: 50000, opened: 0, clicked: 0, revenue: 0 },
];

const pushNotifications = [
  { id: 1, title: 'New iPhone 15 Review', message: 'Check out our complete review!', sentAt: '2024-06-10 09:30', status: 'sent', clicks: 4520, impressions: 28000 },
  { id: 2, title: 'Flash Deal: Sony Headphones', message: 'Sony WH-1000XM5 at lowest price!', sentAt: '2024-06-09 14:00', status: 'sent', clicks: 3840, impressions: 25000 },
];

const subscriberSegments = [
  { id: 1, name: 'All Subscribers', count: 52480, growth: 2.3 },
  { id: 2, name: 'Tech Enthusiasts', count: 18450, growth: 4.5 },
  { id: 3, name: 'Deal Seekers', count: 22100, growth: 5.2 },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'sent': return 'text-green-600 bg-green-50 dark:bg-green-950/30';
    case 'scheduled': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30';
    case 'draft': return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
    default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
  }
};

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<'newsletter' | 'campaigns' | 'push' | 'segments'>('newsletter');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing</h1>
          <p className="text-muted-foreground">Manage newsletters, campaigns, and push notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <Settings className="h-4 w-4" /> Settings
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl">
            <Plus className="h-4 w-4" /> New Campaign
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-950/30"><Users className="h-6 w-6 text-blue-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600"><TrendingUp className="h-4 w-4" />+2.3%</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">52,480</p><p className="text-sm text-muted-foreground">Total Subscribers</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-950/30"><Eye className="h-6 w-6 text-green-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600"><TrendingUp className="h-4 w-4" />+5.2%</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">34.2%</p><p className="text-sm text-muted-foreground">Avg. Open Rate</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-950/30"><MousePointer className="h-6 w-6 text-purple-600" /></div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600"><TrendingUp className="h-4 w-4" />+8.4%</div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">6.8%</p><p className="text-sm text-muted-foreground">Avg. Click Rate</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-orange-100 p-3 dark:bg-orange-950/30"><Target className="h-6 w-6 text-orange-600" /></div>
          </div>
          <div className="mt-4"><p className="text-2xl font-bold text-foreground">$39,820</p><p className="text-sm text-muted-foreground">Revenue from Emails</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          {[
            { id: 'newsletter', label: 'Newsletter', icon: Mail },
            { id: 'campaigns', label: 'Campaigns', icon: Send },
            { id: 'push', label: 'Push Notifications', icon: Bell },
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
                  <ComposedChart data={newsletterStats}>
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
                  <input type="text" placeholder="Subject line..." className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink" />
                  <textarea rows={4} placeholder="Write your newsletter content..." className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink resize-none" />
                  <select className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm">
                    <option>All Subscribers (52,480)</option>
                    <option>Tech Enthusiasts (18,450)</option>
                    <option>Deal Seekers (22,100)</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
                      <Clock className="h-4 w-4" /> Schedule
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                      <Send className="h-4 w-4" /> Send Now
                    </button>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Delivery Rate</span>
                    <span className="font-semibold text-foreground">99.2%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Bounce Rate</span>
                    <span className="font-semibold text-foreground">0.8%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Unsubscribe Rate</span>
                    <span className="font-semibold text-foreground">0.1%</span>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
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
                      <td className="px-4 py-4 text-sm text-muted-foreground">{campaign.recipients > 0 ? campaign.recipients.toLocaleString() : '-'}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{campaign.opened > 0 ? campaign.opened.toLocaleString() : '-'}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{campaign.clicked > 0 ? campaign.clicked.toLocaleString() : '-'}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-foreground">{campaign.revenue > 0 ? `$${campaign.revenue.toLocaleString()}` : '-'}</td>
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
              {subscriberSegments.map((segment) => (
                <div key={segment.id} className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{segment.name}</span>
                    <span className={cn('text-xs font-medium', segment.growth > 0 ? 'text-green-600' : 'text-red-600')}>
                      {segment.growth > 0 ? '+' : ''}{segment.growth}%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{segment.count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">subscribers</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Manage Segments</h3>
                <button className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white">
                  <Plus className="h-4 w-4" /> Create Segment
                </button>
              </div>
              <div className="divide-y divide-border">
                {subscriberSegments.map((segment) => (
                  <div key={segment.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-muted p-2.5"><Users className="h-5 w-5 text-muted-foreground" /></div>
                      <div>
                        <p className="font-medium text-foreground">{segment.name}</p>
                        <p className="text-sm text-muted-foreground">{segment.count.toLocaleString()} subscribers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent">
                        <Eye className="h-4 w-4" /> View
                      </button>
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent">
                        <Edit className="h-4 w-4" /> Edit
                      </button>
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
