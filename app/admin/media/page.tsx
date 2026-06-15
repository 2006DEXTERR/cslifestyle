'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Upload, Search, Copy, Trash2, RefreshCw, X, Check, AlertTriangle, HardDrive, Layers, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import { mediaApi, type MediaAsset, type MediaStats, type MediaUsage } from '@/lib/api/media';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [search, setSearch] = useState('');
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [usages, setUsages] = useState<MediaUsage[]>([]);
  const [altDraft, setAltDraft] = useState('');

  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([mediaApi.getStats(), mediaApi.list({ perPage: 60, search: search || undefined, unused: unusedOnly || undefined })]);
      setStats(s);
      setAssets(list.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    }
  }, [search, unusedOnly]);

  useEffect(() => { void refresh(); }, [refresh]);

  const flash = (m: string) => { setMessage(m); window.setTimeout(() => setMessage(null), 4000); };

  const doUpload = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await mediaApi.upload(arr);
      flash(`Uploaded ${res.uploaded.length} file(s)${res.duplicates ? ` (${res.duplicates} duplicate)` : ''}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) void doUpload(e.dataTransfer.files);
  };

  const openDetail = async (a: MediaAsset) => {
    setSelected(a);
    setAltDraft(a.altText ?? '');
    try { setUsages(await mediaApi.listUsage(a.id)); } catch { setUsages([]); }
  };

  const copyUrl = async (url: string | null) => {
    if (!url) return;
    try { await navigator.clipboard.writeText(window.location.origin + url); flash('URL copied.'); } catch { /* ignore */ }
  };

  const onDelete = async (id: string) => {
    try { await mediaApi.remove(id); setSelected(null); flash('Asset deleted.'); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Delete failed'); }
  };

  const saveAlt = async () => {
    if (!selected) return;
    try { const u = await mediaApi.update(selected.id, { altText: altDraft }); setSelected(u); flash('Saved.'); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Save failed'); }
  };

  const onReplace = async (file: File | undefined) => {
    if (!file || !selected) return;
    try { const u = await mediaApi.replace(selected.id, file); setSelected(u); flash('Asset replaced.'); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Replace failed'); }
  };

  const statCards = [
    { label: 'Total Assets', value: stats ? formatNumber(stats.totalAssets) : '—', icon: ImageIcon, color: 'bg-blue-100 dark:bg-blue-950/30', tint: 'text-blue-600' },
    { label: 'Storage Used', value: stats ? formatBytes(stats.totalSize) : '—', icon: HardDrive, color: 'bg-purple-100 dark:bg-purple-950/30', tint: 'text-purple-600' },
    { label: 'Unused Assets', value: stats ? formatNumber(stats.unusedCount) : '—', icon: Layers, color: 'bg-orange-100 dark:bg-orange-950/30', tint: 'text-orange-600' },
    { label: 'Folders', value: stats ? formatNumber(stats.folders) : '—', icon: Layers, color: 'bg-green-100 dark:bg-green-950/30', tint: 'text-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Media Library</h1>
          <p className="text-muted-foreground">Upload, organize and track image assets</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl">
            <Upload className="h-4 w-4" /> Upload
          </button>
          <input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,.webp,.svg" multiple className="hidden" onChange={(e) => { if (e.target.files) void doUpload(e.target.files); e.target.value = ''; }} />
          <input ref={replaceInput} type="file" accept=".jpg,.jpeg,.png,.webp,.svg" className="hidden" onChange={(e) => { void onReplace(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>

      {message && <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-700 dark:text-green-400"><Check className="h-4 w-4" /> {message}</div>}
      {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600"><AlertTriangle className="h-4 w-4" /> {error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className={cn('rounded-lg p-3', card.color)}><card.icon className={cn('h-6 w-6', card.tint)} /></div>
            </div>
            <div className="mt-4"><p className="text-2xl font-bold text-foreground">{card.value}</p><p className="text-sm text-muted-foreground">{card.label}</p></div>
          </div>
        ))}
      </div>

      {/* Upload dropzone + search */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn('rounded-xl border-2 border-dashed bg-card p-8 text-center transition-colors', dragging ? 'border-brand-pink bg-brand-pink/5' : 'border-border')}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-foreground">{busy ? 'Uploading…' : 'Drag & drop images here, or click Upload'}</p>
        <p className="text-xs text-muted-foreground">JPG, PNG, WebP, SVG — up to 10 MB each</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by file name..." className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2.5 text-sm focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink" />
        </div>
        <button onClick={() => setUnusedOnly((v) => !v)} className={cn('inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors', unusedOnly ? 'border-brand-pink text-brand-pink bg-brand-pink/5' : 'border-border text-muted-foreground hover:text-foreground')}>
          <Layers className="h-4 w-4" /> Unused only
        </button>
      </div>

      {/* Grid */}
      {assets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No media assets yet. Upload to get started.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {assets.map((a) => (
            <div key={a.id} className="group rounded-xl border border-border bg-card overflow-hidden hover:border-brand-pink hover:shadow-md transition-all">
              <button onClick={() => void openDetail(a)} className="block w-full aspect-square bg-muted/30 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.thumbnailUrl ?? a.url ?? ''} alt={a.altText ?? a.originalName} className="h-full w-full object-cover" />
              </button>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-foreground" title={a.originalName}>{a.originalName}</p>
                <p className="text-xs text-muted-foreground">{a.width && a.height ? `${a.width}×${a.height} · ` : ''}{formatBytes(a.size)}</p>
                <div className="mt-2 flex items-center gap-1">
                  <button onClick={() => void copyUrl(a.url)} title="Copy URL" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-accent"><Copy className="h-3.5 w-3.5" /></button>
                  <button onClick={() => void openDetail(a)} title="Details / usage" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-accent"><Link2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => void onDelete(a.id)} title="Delete" className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-lg rounded-2xl bg-card border p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold truncate">{selected.originalName}</h2>
                <button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-muted"><X className="h-5 w-5" /></button>
              </div>
              <div className="aspect-video rounded-lg bg-muted/30 overflow-hidden mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.url ?? ''} alt={selected.altText ?? selected.originalName} className="h-full w-full object-contain" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Dimensions</p><p className="font-medium">{selected.width && selected.height ? `${selected.width}×${selected.height}` : '—'}</p></div>
                <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Size · Type</p><p className="font-medium">{formatBytes(selected.size)} · {selected.mimeType.split('/')[1]}</p></div>
              </div>
              <label className="block text-sm font-medium mb-1">Alt text</label>
              <div className="flex items-center gap-2 mb-4">
                <input value={altDraft} onChange={(e) => setAltDraft(e.target.value)} placeholder="Describe the image for accessibility/SEO" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink" />
                <button onClick={() => void saveAlt()} className="rounded-lg bg-brand-gradient px-3 py-2 text-sm font-semibold text-white hover:opacity-90">Save</button>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => void copyUrl(selected.url)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent"><Copy className="h-4 w-4" /> Copy URL</button>
                <button onClick={() => replaceInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent"><RefreshCw className="h-4 w-4" /> Replace</button>
                <button onClick={() => void onDelete(selected.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /> Delete</button>
              </div>
              <h3 className="text-sm font-semibold mb-2">Usage ({usages.length})</h3>
              {usages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not used by any content — safe to delete.</p>
              ) : (
                <div className="space-y-1">
                  {usages.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                      <span className="capitalize text-foreground">{u.entityType}{u.field ? ` · ${u.field}` : ''}</span>
                      <span className="text-xs text-muted-foreground font-mono">{u.entityId.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
