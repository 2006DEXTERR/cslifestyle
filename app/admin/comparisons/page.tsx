'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit, Trash2, Trophy, X, ArrowRightLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { contentApi, ContentApiError, type ContentComparison } from '@/lib/api/content';
import { catalogApi, type CatalogProduct } from '@/lib/api/catalog';
import { formatDate } from '@/lib/format';

export default function ComparisonsAdminPage() {
  const [comparisons, setComparisons] = React.useState<ContentComparison[]>([]);
  const [products, setProducts] = React.useState<CatalogProduct[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ContentComparison | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  const refresh = React.useCallback(async () => {
    const { items } = await contentApi.listComparisons({ status: 'all', perPage: 200, sort: 'newest' });
    setComparisons(items);
  }, []);

  React.useEffect(() => {
    void refresh().catch(() => setComparisons([]));
    catalogApi.listProducts({ status: 'all', perPage: 200 }).then((r) => setProducts(r.items)).catch(() => setProducts([]));
  }, [refresh]);

  const handleDelete = async (c: ContentComparison) => {
    if (!window.confirm(`Delete comparison "${c.title}"?`)) return;
    await contentApi.deleteComparison(c.id);
    await refresh();
  };
  const handleStatus = async (c: ContentComparison, action: 'publish' | 'unpublish') => {
    await contentApi.setComparisonStatus(c.id, action);
    await refresh();
  };

  const filtered = comparisons.filter(
    (c) => (!statusFilter || c.status === statusFilter) && c.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
            setEditing(null);
            setIsBuilderOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Comparison
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search comparisons..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {[
            { v: '', l: 'All' },
            { v: 'published', l: 'Published' },
            { v: 'draft', l: 'Draft' },
          ].map((s) => (
            <Button key={s.v} variant={statusFilter === s.v ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s.v)}>
              {s.l}
            </Button>
          ))}
        </div>
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
                <th className="px-4 py-3 text-left text-sm font-medium">Updated</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((comparison) => (
                <tr key={comparison.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                          {comparison.productA?.image && <img src={comparison.productA.image} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{comparison.productA?.name}</p>
                          <p className="text-xs text-muted-foreground">{comparison.productA?.brand}</p>
                        </div>
                      </div>
                      <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                          {comparison.productB?.image && <img src={comparison.productB.image} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{comparison.productB?.name}</p>
                          <p className="text-xs text-muted-foreground">{comparison.productB?.brand}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Trophy className={`w-4 h-4 ${comparison.winner === 'tie' ? 'text-gray-400' : 'text-yellow-500'}`} />
                      <span className="text-sm">
                        {comparison.winner === 'tie'
                          ? 'Tie'
                          : comparison.winner === 'A'
                            ? comparison.productA?.brand
                            : comparison.productB?.brand}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        comparison.status === 'published' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
                      }`}
                    >
                      {comparison.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(comparison.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {comparison.status === 'published' ? (
                        <Button variant="ghost" size="sm" onClick={() => handleStatus(comparison, 'unpublish')}>
                          Unpublish
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleStatus(comparison, 'publish')}>
                          Publish
                        </Button>
                      )}
                      <a href={`/comparisons/${comparison.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(comparison);
                          setIsBuilderOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(comparison)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No comparisons found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ComparisonBuilder
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditing(null);
        }}
        comparison={editing}
        products={products}
        onSaved={async () => {
          setIsBuilderOpen(false);
          setEditing(null);
          await refresh();
        }}
      />
    </div>
  );
}

interface SpecRow {
  specName: string;
  productAValue: string;
  productBValue: string;
  winner: 'A' | 'B' | 'tie';
  details: string;
}

const splitList = (s: string): string[] =>
  s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);

function ComparisonBuilder({
  isOpen,
  onClose,
  comparison,
  products,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  comparison: ContentComparison | null;
  products: CatalogProduct[];
  onSaved: () => void | Promise<void>;
}) {
  const blank = {
    title: '',
    slug: '',
    excerpt: '',
    summary: '',
    productAId: '',
    productBId: '',
    verdict: '',
    winner: 'tie' as 'A' | 'B' | 'tie',
    seoTitle: '',
    metaDescription: '',
    status: 'draft' as 'draft' | 'published',
    aPros: '',
    aCons: '',
    bPros: '',
    bCons: '',
  };
  const [form, setForm] = React.useState(blank);
  const [specs, setSpecs] = React.useState<SpecRow[]>([]);
  const [activeTab, setActiveTab] = React.useState('general');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setActiveTab('general');
    setError(null);
    if (comparison) {
      const pc = comparison.prosCons ?? { productA: { pros: [], cons: [] }, productB: { pros: [], cons: [] } };
      setForm({
        title: comparison.title,
        slug: comparison.slug,
        excerpt: comparison.excerpt ?? '',
        summary: comparison.summary ?? '',
        productAId: comparison.productAId,
        productBId: comparison.productBId,
        verdict: comparison.verdict ?? '',
        winner: (comparison.winner as 'A' | 'B' | 'tie') || 'tie',
        seoTitle: comparison.seoTitle ?? '',
        metaDescription: comparison.metaDescription ?? '',
        status: comparison.status === 'published' ? 'published' : 'draft',
        aPros: (pc.productA?.pros ?? []).join(', '),
        aCons: (pc.productA?.cons ?? []).join(', '),
        bPros: (pc.productB?.pros ?? []).join(', '),
        bCons: (pc.productB?.cons ?? []).join(', '),
      });
      setSpecs(
        (comparison.categories ?? []).map((s) => ({
          specName: s.name,
          productAValue: s.productA,
          productBValue: s.productB,
          winner: (s.winner as 'A' | 'B' | 'tie') || 'tie',
          details: s.details,
        })),
      );
    } else {
      setForm(blank);
      setSpecs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, comparison]);

  const set = (k: keyof typeof blank, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? '';

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'products', label: 'Product Picker' },
    { id: 'specs', label: 'Specs Matrix' },
    { id: 'verdict', label: 'Verdict' },
    { id: 'seo', label: 'SEO' },
    { id: 'preview', label: 'Preview' },
  ];

  async function handleSave(targetStatus?: 'draft' | 'published') {
    setError(null);
    if (!form.title.trim()) {
      setActiveTab('general');
      return setError('Title is required.');
    }
    if (!form.productAId || !form.productBId) {
      setActiveTab('products');
      return setError('Select both products.');
    }
    if (form.productAId === form.productBId) {
      setActiveTab('products');
      return setError('Choose two different products.');
    }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt || undefined,
      summary: form.summary || undefined,
      productAId: form.productAId,
      productBId: form.productBId,
      verdict: form.verdict || undefined,
      winner: form.winner,
      prosCons: {
        productA: { pros: splitList(form.aPros), cons: splitList(form.aCons) },
        productB: { pros: splitList(form.bPros), cons: splitList(form.bCons) },
      },
      specs: specs
        .filter((s) => s.specName.trim())
        .map((s) => ({
          specName: s.specName,
          productAValue: s.productAValue || undefined,
          productBValue: s.productBValue || undefined,
          winner: s.winner,
          details: s.details || undefined,
        })),
      seoTitle: form.seoTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      status: targetStatus ?? form.status,
    };

    setSaving(true);
    try {
      if (comparison) await contentApi.updateComparison(comparison.id, payload);
      else await contentApi.createComparison(payload);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save comparison.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-3xl bg-background border-l overflow-auto flex flex-col"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
              <h2 className="text-lg font-semibold">{comparison ? 'Edit Comparison' : 'Create Comparison'}</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex gap-1 p-2 border-b overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              {activeTab === 'general' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Slug</label>
                    <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="auto from title" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Excerpt</label>
                    <textarea className="w-full min-h-[80px] rounded-lg border bg-background p-3 text-sm" value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Summary</label>
                    <textarea className="w-full min-h-[80px] rounded-lg border bg-background p-3 text-sm" value={form.summary} onChange={(e) => set('summary', e.target.value)} />
                  </div>
                </>
              )}

              {activeTab === 'products' && (
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Product A</h3>
                    <select className="w-full h-10 rounded-lg border bg-background px-3" value={form.productAId} onChange={(e) => set('productAId', e.target.value)}>
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Product B</h3>
                    <select className="w-full h-10 rounded-lg border bg-background px-3" value={form.productBId} onChange={(e) => set('productBId', e.target.value)}>
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'specs' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Comparison Categories</h3>
                    <Button variant="outline" size="sm" onClick={() => setSpecs((s) => [...s, { specName: '', productAValue: '', productBValue: '', winner: 'tie', details: '' }])}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Category
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {specs.map((row, i) => (
                      <div key={i} className="p-4 rounded-lg bg-muted/50 space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Category (e.g. Display)"
                            value={row.specName}
                            onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? { ...x, specName: e.target.value } : x)))}
                          />
                          <select
                            className="h-10 rounded-lg border bg-background px-3"
                            value={row.winner}
                            onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? { ...x, winner: e.target.value as SpecRow['winner'] } : x)))}
                          >
                            <option value="tie">Tie</option>
                            <option value="A">Product A</option>
                            <option value="B">Product B</option>
                          </select>
                          <Button variant="ghost" size="icon" onClick={() => setSpecs((s) => s.filter((_, j) => j !== i))}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Product A value"
                            value={row.productAValue}
                            onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? { ...x, productAValue: e.target.value } : x)))}
                          />
                          <Input
                            placeholder="Product B value"
                            value={row.productBValue}
                            onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? { ...x, productBValue: e.target.value } : x)))}
                          />
                        </div>
                        <Input
                          placeholder="Details (optional)"
                          value={row.details}
                          onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? { ...x, details: e.target.value } : x)))}
                        />
                      </div>
                    ))}
                    {specs.length === 0 && <p className="text-sm text-muted-foreground">No categories yet.</p>}
                  </div>
                </div>
              )}

              {activeTab === 'verdict' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Final Verdict</label>
                    <textarea className="w-full min-h-[120px] rounded-lg border bg-background p-3 text-sm" value={form.verdict} onChange={(e) => set('verdict', e.target.value)} />
                  </div>
                  <div className="space-y-2 max-w-xs">
                    <label className="text-sm font-medium">Winner</label>
                    <select className="w-full h-10 rounded-lg border bg-background px-3" value={form.winner} onChange={(e) => set('winner', e.target.value)}>
                      <option value="tie">Tie</option>
                      <option value="A">Product A</option>
                      <option value="B">Product B</option>
                    </select>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Product A — Pros (comma-sep)</label>
                      <textarea className="w-full min-h-[80px] rounded-lg border bg-background p-3 text-sm" value={form.aPros} onChange={(e) => set('aPros', e.target.value)} />
                      <label className="text-sm font-medium">Product A — Cons</label>
                      <textarea className="w-full min-h-[80px] rounded-lg border bg-background p-3 text-sm" value={form.aCons} onChange={(e) => set('aCons', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Product B — Pros (comma-sep)</label>
                      <textarea className="w-full min-h-[80px] rounded-lg border bg-background p-3 text-sm" value={form.bPros} onChange={(e) => set('bPros', e.target.value)} />
                      <label className="text-sm font-medium">Product B — Cons</label>
                      <textarea className="w-full min-h-[80px] rounded-lg border bg-background p-3 text-sm" value={form.bCons} onChange={(e) => set('bCons', e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'seo' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Meta Title</label>
                    <Input value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Meta Description</label>
                    <textarea className="w-full h-20 rounded-lg border bg-background p-3 text-sm" value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} />
                  </div>
                </>
              )}

              {activeTab === 'preview' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border">
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-semibold">{form.title || '—'}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="font-medium">{productName(form.productAId) || 'Product A'}</span>
                      <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{productName(form.productBId) || 'Product B'}</span>
                    </div>
                    <p className="text-sm mt-3">
                      Winner: {form.winner === 'tie' ? 'Tie' : form.winner === 'A' ? productName(form.productAId) : productName(form.productBId)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{specs.length} spec row(s)</p>
                  </div>
                  {comparison && (
                    <a href={`/comparisons/${comparison.slug}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full">
                        Open public page
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </a>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t bg-background">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving}>
                Save Draft
              </Button>
              <Button className="bg-brand-gradient" onClick={() => handleSave('published')} disabled={saving}>
                {saving ? 'Saving…' : 'Publish'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
