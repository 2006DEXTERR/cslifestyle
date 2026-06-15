'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatNumber } from '@/lib/format';
import {
  Package,
  FolderTree,
  Building2,
  BookOpen,
  GitCompare,
  Users,
  TrendingUp,
  MousePointer,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
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

// Mock data for charts
const trafficData = [
  { month: 'Jan', traffic: 450000, users: 180000 },
  { month: 'Feb', traffic: 520000, users: 210000 },
  { month: 'Mar', traffic: 480000, users: 195000 },
  { month: 'Apr', traffic: 610000, users: 245000 },
  { month: 'May', traffic: 580000, users: 230000 },
  { month: 'Jun', traffic: 720000, users: 290000 },
];

const contentGrowthData = [
  { month: 'Jan', products: 85, guides: 42, comparisons: 18 },
  { month: 'Feb', products: 92, guides: 48, comparisons: 22 },
  { month: 'Mar', products: 98, guides: 52, comparisons: 25 },
  { month: 'Apr', products: 105, guides: 58, comparisons: 28 },
  { month: 'May', products: 112, guides: 65, comparisons: 32 },
  { month: 'Jun', products: 120, guides: 72, comparisons: 35 },
];

const affiliateClicksData = [
  { day: 'Mon', clicks: 1250 },
  { day: 'Tue', clicks: 1480 },
  { day: 'Wed', clicks: 1320 },
  { day: 'Thu', clicks: 1650 },
  { day: 'Fri', clicks: 1890 },
  { day: 'Sat', clicks: 2100 },
  { day: 'Sun', clicks: 1950 },
];

const categoryDistributionData = [
  { name: 'Smartphones', value: 35, color: '#E91E8F' },
  { name: 'Laptops', value: 25, color: '#FF4D4D' },
  { name: 'Audio', value: 20, color: '#FF7A00' },
  { name: 'Wearables', value: 12, color: '#FFC107' },
  { name: 'Others', value: 8, color: '#888' },
];

const recentProducts = [
  { id: '1', name: 'iPhone 15 Pro Max', category: 'Smartphones', brand: 'Apple', price: 134900, status: 'Published' },
  { id: '2', name: 'Samsung Galaxy S24 Ultra', category: 'Smartphones', brand: 'Samsung', price: 129999, status: 'Published' },
  { id: '3', name: 'MacBook Pro 14" M3', category: 'Laptops', brand: 'Apple', price: 169900, status: 'Draft' },
  { id: '4', name: 'Sony WH-1000XM5', category: 'Audio', brand: 'Sony', price: 29990, status: 'Published' },
];

const recentGuides = [
  { id: '1', title: 'Best Smartphones Under Rs 30,000', author: 'Priya Sharma', status: 'Published', views: 45230 },
  { id: '2', title: 'Best Wireless Earbuds for Every Budget', author: 'Rahul Verma', status: 'Published', views: 32150 },
  { id: '3', title: 'Complete TV Buying Guide', author: 'Vikram Singh', status: 'Draft', views: 0 },
];

const kpis = [
  { name: 'Total Products', value: '1,245', change: '+12.5%', trend: 'up', icon: Package },
  { name: 'Categories', value: '48', change: '+4', trend: 'up', icon: FolderTree },
  { name: 'Brands', value: '156', change: '+8', trend: 'up', icon: Building2 },
  { name: 'Guides', value: '324', change: '+15', trend: 'up', icon: BookOpen },
  { name: 'Comparisons', value: '89', change: '+6', trend: 'up', icon: GitCompare },
  { name: 'Authors', value: '52', change: '+3', trend: 'up', icon: Users },
  { name: 'Monthly Traffic', value: '2.4M', change: '+18.2%', trend: 'up', icon: TrendingUp },
  { name: 'Affiliate Clicks', value: '145K', change: '+22.8%', trend: 'up', icon: MousePointer },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's an overview of your platform.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-xl border bg-card"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                <kpi.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <span
                className={`text-xs font-medium flex items-center gap-0.5 ${
                  kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {kpi.trend === 'up' ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {kpi.change}
              </span>
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.name}</p>
          </motion.div>
        ))}
      </div>

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
              <p className="text-sm text-muted-foreground">Monthly visitors and users</p>
            </div>
            <select className="h-8 rounded-lg border bg-background px-2 text-sm">
              <option>Last 6 months</option>
              <option>Last 12 months</option>
            </select>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="traffic"
                  stroke="#E91E8F"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#FF7A00"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="products"
                  stackId="1"
                  stroke="#E91E8F"
                  fill="#E91E8F"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="guides"
                  stackId="1"
                  stroke="#FF4D4D"
                  fill="#FF4D4D"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="comparisons"
                  stackId="1"
                  stroke="#FFC107"
                  fill="#FFC107"
                  fillOpacity={0.2}
                />
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
            <p className="text-sm text-muted-foreground">Weekly performance</p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={affiliateClicksData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
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
            <p className="text-sm text-muted-foreground">Products by category</p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
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

      {/* Tables Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border bg-card"
        >
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Recent Products</h2>
            <Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {recentProducts.map((product) => (
              <div key={product.id} className="p-4 flex items-center gap-4 hover:bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-muted" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.category}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    product.status === 'Published'
                      ? 'bg-green-500/10 text-green-600'
                      : 'bg-yellow-500/10 text-yellow-600'
                  }`}
                >
                  {product.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Guides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border bg-card"
        >
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Recent Guides</h2>
            <Link href="/admin/guides" className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {recentGuides.map((guide) => (
              <div key={guide.id} className="p-4 flex items-center gap-4 hover:bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{guide.title}</p>
                  <p className="text-xs text-muted-foreground">
                    by {guide.author} • {guide.views > 0 ? `${formatNumber(guide.views)} views` : 'Draft'}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    guide.status === 'Published'
                      ? 'bg-green-500/10 text-green-600'
                      : 'bg-yellow-500/10 text-yellow-600'
                  }`}
                >
                  {guide.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
