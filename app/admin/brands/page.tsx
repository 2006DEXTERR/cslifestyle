'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit, Trash2, ExternalLink, Star, X, Globe, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { catalogApi, CatalogApiError, type CatalogBrand, type CatalogProduct } from '@/lib/api/catalog';

export default function BrandsAdminPage() {
  const [brands, setBrands] = React.useState<CatalogBrand[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingBrand, setEditingBrand] = React.useState<CatalogBrand | null>(null);
  const [selectedBrand, setSelectedBrand] = React.useState<CatalogBrand | null>(null);
  const [topProducts, setTopProducts] = React.useState<CatalogProduct[]>([]);

  const refresh = React.useCallback(async () => {
    const data = await catalogApi.listBrands({ status: 'all' });
    setBrands(data);
  }, []);

  React.useEffect(() => {
    void refresh().catch(() => setBrands([]));
  }, [refresh]);

  React.useEffect(() => {
    if (!selectedBrand) {
      setTopProducts([]);
      return;
    }
    let active = true;
    catalogApi
      .listProducts({ brand: selectedBrand.slug, perPage: 3, status: 'all', sort: 'popularity' })
      .then((r) => {
        if (active) setTopProducts(r.items);
      })
      .catch(() => {
        if (active) setTopProducts([]);
      });
    return () => {
      active = false;
    };
  }, [selectedBrand]);

  const handleDelete = async (brand: CatalogBrand) => {
    if (!window.confirm(`Delete brand "${brand.name}"? Its products will be kept but unlinked.`)) return;
    try {
      await catalogApi.deleteBrand(brand.id);
      await refresh();
    } catch (err) {
      window.alert(err instanceof CatalogApiError ? err.message : 'Failed to delete brand.');
    }
  };

  const filteredBrands = brands.filter(
    (brand) =>
      brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.slug.toLowerCase().includes(searchQuery.toLowerCase()),
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
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(brand);
                  }}
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
                <p className="text-lg font-bold">{brand.productCount}</p>
                <p className="text-xs text-muted-foreground">Products</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-bold">{brand.rating}</span>
                </div>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredBrands.length === 0 && (
          <p className="col-span-full p-6 text-center text-sm text-muted-foreground">No brands found.</p>
        )}
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold">{selectedBrand.productCount}</p>
                    <p className="text-xs text-muted-foreground">Products</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-2xl font-bold">{selectedBrand.rating}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <h3 className="font-medium">Quick Actions</h3>
                  <a href={`/brands/${selectedBrand.slug}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full justify-start">
                      <Globe className="w-4 h-4 mr-2" />
                      View Public Page
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setEditingBrand(selectedBrand);
                      setSelectedBrand(null);
                      setIsEditorOpen(true);
                    }}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Edit Brand
                  </Button>
                </div>

                {/* Related Products */}
                <div>
                  <h3 className="font-medium mb-3">Top Products</h3>
                  <div className="space-y-2">
                    {topProducts.map((p) => (
                      <a
                        key={p.id}
                        href={`/products/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50"
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                          {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{selectedBrand.name}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    ))}
                    {topProducts.length === 0 && (
                      <p className="text-sm text-muted-foreground">No products for this brand yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Brand Editor Drawer */}
      <BrandEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingBrand(null);
        }}
        brand={editingBrand}
        onSaved={async () => {
          setIsEditorOpen(false);
          setEditingBrand(null);
          await refresh();
        }}
      />
    </div>
  );
}

function BrandEditor({
  isOpen,
  onClose,
  brand,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  brand: CatalogBrand | null;
  onSaved: () => void | Promise<void>;
}) {
  const blank = { name: '', slug: '', description: '', website: '', rating: '', isActive: true };
  const [form, setForm] = React.useState(blank);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setForm(
      brand
        ? {
            name: brand.name,
            slug: brand.slug,
            description: brand.description ?? '',
            website: brand.website ?? '',
            rating: brand.rating != null ? String(brand.rating) : '',
            isActive: brand.isActive,
          }
        : blank,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, brand]);

  const set = (k: keyof typeof blank, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    setError(null);
    if (!form.name.trim()) return setError('Brand name is required.');
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description || undefined,
      website: form.website || undefined,
      rating: form.rating ? Number(form.rating) : undefined,
      isActive: form.isActive,
    };
    setSaving(true);
    try {
      if (brand) await catalogApi.updateBrand(brand.id, payload);
      else await catalogApi.createBrand(payload);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save brand.');
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
              <h2 className="text-lg font-semibold">{brand ? 'Edit Brand' : 'Add Brand'}</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center">
                  <span className="text-4xl font-bold">{form.name[0] || '?'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Brand Name</label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Slug</label>
                <Input placeholder="auto from name" value={form.slug} onChange={(e) => set('slug', e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website URL</label>
                  <Input placeholder="https://brand.com" value={form.website} onChange={(e) => set('website', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Avg Rating</label>
                  <Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => set('rating', e.target.value)} />
                </div>
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

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t bg-background">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button className="bg-brand-gradient" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Brand'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
