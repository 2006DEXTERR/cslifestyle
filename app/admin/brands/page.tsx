'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Star,
  X,
  Globe,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const mockBrands = [
  {
    id: '1',
    name: 'Apple',
    slug: 'apple',
    logo: null,
    productsCount: 45,
    avgRating: 4.8,
    status: 'active',
  },
  {
    id: '2',
    name: 'Samsung',
    slug: 'samsung',
    logo: null,
    productsCount: 89,
    avgRating: 4.6,
    status: 'active',
  },
  {
    id: '3',
    name: 'Sony',
    slug: 'sony',
    logo: null,
    productsCount: 34,
    avgRating: 4.7,
    status: 'active',
  },
  {
    id: '4',
    name: 'boAt',
    slug: 'boat',
    logo: null,
    productsCount: 67,
    avgRating: 4.2,
    status: 'active',
  },
  {
    id: '5',
    name: 'Noise',
    slug: 'noise',
    logo: null,
    productsCount: 52,
    avgRating: 4.1,
    status: 'active',
  },
  {
    id: '6',
    name: 'OnePlus',
    slug: 'oneplus',
    logo: null,
    productsCount: 28,
    avgRating: 4.5,
    status: 'active',
  },
  {
    id: '7',
    name: 'Dell',
    slug: 'dell',
    logo: null,
    productsCount: 43,
    avgRating: 4.4,
    status: 'active',
  },
  {
    id: '8',
    name: 'LG',
    slug: 'lg',
    logo: null,
    productsCount: 56,
    avgRating: 4.5,
    status: 'active',
  },
];

export default function BrandsAdminPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingBrand, setEditingBrand] = React.useState<typeof mockBrands[0] | null>(null);
  const [selectedBrand, setSelectedBrand] = React.useState<typeof mockBrands[0] | null>(null);

  const filteredBrands = mockBrands.filter(
    (brand) =>
      brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Brands</h1>
          <p className="text-muted-foreground">Manage brand profiles and information</p>
        </div>
        <Button
          className="bg-brand-gradient hover:opacity-90"
          onClick={() => {
            setEditingBrand(null);
            setIsEditorOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Brand
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search brands..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Brands Grid */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredBrands.map((brand, index) => (
          <motion.div
            key={brand.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-xl border bg-card hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedBrand(brand)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                <span className="text-2xl font-bold">{brand.name[0]}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingBrand(brand);
                    setIsEditorOpen(true);
                  }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="font-semibold mb-1">{brand.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{brand.slug}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">{brand.productsCount}</p>
                <p className="text-xs text-muted-foreground">Products</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-bold">{brand.avgRating}</span>
                </div>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Brand Profile Drawer */}
      <AnimatePresence>
        {selectedBrand && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setSelectedBrand(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 h-screen w-full max-w-lg bg-background border-l overflow-auto"
            >
              <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Brand Profile</h2>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedBrand(null)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                    <span className="text-3xl font-bold">{selectedBrand.name[0]}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedBrand.name}</h3>
                    <p className="text-sm text-muted-foreground">/{selectedBrand.slug}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold">{selectedBrand.productsCount}</p>
                    <p className="text-xs text-muted-foreground">Products</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-2xl font-bold">{selectedBrand.avgRating}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold">12.5K</p>
                    <p className="text-xs text-muted-foreground">Page Views</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <h3 className="font-medium">Quick Actions</h3>
                  <Button variant="outline" className="w-full justify-start">
                    <Globe className="w-4 h-4 mr-2" />
                    View Public Page
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </div>

                {/* Related Products */}
                <div>
                  <h3 className="font-medium mb-3">Top Products</h3>
                  <div className="space-y-2">
                    {['iPhone 15 Pro Max', 'MacBook Pro M3', 'AirPods Pro 2'].map((name) => (
                      <div key={name} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
                        <div className="w-10 h-10 rounded-lg bg-muted" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <p className="text-xs text-muted-foreground">{selectedBrand.name}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Brand Editor Drawer */}
      <AnimatePresence>
        {isEditorOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setIsEditorOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 h-screen w-full max-w-lg bg-background border-l overflow-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
                <h2 className="text-lg font-semibold">
                  {editingBrand ? 'Edit Brand' : 'Add Brand'}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsEditorOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center">
                    <span className="text-4xl font-bold">{editingBrand?.name[0] || '?'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand Name</label>
                  <Input defaultValue={editingBrand?.name} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug</label>
                  <Input defaultValue={editingBrand?.slug} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Website URL</label>
                  <Input placeholder="https://brand.com" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select className="w-full h-10 rounded-lg border bg-background px-3">
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>

              <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t bg-background">
                <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-brand-gradient">Save Brand</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
