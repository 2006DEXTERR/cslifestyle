'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit, Trash2, Eye, Clock, X, Save, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { contentApi, ContentApiError, type ContentGuide } from '@/lib/api/content';
import { catalogApi, type CatalogCategory, type CatalogProduct } from '@/lib/api/catalog';
import type { ContentAuthor } from '@/lib/api/content';
import { formatDate } from '@/lib/format';

const PAGE_SIZE = 10;

export default function GuidesAdminPage() {
  const [guides, setGuides] = React.useState<ContentGuide[]>([]);
  const [categories, setCategories] = React.useState<CatalogCategory[]>([]);
  const [authors, setAuthors] = React.useState<ContentAuthor[]>([]);
  const [products, setProducts] = React.useState<CatalogProduct[]>([]);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingGuide, setEditingGuide] = React.useState<ContentGuide | null>(null);

  const refresh = React.useCallback(async () => {
    const { items } = await contentApi.listGuides({ status: 'all', perPage: 200, sort: 'newest' });
    setGuides(items);
  }, []);

  React.useEffect(() => {
    void refresh().catch(() => setGuides([]));
    catalogApi.listCategories({ status: 'all', parent: 'all' }).then(setCategories).catch(() => setCategories([]));
    contentApi.listAuthors({ status: 'all', perPage: 200 }).then((r) => setAuthors(r.items)).catch(() => setAuthors([]));
    catalogApi.listProducts({ status: 'all', perPage: 200 }).then((r) => setProducts(r.items)).catch(() => setProducts([]));
  }, [refresh]);

  const handleDelete = async (guide: ContentGuide) => {
    if (!window.confirm(`Delete guide "${guide.title}"?`)) return;
    await contentApi.deleteGuide(guide.id);
    await refresh();
  };

  const handleStatus = async (guide: ContentGuide, action: 'publish' | 'unpublish') => {
    await contentApi.setGuideStatus(guide.id, action);
    await refresh();
  };

  const filtered = guides.filter(
    (g) =>
      (!statusFilter || g.status === statusFilter) &&
      g.title.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  React.useEffect(() => setPage(1), [search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Guides</h1>
          <p className="text-muted-foreground">Manage buying guides and articles</p>
        </div>
        <Button
          className="bg-brand-gradient hover:opacity-90"
          onClick={() => {
            setEditingGuide(null);
            setIsEditorOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Guide
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search guides..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
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

      {/* Guides Table */}
      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Author</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Read Time</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Updated</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pageItems.map((guide) => (
                <tr key={guide.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="max-w-md">
                      <p className="font-medium truncate">{guide.title}</p>
                      <p className="text-xs text-muted-foreground">{guide.category || 'Uncategorised'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {guide.author ? (
                      <div className="flex items-center gap-2">
                        <img src={guide.author.avatar} alt="" className="w-8 h-8 rounded-full" />
                        <span className="text-sm">{guide.author.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        guide.status === 'published' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
                      }`}
                    >
                      {guide.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {guide.readingTime} min
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(guide.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {guide.status === 'published' ? (
                        <Button variant="ghost" size="sm" onClick={() => handleStatus(guide, 'unpublish')}>
                          Unpublish
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleStatus(guide, 'publish')}>
                          Publish
                        </Button>
                      )}
                      <a href={`/guides/${guide.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingGuide(guide);
                          setIsEditorOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(guide)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No guides found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-sm text-muted-foreground">
            {filtered.length} guide{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <GuideEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingGuide(null);
        }}
        guide={editingGuide}
        categories={categories}
        authors={authors}
        products={products}
        onSaved={async () => {
          setIsEditorOpen(false);
          setEditingGuide(null);
          await refresh();
        }}
      />
    </div>
  );
}

interface Pick {
  productId: string;
  reason: string;
  isTopPick: boolean;
}

function GuideEditor({
  isOpen,
  onClose,
  guide,
  categories,
  authors,
  products,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  guide: ContentGuide | null;
  categories: CatalogCategory[];
  authors: ContentAuthor[];
  products: CatalogProduct[];
  onSaved: () => void | Promise<void>;
}) {
  const blank = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImage: '',
    categoryId: '',
    authorId: '',
    readingTime: '',
    status: 'draft' as 'draft' | 'published',
    tableOfContents: '',
    faqItems: '',
    tags: '',
    seoTitle: '',
    metaDescription: '',
  };
  const [form, setForm] = React.useState(blank);
  const [picks, setPicks] = React.useState<Pick[]>([]);
  const [activeTab, setActiveTab] = React.useState('general');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setActiveTab('general');
    setError(null);
    if (guide) {
      setForm({
        title: guide.title,
        slug: guide.slug,
        excerpt: guide.excerpt ?? '',
        content: guide.content ?? '',
        coverImage: guide.coverImage ?? '',
        categoryId: guide.categoryId ?? '',
        authorId: guide.authorId ?? '',
        readingTime: guide.readingTime ? String(guide.readingTime) : '',
        status: guide.status === 'published' ? 'published' : 'draft',
        tableOfContents: guide.tableOfContents?.length ? JSON.stringify(guide.tableOfContents, null, 2) : '',
        faqItems: guide.faqItems?.length ? JSON.stringify(guide.faqItems, null, 2) : '',
        tags: (guide.tags ?? []).join(', '),
        seoTitle: guide.seoTitle ?? '',
        metaDescription: guide.metaDescription ?? '',
      });
      setPicks(
        (guide.productRecommendations ?? []).map((r) => ({
          productId: (r.product as { id: string }).id,
          reason: r.reason,
          isTopPick: r.isTopPick,
        })),
      );
    } else {
      setForm(blank);
      setPicks([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, guide]);

  const set = (k: keyof typeof blank, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'content', label: 'Content' },
    { id: 'faq', label: 'FAQ' },
    { id: 'picks', label: 'Product Picks' },
    { id: 'seo', label: 'SEO' },
    { id: 'settings', label: 'Settings' },
  ];

  function parseJsonField(text: string, tab: string, label: string): unknown {
    if (!text.trim()) return [];
    try {
      return JSON.parse(text);
    } catch {
      setActiveTab(tab);
      throw new Error(`${label} must be valid JSON.`);
    }
  }

  async function handleSave(targetStatus?: 'draft' | 'published') {
    setError(null);
    if (!form.title.trim()) {
      setActiveTab('general');
      return setError('Title is required.');
    }
    let tableOfContents: unknown;
    let faqItems: unknown;
    try {
      tableOfContents = parseJsonField(form.tableOfContents, 'content', 'Table of contents');
      faqItems = parseJsonField(form.faqItems, 'faq', 'FAQ items');
    } catch (e) {
      return setError(e instanceof Error ? e.message : 'Invalid JSON.');
    }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt || undefined,
      content: form.content || undefined,
      coverImage: form.coverImage || undefined,
      categoryId: form.categoryId || null,
      authorId: form.authorId || null,
      readingTime: form.readingTime ? Number(form.readingTime) : undefined,
      tableOfContents,
      faqItems,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      seoTitle: form.seoTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      status: targetStatus ?? form.status,
      products: picks
        .filter((p) => p.productId)
        .map((p, i) => ({ productId: p.productId, position: i, reason: p.reason, isTopPick: p.isTopPick })),
    };

    setSaving(true);
    try {
      if (guide) await contentApi.updateGuide(guide.id, payload);
      else await contentApi.createGuide(payload);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save guide.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
              <Button variant="ghost" onClick={onClose} disabled={saving}>
                <X className="w-5 h-5 mr-2" />
                Close
              </Button>
              <span className="font-semibold">{guide ? 'Edit Guide' : 'Create Guide'}</span>
              <div className="flex items-center gap-2">
                {guide && (
                  <a href={`/guides/${guide.slug}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      Preview
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                )}
                <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving}>
                  Save Draft
                </Button>
                <Button className="bg-brand-gradient" onClick={() => handleSave('published')} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving…' : 'Publish'}
                </Button>
              </div>
            </div>

            {/* Tabs */}
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

            {/* Body */}
            <div className="flex-1 overflow-auto">
              <div className="max-w-3xl mx-auto py-8 px-6 space-y-6">
                {activeTab === 'general' && (
                  <>
                    <input
                      type="text"
                      placeholder="Guide Title..."
                      className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground"
                      value={form.title}
                      onChange={(e) => set('title', e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Slug</label>
                        <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="auto from title" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Reading time (min)</label>
                        <Input type="number" value={form.readingTime} onChange={(e) => set('readingTime', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Author</label>
                        <select className="w-full h-10 rounded-lg border bg-background px-3" value={form.authorId} onChange={(e) => set('authorId', e.target.value)}>
                          <option value="">No author</option>
                          {authors.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <select className="w-full h-10 rounded-lg border bg-background px-3" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                          <option value="">Uncategorised</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cover Image URL</label>
                      <Input value={form.coverImage} onChange={(e) => set('coverImage', e.target.value)} placeholder="https://…" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Excerpt</label>
                      <textarea className="w-full min-h-[80px] rounded-lg border bg-background p-3 text-sm" value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
                    </div>
                  </>
                )}

                {activeTab === 'content' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Content</label>
                      <textarea
                        className="w-full min-h-[360px] rounded-lg border bg-background p-3 text-sm"
                        placeholder="Write your guide content here…"
                        value={form.content}
                        onChange={(e) => set('content', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Table of Contents (JSON)</label>
                      <textarea
                        className="w-full min-h-[120px] rounded-lg border bg-background p-3 text-sm font-mono"
                        placeholder={'[\n  { "title": "Introduction", "id": "intro" }\n]'}
                        value={form.tableOfContents}
                        onChange={(e) => set('tableOfContents', e.target.value)}
                      />
                    </div>
                  </>
                )}

                {activeTab === 'faq' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">FAQ items (JSON)</label>
                    <textarea
                      className="w-full min-h-[300px] rounded-lg border bg-background p-3 text-sm font-mono"
                      placeholder={'[\n  { "question": "…", "answer": "…" }\n]'}
                      value={form.faqItems}
                      onChange={(e) => set('faqItems', e.target.value)}
                    />
                  </div>
                )}

                {activeTab === 'picks' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Recommended Products</h3>
                      <Button variant="outline" size="sm" onClick={() => setPicks((p) => [...p, { productId: '', reason: '', isTopPick: false }])}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Pick
                      </Button>
                    </div>
                    {picks.map((pick, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center p-3 rounded-lg bg-muted/40">
                        <select
                          className="h-10 rounded-lg border bg-background px-3 text-sm"
                          value={pick.productId}
                          onChange={(e) => setPicks((p) => p.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)))}
                        >
                          <option value="">Select product</option>
                          {products.map((pr) => (
                            <option key={pr.id} value={pr.id}>
                              {pr.name}
                            </option>
                          ))}
                        </select>
                        <Input
                          placeholder="Reason"
                          value={pick.reason}
                          onChange={(e) => setPicks((p) => p.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)))}
                        />
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={pick.isTopPick}
                            onChange={(e) => setPicks((p) => p.map((x, j) => (j === i ? { ...x, isTopPick: e.target.checked } : x)))}
                          />
                          Top
                        </label>
                        <Button variant="ghost" size="icon" onClick={() => setPicks((p) => p.filter((_, j) => j !== i))}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {picks.length === 0 && <p className="text-sm text-muted-foreground">No product picks yet.</p>}
                  </div>
                )}

                {activeTab === 'seo' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Meta Title</label>
                      <Input value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Meta Description</label>
                      <textarea className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm" value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tags (comma-separated)</label>
                      <Input value={form.tags} onChange={(e) => set('tags', e.target.value)} />
                    </div>
                  </>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-2 max-w-xs">
                    <label className="text-sm font-medium">Status</label>
                    <select className="w-full h-10 rounded-lg border bg-background px-3" value={form.status} onChange={(e) => set('status', e.target.value)}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      "Save Draft" / "Publish" in the header override this; it is the default when saving.
                    </p>
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
