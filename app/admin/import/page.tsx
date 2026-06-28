'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Link2,
  FileText,
  FolderTree,
  Pause,
  Trash2,
  RefreshCw,
  Settings,
  Activity,
  Check,
  X,
  Clock,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import {
  importApi,
  type DuplicateMode,
  type ImportJob,
  type ImportStats,
  type CategoryInput,
  type ApiImportConfig,
} from '@/lib/api/import';

const importTypes = [
  { id: 'asin', name: 'ASIN Import', icon: Link2, description: 'Import from Amazon ASIN', color: 'bg-orange-500' },
  { id: 'csv', name: 'CSV Import', icon: FileText, description: 'Bulk import from CSV file', color: 'bg-blue-500' },
  { id: 'url', name: 'URL Import', icon: Link2, description: 'Import from product URL', color: 'bg-green-500' },
  { id: 'category', name: 'Category Import', icon: FolderTree, description: 'Import from browse nodes', color: 'bg-purple-500' },
] as const;

const duplicateModes: { id: DuplicateMode; label: string; hint: string }[] = [
  { id: 'skip', label: 'Skip', hint: 'Leave existing records untouched' },
  { id: 'overwrite', label: 'Overwrite', hint: 'Update the existing record' },
  { id: 'create_copy', label: 'Create copy', hint: 'Insert a new, distinct record' },
];

// Backend → UI status vocabulary (the original mock used "running").
function displayStatus(status: ImportJob['status']): 'running' | 'pending' | 'completed' | 'failed' | 'cancelled' {
  if (status === 'processing') return 'running';
  return status;
}

const typeLabel: Record<ImportJob['type'], string> = {
  csv_product: 'CSV',
  asin: 'ASIN',
  category: 'Category',
};

export default function ImportCenterPage() {
  const [activeTab, setActiveTab] = useState<'wizards' | 'queue' | 'history'>('wizards');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Live data.
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Wizard form state.
  const [importName, setImportName] = useState('');
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('skip');
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState('import.csv');
  const [asinText, setAsinText] = useState('');
  const [categoryText, setCategoryText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resultJob, setResultJob] = useState<ImportJob | null>(null);

  // Import through API (PA-API) state — readiness + run lifecycle (no secret values).
  const [apiConfig, setApiConfig] = useState<ApiImportConfig | null>(null);
  const [apiState, setApiState] = useState<'checking' | 'idle' | 'running' | 'completed' | 'failed'>('checking');
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, j] = await Promise.all([importApi.getStats(), importApi.listJobs({ perPage: 50 })]);
      setStats(s);
      setJobs(j.items);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load import data');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ── Import through API (PA-API) ──
  const checkApiConfig = useCallback(async () => {
    setApiState((s) => (s === 'running' ? s : 'checking'));
    try {
      const cfg = await importApi.getApiConfig();
      setApiConfig(cfg);
      setApiState((s) => (s === 'running' ? s : 'idle'));
    } catch {
      setApiState((s) => (s === 'running' ? s : 'idle'));
    }
  }, []);

  const startApiImport = useCallback(async () => {
    setApiState('running');
    setApiMessage(null);
    try {
      const r = await importApi.startApiImport();
      setApiState('completed');
      setApiMessage(r.message);
      void refresh();
    } catch (err) {
      // Surfaces the clear backend message (e.g. "Amazon PA-API credentials are not configured.")
      setApiState('failed');
      setApiMessage(err instanceof Error ? err.message : 'API import failed');
      void checkApiConfig();
    }
  }, [refresh, checkApiConfig]);

  useEffect(() => {
    void checkApiConfig();
  }, [checkApiConfig]);

  // Poll while there are in-flight jobs so progress bars stay live.
  const hasActive = jobs.some((j) => j.status === 'pending' || j.status === 'processing');
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(() => void refreshRef.current(), 4000);
    return () => clearInterval(t);
  }, [hasActive]);

  const queueJobs = jobs.filter((j) => ['pending', 'processing'].includes(j.status));
  const historyJobs = jobs.filter((j) => ['completed', 'failed', 'cancelled'].includes(j.status));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30';
      case 'pending': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30';
      case 'completed': return 'text-green-600 bg-green-50 dark:bg-green-950/30';
      case 'failed': return 'text-red-600 bg-red-50 dark:bg-red-950/30';
      case 'cancelled': return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
    }
  };

  const resetWizard = () => {
    setShowImportWizard(false);
    setWizardStep(1);
    setSelectedType(null);
    setImportName('');
    setDuplicateMode('skip');
    setCsvText('');
    setCsvFileName('import.csv');
    setAsinText('');
    setCategoryText('');
    setSubmitError(null);
    setResultJob(null);
    setSubmitting(false);
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const parseCategories = (text: string): CategoryInput[] =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // "Name | Parent" or "Name > Parent" or just "Name".
        const [name, parent] = line.split(/\s*[|>]\s*/);
        return parent ? { name: name.trim(), parentName: parent.trim() } : { name: name.trim() };
      });

  const startImport = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const name = importName.trim() || undefined;
      let job: ImportJob;
      if (selectedType === 'csv') {
        if (!csvText.trim()) throw new Error('Paste CSV content or choose a file');
        job = await importApi.createCsv({ fileName: csvFileName, csv: csvText, duplicateMode, name });
      } else if (selectedType === 'asin') {
        const asins = asinText.split(/[\s,]+/).map((a) => a.trim()).filter(Boolean);
        if (asins.length === 0) throw new Error('Enter at least one ASIN');
        job = await importApi.createAsins({ asins, duplicateMode, name });
      } else if (selectedType === 'category') {
        const categories = parseCategories(categoryText);
        if (categories.length === 0) throw new Error('Enter at least one category');
        job = await importApi.createCategories({ categories, duplicateMode, name });
      } else {
        throw new Error('This import type is not available yet');
      }
      setResultJob(job);
      setWizardStep(3);
      await refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onCancelJob = async (id: string) => {
    try {
      await importApi.cancel(id);
      await refresh();
    } catch {
      /* surfaced via reload */
    }
  };

  const onRetryJob = async (id: string) => {
    try {
      await importApi.retry(id);
      await refresh();
    } catch {
      /* surfaced via reload */
    }
  };

  const statCards = [
    { label: 'Active Jobs', value: stats ? String(stats.activeJobs) : '—', tone: 'text-foreground' },
    { label: 'Queued Items', value: stats ? String(stats.queuedItems) : '—', tone: 'text-foreground' },
    { label: 'Today Imported', value: stats ? String(stats.todayImported) : '—', tone: 'text-foreground' },
    { label: 'Success Rate', value: stats ? `${stats.successRate}%` : '—', tone: 'text-green-600' },
  ];

  const urlSelected = selectedType === 'url';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Center</h1>
          <p className="text-muted-foreground">Import products from multiple sources</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void refresh()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Settings className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => { resetWizard(); setShowImportWizard(true); }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            New Import
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" />
          {loadError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className={cn('text-2xl font-bold', card.tone)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          {[
            { id: 'wizards', label: 'Import Wizards', icon: Upload },
            { id: 'queue', label: 'Import Queue', icon: Activity },
            { id: 'history', label: 'History', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-brand-pink text-brand-pink'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'wizards' && (
          <motion.div
            key="wizards"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {importTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    resetWizard();
                    setSelectedType(type.id);
                    setShowImportWizard(true);
                    setWizardStep(1);
                  }}
                  className="group rounded-xl border border-border bg-card p-6 text-left hover:border-brand-pink hover:shadow-md transition-all"
                >
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', type.color)}>
                    <type.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-brand-pink transition-colors">
                    {type.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                </button>
              ))}
            </div>

            {/* Import through API (PA-API) — readiness, run, and review-before-publish. */}
            {(() => {
              const ready = apiConfig?.ready ?? false;
              const badge =
                apiState === 'running'
                  ? { label: 'Import running', cls: 'bg-blue-500/10 text-blue-600' }
                  : apiState === 'completed'
                    ? { label: 'Import completed', cls: 'bg-green-500/10 text-green-600' }
                    : apiState === 'failed'
                      ? { label: 'Import failed', cls: 'bg-red-500/10 text-red-600' }
                      : apiState === 'checking'
                        ? { label: 'Checking…', cls: 'bg-muted text-muted-foreground' }
                        : ready
                          ? { label: 'Ready', cls: 'bg-green-500/10 text-green-600' }
                          : { label: 'Missing credentials', cls: 'bg-yellow-500/10 text-yellow-600' };
              return (
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-gradient">
                        <Activity className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Import through API</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Fetch product data from approved API providers and review before publishing.
                        </p>
                      </div>
                    </div>
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap', badge.cls)}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Missing-credentials blocked state — shows required var NAMES only (no secret values). */}
                  {apiConfig && !ready && (
                    <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm">
                      <div className="flex items-center gap-2 font-medium text-yellow-700">
                        <AlertTriangle className="h-4 w-4" />
                        Provider not configured — set these environment variables:
                      </div>
                      <ul className="mt-2 ml-6 list-disc text-muted-foreground">
                        {(apiConfig.missing.length ? apiConfig.missing : apiConfig.required).map((v) => (
                          <li key={v}><code>{v}</code></li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Provider: {apiConfig.provider} · Partner type: {apiConfig.partnerType} · Marketplace: {apiConfig.marketplace} · Region: {apiConfig.region}
                      </p>
                    </div>
                  )}

                  {/* Result / error message (no secrets). */}
                  {apiMessage && (
                    <div
                      className={cn(
                        'mt-4 rounded-lg p-3 text-sm',
                        apiState === 'failed' ? 'bg-red-500/5 text-red-600' : 'bg-green-500/5 text-green-700',
                      )}
                    >
                      {apiMessage}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={startApiImport}
                      disabled={!ready || apiState === 'running' || apiState === 'checking'}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                      <RefreshCw className={cn('h-4 w-4', apiState === 'running' && 'animate-spin')} />
                      Start API Import
                    </button>
                    <button
                      onClick={checkApiConfig}
                      disabled={apiState === 'running'}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Check API Configuration
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                    >
                      <Clock className="h-4 w-4" />
                      View Import History
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    PA-API only — never scrapes. Fetched results are written to <code>{apiConfig?.reviewFile ?? 'amazon-products.review.csv'}</code> for review;
                    products are not published until you apply them.
                  </p>
                </div>
              );
            })()}
          </motion.div>
        )}

        {activeTab === 'queue' && (
          <motion.div
            key="queue"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {queueJobs.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                No active or queued imports.
              </div>
            )}
            {queueJobs.map((job) => {
              const ds = displayStatus(job.status);
              return (
                <div key={job.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('rounded-lg p-2', getStatusColor(ds))}>
                        {ds === 'running' && <RefreshCw className="h-4 w-4 animate-spin" />}
                        {ds === 'pending' && <Clock className="h-4 w-4" />}
                        {ds === 'completed' && <Check className="h-4 w-4" />}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{job.name || job.source}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>{typeLabel[job.type]}</span>
                          <span>•</span>
                          <span>{job.totalItems} items</span>
                          <span>•</span>
                          <span>{formatDate(job.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium capitalize', getStatusColor(ds))}>
                        {ds}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{job.processedItems} / {job.totalItems} items</span>
                      <span className="font-medium text-foreground">{job.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-brand-gradient rounded-full transition-all"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </button>
                    <button
                      onClick={() => void onCancelJob(job.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Import Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Success</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Failed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyJobs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No completed imports yet.
                      </td>
                    </tr>
                  )}
                  {historyJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{job.name || job.source}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{typeLabel[job.type]}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{job.totalItems}</td>
                      <td className="px-4 py-3 text-sm text-green-600">{job.successCount}</td>
                      <td className="px-4 py-3 text-sm text-red-600">{job.failedCount}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(job.completedAt ?? job.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {job.status === 'failed' && (
                          <button
                            onClick={() => void onRetryJob(job.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Wizard Modal */}
      <AnimatePresence>
        {showImportWizard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={resetWizard}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-card border p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Import Wizard</h2>
                <button onClick={resetWizard} className="rounded-lg p-2 hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Steps */}
              <div className="flex items-center gap-2 mb-8">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                      wizardStep >= step ? 'bg-brand-gradient text-white' : 'bg-muted text-muted-foreground'
                    )}>
                      {step}
                    </div>
                    {step < 3 && <div className={cn('w-8 h-0.5', wizardStep > step ? 'bg-brand-pink' : 'bg-muted')} />}
                  </div>
                ))}
              </div>

              {/* Step 1 — type */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Select Import Type</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {importTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={cn(
                          'p-4 rounded-xl border text-left transition-all',
                          selectedType === type.id
                            ? 'border-brand-pink bg-brand-pink/5'
                            : 'border-border hover:border-brand-pink/50'
                        )}
                      >
                        <p className="font-medium">{type.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2 — configure */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Configure Import</h3>

                  {urlSelected ? (
                    <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <span>URL import is not available yet. Use ASIN, CSV or Category import.</span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Import Name</label>
                        <input
                          type="text"
                          value={importName}
                          onChange={(e) => setImportName(e.target.value)}
                          placeholder="Enter a name for this import..."
                          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
                        />
                      </div>

                      {selectedType === 'csv' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-2">CSV File</label>
                            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground cursor-pointer hover:border-brand-pink/50">
                              <Upload className="h-5 w-5" />
                              <span>{csvText ? `${csvFileName} loaded` : 'Click to choose a .csv file'}</span>
                              <input
                                type="file"
                                accept=".csv,text/csv"
                                className="hidden"
                                onChange={(e) => onFile(e.target.files?.[0])}
                              />
                            </label>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">…or paste CSV</label>
                            <textarea
                              value={csvText}
                              onChange={(e) => setCsvText(e.target.value)}
                              rows={4}
                              placeholder="asin,title,brand,category,price,originalPrice,rating,reviewCount,imageUrl,description"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
                            />
                          </div>
                        </div>
                      )}

                      {selectedType === 'asin' && (
                        <div>
                          <label className="block text-sm font-medium mb-2">ASINs</label>
                          <textarea
                            value={asinText}
                            onChange={(e) => setAsinText(e.target.value)}
                            rows={5}
                            placeholder="One ASIN per line, or comma-separated (e.g. B0CXXX1234)"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
                          />
                        </div>
                      )}

                      {selectedType === 'category' && (
                        <div>
                          <label className="block text-sm font-medium mb-2">Categories</label>
                          <textarea
                            value={categoryText}
                            onChange={(e) => setCategoryText(e.target.value)}
                            rows={5}
                            placeholder={'One per line. Nested: "Child | Parent"\nElectronics\nHeadphones | Electronics'}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-2">Duplicate Handling</label>
                        <div className="grid grid-cols-3 gap-2">
                          {duplicateModes.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => setDuplicateMode(m.id)}
                              title={m.hint}
                              className={cn(
                                'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                                duplicateMode === m.id
                                  ? 'border-brand-pink bg-brand-pink/5 text-brand-pink'
                                  : 'border-border text-muted-foreground hover:border-brand-pink/50'
                              )}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {submitError && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          {submitError}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Step 3 — result */}
              {wizardStep === 3 && resultJob && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-medium">Import {resultJob.status === 'completed' ? 'Complete' : 'Started'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {resultJob.successCount} imported · {resultJob.skippedCount} skipped · {resultJob.failedCount} failed
                    {' '}of {resultJob.totalItems} items.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t">
                <button
                  onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
                  disabled={wizardStep === 1 || wizardStep === 3 || submitting}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (wizardStep === 1) {
                      if (selectedType) setWizardStep(2);
                    } else if (wizardStep === 2) {
                      if (!urlSelected) void startImport();
                    } else {
                      resetWizard();
                    }
                  }}
                  disabled={(wizardStep === 1 && !selectedType) || (wizardStep === 2 && (urlSelected || submitting))}
                  className="px-6 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {wizardStep === 3 ? 'Done' : wizardStep === 2 ? (submitting ? 'Starting…' : 'Start Import') : 'Continue'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
