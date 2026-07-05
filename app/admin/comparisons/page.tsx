'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit, Trash2, Trophy, X, ArrowRightLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { contentApi, ContentApiError, type ContentComparison, type ComparisonSpecView } from '@/lib/api/content';
import { catalogApi, type CatalogProduct } from '@/lib/api/catalog';
import { formatDate } from '@/lib/format';
import { productImageClass } from '@/lib/image';

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
                          {comparison.productA?.image && <img src={comparison.productA.image} alt="" className={productImageClass} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{comparison.productA?.name}</p>
                          <p className="text-xs text-muted-foreground">{comparison.productA?.brand}</p>
                        </div>
                      </div>
                      <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                          {comparison.productB?.image && <img src={comparison.productB.image} alt="" className={productImageClass} />}
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

// Value kind drives both how the row is edited and how the public table renders it.
type SpecKind = 'text' | 'number' | 'currency' | 'percentage' | 'rating' | 'progress' | 'boolean' | 'badge' | 'list';
type WinnerMode = 'manual' | 'higher_better' | 'lower_better' | 'equal' | 'none';

interface SpecRow {
  specName: string;
  specGroup: string;
  kind: SpecKind;
  unit: string;
  aText: string;
  bText: string;
  aNum: string;
  bNum: string;
  aBool: boolean;
  bBool: boolean;
  winnerMode: WinnerMode;
  winner: 'A' | 'B' | 'tie';
  details: string;
}

const SPEC_GROUPS = [
  'General', 'Design', 'Display', 'Performance', 'Processor', 'Memory', 'Storage', 'Camera',
  'Battery', 'Charging', 'Connectivity', 'Network', 'Build', 'Software', 'Gaming', 'Audio',
  'Sensors', 'Warranty', 'Value',
];

const KIND_OPTIONS: { value: SpecKind; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency (₹)' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'rating', label: 'Rating (0–5)' },
  { value: 'progress', label: 'Progress bar' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'badge', label: 'Badge' },
  { value: 'list', label: 'List' },
];

const WINNER_MODES: { value: WinnerMode; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'higher_better', label: 'Higher is better' },
  { value: 'lower_better', label: 'Lower is better' },
  { value: 'equal', label: 'Always tie' },
  { value: 'none', label: 'No winner' },
];

const NUMERIC_KINDS: SpecKind[] = ['number', 'currency', 'percentage', 'rating', 'progress'];
const isNumericKind = (k: SpecKind) => NUMERIC_KINDS.includes(k);
const kindToDisplayType = (k: SpecKind): string => (k === 'list' ? 'text' : k);
const kindToValueType = (k: SpecKind): string =>
  k === 'boolean' ? 'boolean' : k === 'list' ? 'json' : isNumericKind(k) ? 'float' : 'string';

const splitList = (s: string): string[] =>
  s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);

const emptySpec = (): SpecRow => ({
  specName: '', specGroup: 'General', kind: 'text', unit: '',
  aText: '', bText: '', aNum: '', bNum: '', aBool: false, bBool: false,
  winnerMode: 'manual', winner: 'tie', details: '',
});

/** Map a presented spec (from the API) back into an editable row. */
function specToRow(s: ComparisonSpecView): SpecRow {
  let kind: SpecKind = 'text';
  if (s.valueType === 'json') kind = 'list';
  else if (s.displayType === 'boolean') kind = 'boolean';
  else if (NUMERIC_KINDS.includes(s.displayType as SpecKind)) kind = s.displayType as SpecKind;
  else if (s.displayType === 'badge') kind = 'badge';
  const listA = Array.isArray(s.jsonValueA) ? (s.jsonValueA as unknown[]).map(String) : [];
  const listB = Array.isArray(s.jsonValueB) ? (s.jsonValueB as unknown[]).map(String) : [];
  return {
    specName: s.name,
    specGroup: s.group || 'General',
    kind,
    unit: s.unit ?? '',
    aText: kind === 'list' ? listA.join('\n') : s.productA,
    bText: kind === 'list' ? listB.join('\n') : s.productB,
    aNum: s.numberValueA !== null ? String(s.numberValueA) : '',
    bNum: s.numberValueB !== null ? String(s.numberValueB) : '',
    aBool: s.booleanValueA ?? false,
    bBool: s.booleanValueB ?? false,
    winnerMode: (s.winnerMode as WinnerMode) || 'manual',
    winner: (s.winner as 'A' | 'B' | 'tie') || 'tie',
    details: s.details ?? '',
  };
}

/** Build the API spec payload from an editable row (typed + grouped). */
function rowToPayload(r: SpecRow): Record<string, unknown> {
  const base: Record<string, unknown> = {
    specName: r.specName.trim(),
    specGroup: r.specGroup.trim() || undefined,
    displayType: kindToDisplayType(r.kind),
    valueType: kindToValueType(r.kind),
    winnerMode: r.winnerMode,
    winner: r.winnerMode === 'manual' ? r.winner : undefined,
    details: r.details.trim() || undefined,
    unit: r.unit.trim() || undefined,
  };
  if (isNumericKind(r.kind)) {
    const a = r.aNum.trim() === '' ? null : Number(r.aNum);
    const b = r.bNum.trim() === '' ? null : Number(r.bNum);
    base.numberValueA = a !== null && Number.isFinite(a) ? a : null;
    base.numberValueB = b !== null && Number.isFinite(b) ? b : null;
    base.productAValue = r.aNum.trim() || undefined;
    base.productBValue = r.bNum.trim() || undefined;
  } else if (r.kind === 'boolean') {
    base.booleanValueA = r.aBool;
    base.booleanValueB = r.bBool;
    base.productAValue = r.aBool ? 'Yes' : 'No';
    base.productBValue = r.bBool ? 'Yes' : 'No';
  } else if (r.kind === 'list') {
    const la = splitList(r.aText);
    const lb = splitList(r.bText);
    base.jsonValueA = la;
    base.jsonValueB = lb;
    base.productAValue = la.join(', ') || undefined;
    base.productBValue = lb.join(', ') || undefined;
  } else {
    base.productAValue = r.aText.trim() || undefined;
    base.productBValue = r.bText.trim() || undefined;
  }
  return base;
}

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
    // ── Rich editorial fields ──
    editorSummary: '',
    bestFor: '',
    whoShouldBuyA: '',
    whoShouldBuyB: '',
    scoreA: '',
    scoreB: '',
    reviewStatus: 'draft' as 'draft' | 'in_review' | 'approved',
    featured: false,
    stickyCta: false,
  };
  const [form, setForm] = React.useState(blank);
  const [specs, setSpecs] = React.useState<SpecRow[]>([]);
  const [faq, setFaq] = React.useState<{ question: string; answer: string }[]>([]);
  const [altIds, setAltIds] = React.useState<string[]>([]);
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
        editorSummary: comparison.editorSummary ?? '',
        bestFor: comparison.bestFor ?? '',
        whoShouldBuyA: comparison.whoShouldBuyA ?? '',
        whoShouldBuyB: comparison.whoShouldBuyB ?? '',
        scoreA: comparison.comparisonScoreA !== null && comparison.comparisonScoreA !== undefined ? String(comparison.comparisonScoreA) : '',
        scoreB: comparison.comparisonScoreB !== null && comparison.comparisonScoreB !== undefined ? String(comparison.comparisonScoreB) : '',
        reviewStatus: (['draft', 'in_review', 'approved'].includes(comparison.reviewStatus) ? comparison.reviewStatus : 'draft') as 'draft' | 'in_review' | 'approved',
        featured: Boolean(comparison.featured),
        stickyCta: Boolean(comparison.stickyCta),
      });
      setSpecs((comparison.categories ?? []).map(specToRow));
      setFaq((comparison.faq ?? []).map((f) => ({ question: f.question, answer: f.answer })));
      setAltIds(comparison.bestAlternativeIds ?? []);
    } else {
      setForm(blank);
      setSpecs([]);
      setFaq([]);
      setAltIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, comparison]);

  const set = (k: keyof typeof blank, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const patchSpec = (i: number, patch: Partial<SpecRow>) =>
    setSpecs((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? '';

  // Products eligible as alternatives (exclude the two being compared + already-picked).
  const altCandidates = products.filter(
    (p) => p.id !== form.productAId && p.id !== form.productBId && !altIds.includes(p.id),
  );

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'products', label: 'Product Picker' },
    { id: 'specs', label: 'Specs Matrix' },
    { id: 'verdict', label: 'Verdict' },
    { id: 'editorial', label: 'Editorial' },
    { id: 'faq', label: 'FAQ & Alternatives' },
    { id: 'seo', label: 'SEO' },
    { id: 'preview', label: 'Preview' },
  ];

  const scoreOrUndefined = (v: string): number | undefined => {
    if (v.trim() === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : undefined;
  };

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
    // Reject unnamed and duplicate specs (same name within the same group) before the API does.
    const named = specs.filter((s) => s.specName.trim());
    const seen = new Set<string>();
    for (const s of named) {
      const key = `${(s.specGroup.trim() || 'General').toLowerCase()}|${s.specName.trim().toLowerCase()}`;
      if (seen.has(key)) {
        setActiveTab('specs');
        return setError(`Duplicate spec "${s.specName.trim()}"${s.specGroup.trim() ? ` in group "${s.specGroup.trim()}"` : ''}.`);
      }
      seen.add(key);
    }
    // FAQ rows must have both a question and an answer.
    const cleanFaq = faq.filter((f) => f.question.trim() && f.answer.trim()).map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }));
    if (faq.some((f) => (f.question.trim() ? !f.answer.trim() : f.answer.trim()))) {
      setActiveTab('faq');
      return setError('Each FAQ needs both a question and an answer.');
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
      specs: named.map(rowToPayload),
      seoTitle: form.seoTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      status: targetStatus ?? form.status,
      // ── Rich editorial fields ──
      editorSummary: form.editorSummary || undefined,
      bestFor: form.bestFor.trim() || undefined,
      whoShouldBuyA: form.whoShouldBuyA || undefined,
      whoShouldBuyB: form.whoShouldBuyB || undefined,
      comparisonScoreA: scoreOrUndefined(form.scoreA),
      comparisonScoreB: scoreOrUndefined(form.scoreB),
      reviewStatus: form.reviewStatus,
      featured: form.featured,
      stickyCta: form.stickyCta,
      faq: cleanFaq,
      bestAlternativeIds: altIds,
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
                    <h3 className="font-semibold">Specifications</h3>
                    <Button variant="outline" size="sm" onClick={() => setSpecs((s) => [...s, emptySpec()])}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Spec
                    </Button>
                  </div>
                  <datalist id="spec-groups">
                    {SPEC_GROUPS.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                  <div className="space-y-3">
                    {specs.map((row, i) => (
                      <div key={i} className="p-4 rounded-lg bg-muted/50 space-y-3">
                        {/* Name + group + remove */}
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Spec name (e.g. Battery)"
                            value={row.specName}
                            onChange={(e) => patchSpec(i, { specName: e.target.value })}
                          />
                          <Input
                            list="spec-groups"
                            className="max-w-[160px]"
                            placeholder="Group"
                            value={row.specGroup}
                            onChange={(e) => patchSpec(i, { specGroup: e.target.value })}
                          />
                          <Button variant="ghost" size="icon" onClick={() => setSpecs((s) => s.filter((_, j) => j !== i))}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {/* Type + unit + winner mode */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <select
                            className="h-10 rounded-lg border bg-background px-3 text-sm"
                            value={row.kind}
                            onChange={(e) => {
                              const kind = e.target.value as SpecKind;
                              const nextMode: WinnerMode =
                                isNumericKind(kind) && row.winnerMode === 'manual' ? 'higher_better'
                                  : !isNumericKind(kind) && (row.winnerMode === 'higher_better' || row.winnerMode === 'lower_better') ? 'manual'
                                    : row.winnerMode;
                              patchSpec(i, { kind, winnerMode: nextMode });
                            }}
                          >
                            {KIND_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <Input
                            placeholder="Unit (e.g. mAh)"
                            value={row.unit}
                            disabled={!isNumericKind(row.kind)}
                            onChange={(e) => patchSpec(i, { unit: e.target.value })}
                          />
                          <select
                            className="h-10 rounded-lg border bg-background px-3 text-sm"
                            value={row.winnerMode}
                            onChange={(e) => patchSpec(i, { winnerMode: e.target.value as WinnerMode })}
                          >
                            {WINNER_MODES.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        {/* Value inputs — vary by type */}
                        <div className="grid grid-cols-2 gap-2">
                          {isNumericKind(row.kind) ? (
                            <>
                              <Input type="number" placeholder="Value A" value={row.aNum} onChange={(e) => patchSpec(i, { aNum: e.target.value })} />
                              <Input type="number" placeholder="Value B" value={row.bNum} onChange={(e) => patchSpec(i, { bNum: e.target.value })} />
                            </>
                          ) : row.kind === 'boolean' ? (
                            <>
                              <select className="h-10 rounded-lg border bg-background px-3 text-sm" value={row.aBool ? 'yes' : 'no'} onChange={(e) => patchSpec(i, { aBool: e.target.value === 'yes' })}>
                                <option value="no">A: No</option>
                                <option value="yes">A: Yes</option>
                              </select>
                              <select className="h-10 rounded-lg border bg-background px-3 text-sm" value={row.bBool ? 'yes' : 'no'} onChange={(e) => patchSpec(i, { bBool: e.target.value === 'yes' })}>
                                <option value="no">B: No</option>
                                <option value="yes">B: Yes</option>
                              </select>
                            </>
                          ) : row.kind === 'list' ? (
                            <>
                              <textarea className="min-h-[64px] rounded-lg border bg-background p-2 text-sm" placeholder="A items (one per line)" value={row.aText} onChange={(e) => patchSpec(i, { aText: e.target.value })} />
                              <textarea className="min-h-[64px] rounded-lg border bg-background p-2 text-sm" placeholder="B items (one per line)" value={row.bText} onChange={(e) => patchSpec(i, { bText: e.target.value })} />
                            </>
                          ) : (
                            <>
                              <Input placeholder="Value A" value={row.aText} onChange={(e) => patchSpec(i, { aText: e.target.value })} />
                              <Input placeholder="Value B" value={row.bText} onChange={(e) => patchSpec(i, { bText: e.target.value })} />
                            </>
                          )}
                        </div>
                        {/* Manual winner (only meaningful for manual mode) */}
                        {row.winnerMode === 'manual' && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Winner</span>
                            <select
                              className="h-9 rounded-lg border bg-background px-3 text-sm"
                              value={row.winner}
                              onChange={(e) => patchSpec(i, { winner: e.target.value as SpecRow['winner'] })}
                            >
                              <option value="tie">Tie</option>
                              <option value="A">Product A</option>
                              <option value="B">Product B</option>
                            </select>
                          </div>
                        )}
                        <Input
                          placeholder="Details (optional)"
                          value={row.details}
                          onChange={(e) => patchSpec(i, { details: e.target.value })}
                        />
                      </div>
                    ))}
                    {specs.length === 0 && <p className="text-sm text-muted-foreground">No specs yet.</p>}
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

              {activeTab === 'editorial' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Editor Summary</label>
                    <textarea className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm" placeholder="Rich intro shown above the comparison (falls back to Summary if empty)" value={form.editorSummary} onChange={(e) => set('editorSummary', e.target.value)} />
                  </div>
                  <div className="space-y-2 max-w-md">
                    <label className="text-sm font-medium">Best for</label>
                    <Input placeholder="e.g. Premium flagship buyers" value={form.bestFor} onChange={(e) => set('bestFor', e.target.value)} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Who should buy — {productName(form.productAId) || 'Product A'}</label>
                      <textarea className="w-full min-h-[90px] rounded-lg border bg-background p-3 text-sm" value={form.whoShouldBuyA} onChange={(e) => set('whoShouldBuyA', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Who should buy — {productName(form.productBId) || 'Product B'}</label>
                      <textarea className="w-full min-h-[90px] rounded-lg border bg-background p-3 text-sm" value={form.whoShouldBuyB} onChange={(e) => set('whoShouldBuyB', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Score A (0–100)</label>
                      <Input type="number" min={0} max={100} value={form.scoreA} onChange={(e) => set('scoreA', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Score B (0–100)</label>
                      <Input type="number" min={0} max={100} value={form.scoreB} onChange={(e) => set('scoreB', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2 max-w-xs">
                    <label className="text-sm font-medium">Review status</label>
                    <select className="w-full h-10 rounded-lg border bg-background px-3" value={form.reviewStatus} onChange={(e) => set('reviewStatus', e.target.value)}>
                      <option value="draft">Draft</option>
                      <option value="in_review">In review</option>
                      <option value="approved">Approved</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" className="h-4 w-4" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
                      Featured comparison
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" className="h-4 w-4" checked={form.stickyCta} onChange={(e) => set('stickyCta', e.target.checked)} />
                      Show sticky buy bar on the public page
                    </label>
                  </div>
                </>
              )}

              {activeTab === 'faq' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">FAQ</h3>
                      <Button variant="outline" size="sm" onClick={() => setFaq((f) => [...f, { question: '', answer: '' }])}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Question
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {faq.map((row, i) => (
                        <div key={i} className="p-4 rounded-lg bg-muted/50 space-y-2">
                          <div className="flex items-center gap-2">
                            <Input placeholder="Question" value={row.question} onChange={(e) => setFaq((f) => f.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
                            <Button variant="ghost" size="icon" onClick={() => setFaq((f) => f.filter((_, j) => j !== i))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <textarea className="w-full min-h-[70px] rounded-lg border bg-background p-2 text-sm" placeholder="Answer" value={row.answer} onChange={(e) => setFaq((f) => f.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
                        </div>
                      ))}
                      {faq.length === 0 && <p className="text-sm text-muted-foreground">No FAQ entries yet.</p>}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-1">Recommended Alternatives</h3>
                    <p className="text-sm text-muted-foreground mb-3">Only published products appear on the public page.</p>
                    <div className="flex items-center gap-2 mb-3">
                      <select
                        className="h-10 rounded-lg border bg-background px-3 text-sm flex-1"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) setAltIds((ids) => [...ids, e.target.value]);
                        }}
                      >
                        <option value="">Add a product…</option>
                        {altCandidates.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {altIds.map((id) => (
                        <span key={id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
                          {productName(id) || id}
                          <button type="button" onClick={() => setAltIds((ids) => ids.filter((x) => x !== id))} aria-label="Remove">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                      {altIds.length === 0 && <p className="text-sm text-muted-foreground">No alternatives selected.</p>}
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
