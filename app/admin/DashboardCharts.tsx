'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

/**
 * Admin dashboard charts — extracted so the heavy `recharts` bundle (~100kb) is
 * dynamically imported (ssr:false) only after the dashboard shell paints, instead of
 * blocking the initial admin JS. Layout/markup are unchanged from the inline version.
 */
export interface DashboardChartsProps {
  trafficData: { month: string; traffic: number; users: number }[];
  contentGrowthData: { month: string; products: number; guides: number; comparisons: number }[];
  affiliateClicksData: { day: string; clicks: number }[];
  categoryDistributionData: { name: string; value: number; color: string }[];
}

export default function DashboardCharts({
  trafficData,
  contentGrowthData,
  affiliateClicksData,
  categoryDistributionData,
}: DashboardChartsProps) {
  return (
    <>
      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Traffic Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border bg-card"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Traffic Trend</h2>
              <p className="text-sm text-muted-foreground">Page views and users (last 30 days)</p>
            </div>
          </div>
          <div className="h-[250px]">
            {trafficData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No traffic data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="traffic" stroke="#E91E8F" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="users" stroke="#FF7A00" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Content Growth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-xl border bg-card"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Content Growth</h2>
              <p className="text-sm text-muted-foreground">Products, guides, comparisons</p>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={contentGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Legend />
                <Area type="monotone" dataKey="products" stackId="1" stroke="#E91E8F" fill="#E91E8F" fillOpacity={0.2} />
                <Area type="monotone" dataKey="guides" stackId="1" stroke="#FF4D4D" fill="#FF4D4D" fillOpacity={0.2} />
                <Area type="monotone" dataKey="comparisons" stackId="1" stroke="#FFC107" fill="#FFC107" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Second Row Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Affiliate Clicks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-xl border bg-card"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Affiliate Clicks</h2>
            <p className="text-sm text-muted-foreground">Last 7 days</p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={affiliateClicksData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="clicks" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#E91E8F" />
                    <stop offset="50%" stopColor="#FF4D4D" />
                    <stop offset="100%" stopColor="#FFC107" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-xl border bg-card"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Category Distribution</h2>
            <p className="text-sm text-muted-foreground">Published products by category</p>
          </div>
          <div className="h-[200px]">
            {categoryDistributionData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No products yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryDistributionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {categoryDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-xl border bg-card"
        >
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { name: 'Add Product', href: '/admin/products/new' },
              { name: 'Create Guide', href: '/admin/guides/new' },
              { name: 'New Comparison', href: '/admin/comparisons/new' },
              { name: 'Add Author', href: '/admin/authors/new' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">{action.name}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}
