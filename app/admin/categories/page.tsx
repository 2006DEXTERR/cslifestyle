'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  X,
  ExternalLink,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  productsCount: number;
  status: 'active' | 'inactive';
  children?: Category[];
}

const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Smartphones',
    slug: 'smartphones',
    parent: null,
    productsCount: 245,
    status: 'active',
    children: [
      { id: '1-1', name: 'Budget Smartphones', slug: 'budget-smartphones', parent: '1', productsCount: 45, status: 'active' },
      { id: '1-2', name: 'Flagship Smartphones', slug: 'flagship-smartphones', parent: '1', productsCount: 32, status: 'active' },
      { id: '1-3', name: 'Gaming Phones', slug: 'gaming-phones', parent: '1', productsCount: 18, status: 'active' },
    ],
  },
  {
    id: '2',
    name: 'Laptops',
    slug: 'laptops',
    parent: null,
    productsCount: 189,
    status: 'active',
    children: [
      { id: '2-1', name: 'Gaming Laptops', slug: 'gaming-laptops', parent: '2', productsCount: 56, status: 'active' },
      { id: '2-2', name: 'Ultrabooks', slug: 'ultrabooks', parent: '2', productsCount: 48, status: 'active' },
      { id: '2-3', name: 'Business Laptops', slug: 'business-laptops', parent: '2', productsCount: 85, status: 'active' },
    ],
  },
  {
    id: '3',
    name: 'Audio',
    slug: 'audio',
    parent: null,
    productsCount: 156,
    status: 'active',
    children: [
      { id: '3-1', name: 'True Wireless Earbuds', slug: 'tws-earbuds', parent: '3', productsCount: 78, status: 'active' },
      { id: '3-2', name: 'Over-Ear Headphones', slug: 'over-ear-headphones', parent: '3', productsCount: 45, status: 'active' },
    ],
  },
  {
    id: '4',
    name: 'Smartwatches',
    slug: 'smartwatches',
    parent: null,
    productsCount: 89,
    status: 'active',
  },
  {
    id: '5',
    name: 'Televisions',
    slug: 'televisions',
    parent: null,
    productsCount: 92,
    status: 'active',
    children: [
      { id: '5-1', name: 'OLED TVs', slug: 'oled-tvs', parent: '5', productsCount: 24, status: 'active' },
      { id: '5-2', name: 'QLED TVs', slug: 'qled-tvs', parent: '5', productsCount: 28, status: 'active' },
    ],
  },
];

export default function CategoriesAdminPage() {
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const renderCategory = (category: Category, depth: number = 0) => {
    const isExpanded = expandedCategories.includes(category.id);
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50 group"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(category.id)}
              className="w-6 h-6 flex items-center justify-center"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Folder className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{category.name}</p>
              <p className="text-xs text-muted-foreground">{category.slug}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {category.productsCount}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  category.status === 'active'
                    ? 'bg-green-500/10 text-green-600'
                    : 'bg-red-500/10 text-red-600'
                }`}
              >
                {category.status}
              </span>
              <div className="hidden group-hover:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => {
                    setEditingCategory(category);
                    setIsEditorOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {hasChildren && isExpanded && (
          <div className="border-l ml-6">
            {category.children!.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage product categories hierarchy</p>
        </div>
        <Button
          className="bg-brand-gradient hover:opacity-90"
          onClick={() => {
            setEditingCategory(null);
            setIsEditorOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search categories..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Tree */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b bg-muted/50">
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
            <span className="flex-1">Category Name</span>
            <span className="w-24 text-right">Products</span>
            <span className="w-20 text-right">Status</span>
            <span className="w-20 text-right">Actions</span>
          </div>
        </div>
        <div className="divide-y">
          {mockCategories.map((category) => renderCategory(category))}
        </div>
      </div>

      {/* Category Editor Drawer */}
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
                <div>
                  <h2 className="text-lg font-semibold">
                    {editingCategory ? 'Edit Category' : 'Add Category'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {editingCategory?.name || 'Create a new category'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditorOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category Name</label>
                  <Input defaultValue={editingCategory?.name} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug</label>
                  <Input defaultValue={editingCategory?.slug} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Parent Category</label>
                  <select className="w-full h-10 rounded-lg border bg-background px-3">
                    <option value="">None (Top Level)</option>
                    {mockCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select className="w-full h-10 rounded-lg border bg-background px-3">
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Display Order</label>
                  <Input type="number" defaultValue="0" />
                </div>
              </div>

              <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t bg-background">
                <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-brand-gradient">Save Category</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
