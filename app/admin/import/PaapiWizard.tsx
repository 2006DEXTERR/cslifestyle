'use client';

import * as React from 'react';
import { Sparkles, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { importApi, ImportApiError, type PaapiWizardInput, type PaapiWizardResult, type DuplicateMode } from '@/lib/api/import';
import { catalogApi } from '@/lib/api/catalog';

/**
 * Amazon PA-API Import Wizard (additive, self-contained). Lets an admin pick categories +
 * keywords (+ optional brand), then enqueues a background resolution job. PA-API runs in the
 * worker; resolved products are fed into the EXISTING importer. Styling mirrors the existing
 * Import Center cards — no redesign, no changes to other wizards.
 */

interface CatGroup {
  category: string;
  brand: string;
  keywords: string; // newline / comma separated in the textarea
}

const emptyGroup = (): CatGroup => ({ category: '', brand: '', keywords: '' });
const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-pink';

export function PaapiWizard({
  onCreated,
  open: openProp,
  onOpenChange,
}: {
  onCreated: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  // Uncontrolled by default; becomes controlled when the parent passes `open`/`onOpenChange`.
  const [openState, setOpenState] = React.useState(false);
  const open = openProp ?? openState;
  const setOpen = React.useCallback(
    (next: boolean) => (onOpenChange ? onOpenChange(next) : setOpenState(next)),
    [onOpenChange],
  );
  const [cats, setCats] = React.useState<{ slug: string; name: string }[]>([]);
  const [brands, setBrands] = React.useState<{ slug: string; name: string }[]>([]);

  const [groups, setGroups] = React.useState<CatGroup[]>([emptyGroup()]);
  const [marketplace, setMarketplace] = React.useState('');
  const [productsPerKeyword, setProductsPerKeyword] = React.useState(1);
  const [duplicateMode, setDuplicateMode] = React.useState<DuplicateMode>('skip');
  const [name, setName] = React.useState('');

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PaapiWizardResult | null>(null);

  React.useEffect(() => {
    if (!open) return;
    void catalogApi.listCategories({ status: 'active' }).then((r) => setCats(r.map((c) => ({ slug: c.slug, name: c.name })))).catch(() => undefined);
    void catalogApi.listBrands({ status: 'active' }).then((r) => setBrands(r.map((b) => ({ slug: b.slug, name: b.name })))).catch(() => undefined);
  }, [open]);

  const setGroup = (i: number, patch: Partial<CatGroup>) =>
    setGroups((g) => g.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const buildInput = (dryRun: boolean): PaapiWizardInput | null => {
    const categories = groups
      .map((g) => ({
        category: g.category.trim(),
        brand: g.brand.trim() || undefined,
        keywords: g.keywords.split(/[\n,]/).map((k) => k.trim()).filter(Boolean),
      }))
      .filter((g) => g.category && g.keywords.length > 0);
    if (categories.length === 0) {
      setError('Add at least one category with a keyword.');
      return null;
    }
    return {
      marketplace: marketplace.trim() || undefined,
      categories,
      productsPerKeyword,
      duplicateMode,
      dryRun,
      name: name.trim() || undefined,
    };
  };

  // Direct/synchronous: the request resolves PA-API + creates the import, then returns.
  const run = async (dryRun: boolean) => {
    setError(null);
    setResult(null);
    const input = buildInput(dryRun);
    if (!input) return;
    setBusy(true);
    try {
      const res = await importApi.startPaapiWizard(input);
      setResult(res);
      if (!res.dryRun) onCreated();
    } catch (e) {
      setError(e instanceof ImportApiError ? e.message : 'Import failed. Check PA-API credentials and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 p-6 text-left"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Amazon PA-API Import Wizard</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick categories &amp; keywords — we search Amazon PA-API and feed the results straight into the existing importer for review &amp; publish.
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="space-y-5 border-t border-border p-6">
          {/* Category groups */}
          <div className="space-y-4">
            {groups.map((g, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
                    <select className={inputCls} value={g.category} onChange={(e) => setGroup(i, { category: e.target.value })}>
                      <option value="">Select a category…</option>
                      {cats.map((c) => (
                        <option key={c.slug} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Brand (optional)</label>
                    <select className={inputCls} value={g.brand} onChange={(e) => setGroup(i, { brand: e.target.value })}>
                      <option value="">Any brand</option>
                      {brands.map((b) => (
                        <option key={b.slug} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Keywords (one per line or comma-separated)</label>
                  <textarea
                    className={`${inputCls} min-h-[72px]`}
                    placeholder={'Redmi Note 13 Pro 5G\nOnePlus 12R'}
                    value={g.keywords}
                    onChange={(e) => setGroup(i, { keywords: e.target.value })}
                  />
                </div>
                {groups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setGroups((gs) => gs.filter((_, idx) => idx !== i))}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setGroups((g) => [...g, emptyGroup()])}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Add another category
            </button>
          </div>

          {/* Options */}
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Products per keyword</label>
              <input
                type="number"
                min={1}
                max={10}
                className={inputCls}
                value={productsPerKeyword}
                onChange={(e) => setProductsPerKeyword(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Duplicate mode</label>
              <select className={inputCls} value={duplicateMode} onChange={(e) => setDuplicateMode(e.target.value as DuplicateMode)}>
                <option value="skip">Skip</option>
                <option value="overwrite">Overwrite</option>
                <option value="create_copy">Create copy</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Marketplace (optional)</label>
              <input className={inputCls} placeholder="www.amazon.in (default)" value={marketplace} onChange={(e) => setMarketplace(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Import name (optional)</label>
              <input className={inputCls} placeholder="e.g. Q3 phones" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" disabled={busy} onClick={() => void run(true)}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Preview (Dry Run)
            </Button>
            <Button className="bg-brand-gradient hover:opacity-90" disabled={busy} onClick={() => void run(false)}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Start Import
            </Button>
            {busy && (
              <span className="text-xs text-muted-foreground">Searching Amazon PA-API… this can take a moment.</span>
            )}
          </div>

          {/* Result (direct — no queue polling) */}
          {result && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              {result.dryRun ? (
                <div>
                  <p className="mb-2 font-medium">Preview — {result.resolved} product(s) resolved (nothing imported):</p>
                  {result.rows.length === 0 ? (
                    <p className="text-muted-foreground">No products matched those keywords.</p>
                  ) : (
                    <div className="max-h-64 overflow-auto rounded-md border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 text-left text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2">ASIN</th>
                            <th className="px-3 py-2">Title</th>
                            <th className="px-3 py-2">Brand</th>
                            <th className="px-3 py-2">Category</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {result.rows.map((r) => (
                            <tr key={r.asin}>
                              <td className="px-3 py-1.5 font-mono">{r.asin}</td>
                              <td className="px-3 py-1.5">{r.title}</td>
                              <td className="px-3 py-1.5">{r.brand}</td>
                              <td className="px-3 py-1.5">{r.category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-green-600">
                  Resolved {result.productRows} product(s) → import created. See the <strong>Import Queue</strong> / <strong>History</strong> tabs; products land as drafts for review &amp; publish.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
