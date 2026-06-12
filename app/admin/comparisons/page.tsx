'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Trophy,
  X,
  ChevronRight,
  ChevronDown,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const mockComparisons = [
  {
    id: '1',
    title: 'iPhone 15 Pro Max vs Samsung Galaxy S24 Ultra',
    productA: { name: 'iPhone 15 Pro Max', brand: 'Apple' },
    productB: { name: 'Galaxy S24 Ultra', brand: 'Samsung' },
    winner: 'tie',
    status: 'Published',
    views: 18950,
    updatedAt: '2024-01-20',
  },
  {
    id: '2',
    title: 'boAt vs Noise: Which Earbuds Brand is Better?',
    productA: { name: 'boAt Airdopes 441', brand: 'boAt' },
    productB: { name: 'ColorFit Pro 4 Alpha', brand: 'Noise' },
    winner: 'A',
    status: 'Published',
    views: 12450,
    updatedAt: '2024-01-18',
  },
  {
    id: '3',
    title: 'MacBook Pro 14" vs Dell XPS 15',
    productA: { name: 'MacBook Pro 14"', brand: 'Apple' },
    productB: { name: 'Dell XPS 15', brand: 'Dell' },
    winner: 'B',
    status: 'Draft',
    views: 0,
    updatedAt: '2024-01-15',
  },
];

export default function ComparisonsAdminPage() {
  const [isBuilderOpen, setIsBuilderOpen] = React.useState(false);
  const [editingComparison, setEditingComparison] = React.useState<typeof mockComparisons[0] | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comparisons</h1>
          <p className="text-muted-foreground">Manage product comparison pages</p>
        </div>
        <Button
          className="bg-brand-gradient hover:opacity-90"
          onClick={() => {
            setEditingComparison(null);
            setIsBuilderOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Comparison
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search comparisons..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Comparisons Table */}
      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Products Compared</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Winner</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Views</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Updated</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockComparisons.map((comparison) => (
                <tr key={comparison.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-muted" />
                        <div>
                          <p className="text-sm font-medium">{comparison.productA.name}</p>
                          <p className="text-xs text-muted-foreground">{comparison.productA.brand}</p>
                        </div>
                      </div>
                      <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-muted" />
                        <div>
                          <p className="text-sm font-medium">{comparison.productB.name}</p>
                          <p className="text-xs text-muted-foreground">{comparison.productB.brand}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Trophy
                        className={`w-4 h-4 ${
                          comparison.winner === 'tie'
                            ? 'text-gray-400'
                            : 'text-yellow-500'
                        }`}
                      />
                      <span className="text-sm">
                        {comparison.winner === 'tie'
                          ? 'Tie'
                          : comparison.winner === 'A'
                          ? comparison.productA.brand
                          : comparison.productB.brand}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        comparison.status === 'Published'
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-yellow-500/10 text-yellow-600'
                      }`}
                    >
                      {comparison.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{comparison.views.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(comparison.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingComparison(comparison);
                          setIsBuilderOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison Builder */}
      <AnimatePresence>
        {isBuilderOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setIsBuilderOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 h-screen w-full max-w-3xl bg-background border-l overflow-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
                <h2 className="text-lg font-semibold">
                  {editingComparison ? 'Edit Comparison' : 'Create Comparison'}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsBuilderOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 space-y-8">
                {/* Product Selection */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Product A</h3>
                    <Button variant="outline" className="w-full h-24">
                      <div className="w-12 h-12 rounded-lg bg-muted mr-3" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Select Product</p>
                        <p className="text-xs text-muted-foreground">Search products...</p>
                      </div>
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Product B</h3>
                    <Button variant="outline" className="w-full h-24">
                      <div className="w-12 h-12 rounded-lg bg-muted mr-3" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Select Product</p>
                        <p className="text-xs text-muted-foreground">Search products...</p>
                      </div>
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    </Button>
                  </div>
                </div>

                {/* Comparison Matrix */}
                <div>
                  <h3 className="font-semibold mb-4">Comparison Categories</h3>
                  <div className="space-y-3">
                    {['Display', 'Camera', 'Performance', 'Battery', 'Value'].map((cat) => (
                      <div key={cat} className="grid grid-cols-[1fr_auto_1fr] gap-4 p-4 rounded-lg bg-muted/50">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{cat}</label>
                          <Input placeholder={`${cat} verdict for Product A`} />
                        </div>
                        <select className="h-10 rounded-lg border bg-background px-3 self-end">
                          <option>Tie</option>
                          <option>Product A</option>
                          <option>Product B</option>
                        </select>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{cat}</label>
                          <Input placeholder={`${cat} verdict for Product B`} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </div>

                {/* Verdict */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Final Verdict</label>
                  <textarea className="w-full min-h-[150px] rounded-lg border bg-background p-3 text-sm" />
                  <select className="h-10 rounded-lg border bg-background px-3">
                    <option>Select Winner</option>
                    <option>Product A</option>
                    <option>Product B</option>
                    <option>Tie</option>
                  </select>
                </div>

                {/* SEO */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Meta Description</label>
                  <textarea className="w-full h-20 rounded-lg border bg-background p-3 text-sm" />
                </div>
              </div>

              <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t bg-background">
                <Button variant="outline" onClick={() => setIsBuilderOpen(false)}>
                  Cancel
                </Button>
                <Button variant="outline">
                  Save Draft
                </Button>
                <Button className="bg-brand-gradient">Publish</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
