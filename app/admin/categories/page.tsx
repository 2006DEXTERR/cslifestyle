'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit, Trash2, ChevronRight, ChevronDown, Folder, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { catalogApi, CatalogApiError, type CatalogCategory } from '@/lib/api/catalog';

interface TreeNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  productsCount: number;
  status: 'active' | 'inactive';
  raw: CatalogCategory;
  children: TreeNode[];
}

function buildTree(cats: CatalogCategory[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  for (const c of cats) {
    nodes.set(c.id, {
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      productsCount: c.productCount,
      status: c.isActive ? 'active' : 'inactive',
      raw: c,
      children: [],
    });
  }
  const roots: TreeNode[] = [];
  const all = Array.from(nodes.values());
  for (const node of all) {
    if (node.parentId && nodes.has(node.parentId)) nodes.get(node.parentId)!.children.push(node);
    else roots.push(node);
  }
  const bySort = (a: TreeNode, b: TreeNode) => a.raw.sortOrder - b.raw.sortOrder || a.name.localeCompare(b.name);
  roots.sort(bySort);
  for (const n of all) n.children.sort(bySort);
  return roots;
}

export default function CategoriesAdminPage() {
  const [categories, setCategories] = React.useState<CatalogCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CatalogCategory | null>(null);

  const refresh = React.useCallback(async () => {
    const data = await catalogApi.listCategories({ status: 'all', parent: 'all' });
    setCategories(data);
  }, []);

  React.useEffect(() => {
    void refresh().catch(() => setCategories([]));
  }, [refresh]);

  const toggleExpand = (id: string) =>
    setExpandedCategories((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const handleDelete = async (node: TreeNode) => {
    if (!window.confirm(`Delete category "${node.name}"?`)) return;
    try {
      await catalogApi.deleteCategory(node.id);
      await refresh();
    } catch (err) {
      window.alert(err instanceof CatalogApiError ? err.message : 'Failed to delete category.');
    }
  };

  const tree = React.useMemo(() => buildTree(categories), [categories]);
  const q = searchQuery.trim().toLowerCase();
  const visibleRoots = q
    ? tree.filter((n) => n.name.toLowerCase().includes(q) || n.children.some((c) => c.name.toLowerCase().includes(q)))
    : tree;

  const renderCategory = (category: TreeNode, depth = 0): React.ReactNode => {
    const isExpanded = expandedCategories.includes(category.id) || q.length > 0;
    const hasChildren = category.children.length > 0;

    return (
      <div key={category.id}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50 group"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(category.id)} className="w-6 h-6 flex items-center justify-center">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
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
                  category.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
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
                    setEditingCategory(category.raw);
                    setIsEditorOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleDelete(category)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {hasChildren && isExpanded && (
          <div className="border-l ml-6">{category.children.map((child) => renderCategory(child, depth + 1))}</div>
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
          {visibleRoots.map((category) => renderCategory(category))}
          {visibleRoots.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No categories found.</p>
          )}
        </div>
      </div>

      {/* Category Editor Drawer */}
      <CategoryEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        categories={categories}
        onSaved={async () => {
          setIsEditorOpen(false);
          setEditingCategory(null);
          await refresh();
        }}
      />
    </div>
  );
}

function CategoryEditor({
  isOpen,
  onClose,
  category,
  categories,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  category: CatalogCategory | null;
  categories: CatalogCategory[];
  onSaved: () => void | Promise<void>;
}) {
  const blank = { name: '', slug: '', parentId: '', description: '', isActive: true, sortOrder: '0' };
  const [form, setForm] = React.useState(blank);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setForm(
      category
        ? {
            name: category.name,
            slug: category.slug,
            parentId: category.parentId ?? '',
            description: category.description ?? '',
            isActive: category.isActive,
            sortOrder: String(category.sortOrder ?? 0),
          }
        : blank,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, category]);

  const set = (k: keyof typeof blank, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    setError(null);
    if (!form.name.trim()) return setError('Category name is required.');
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      parentId: form.parentId || null,
      description: form.description || undefined,
      isActive: form.isActive,
      sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
    };
    setSaving(true);
    try {
      if (category) await catalogApi.updateCategory(category.id, payload);
      else await catalogApi.createCategory(payload);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
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
                <h2 className="text-lg font-semibold">{category ? 'Edit Category' : 'Add Category'}</h2>
                <p className="text-sm text-muted-foreground">{category?.name || 'Create a new category'}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category Name</label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Slug</label>
                <Input placeholder="auto from name" value={form.slug} onChange={(e) => set('slug', e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Parent Category</label>
                <select
                  className="w-full h-10 rounded-lg border bg-background px-3"
                  value={form.parentId}
                  onChange={(e) => set('parentId', e.target.value)}
                >
                  <option value="">None (Top Level)</option>
                  {categories
                    .filter((c) => c.id !== category?.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  className="w-full h-10 rounded-lg border bg-background px-3"
                  value={form.isActive ? 'Active' : 'Inactive'}
                  onChange={(e) => set('isActive', e.target.value === 'Active')}
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Display Order</label>
                <Input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t bg-background">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button className="bg-brand-gradient" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Category'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
