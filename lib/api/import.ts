// Frontend Import Center API client (Phase 6): CSV/ASIN/category imports, jobs,
// reports, stats, templates. Same-origin (proxied via next.config.js rewrites);
// mutations send the cs_csrf double-submit token, mirroring lib/api/catalog.ts.

interface Envelope<T> {
  status: 'success' | 'error';
  data: T;
  meta: { pagination?: ImportPagination; [k: string]: unknown } | null;
  message: string;
  errors: Record<string, unknown>;
}

export interface ImportPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export class ImportApiError extends Error {
  status: number;
  errors: Record<string, unknown>;
  constructor(message: string, status: number, errors: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ImportApiError';
    this.status = status;
    this.errors = errors;
  }
}

export type DuplicateMode = 'skip' | 'overwrite' | 'create_copy';
export type ImportType = 'csv_product' | 'asin' | 'category';
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ImportJob {
  id: string;
  type: ImportType;
  name: string | null;
  status: ImportJobStatus;
  source: string;
  duplicateMode: DuplicateMode;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  report: ImportReport | null;
  error: string | null;
  createdAt: string;
}

export interface ImportItem {
  id: string;
  position: number;
  externalId: string | null;
  status: 'pending' | 'success' | 'failed' | 'skipped' | 'duplicate';
  errors: string[];
  createdProductId: string | null;
  createdCategoryId: string | null;
}

export interface ImportJobDetail extends ImportJob {
  items: ImportItem[];
}

export interface ImportReport {
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
  total: number;
  durationMs: number;
  startedAt: string | null;
  completedAt: string | null;
  errors: { position: number; externalId: string | null; errors: string[] }[];
}

export interface ImportStats {
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  queuedItems: number;
  todayImported: number;
  successRate: number;
}

export interface ImportTemplate {
  id: string;
  name: string;
  type: ImportType;
  mappings: Record<string, unknown>;
  createdAt: string;
}

const BASE = '/api';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function raw<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (init.method && init.method !== 'GET') {
    const csrf = readCookie('cs_csrf');
    if (csrf) headers['x-csrf-token'] = csrf;
  }
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...init, headers });
  const body = (await res.json().catch(() => ({}))) as Partial<Envelope<T>>;
  if (!res.ok || body.status === 'error') {
    throw new ImportApiError(body.message || 'Request failed', res.status, body.errors ?? {});
  }
  return body as Envelope<T>;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await raw<T>(path, init)).data;
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export interface JobsQuery {
  page?: number;
  perPage?: number;
  status?: ImportJobStatus | 'active';
  type?: ImportType;
}

export interface CategoryInput {
  name: string;
  parentName?: string;
  slug?: string;
  description?: string;
}

export const importApi = {
  getStats: (): Promise<ImportStats> => request<ImportStats>('/import/stats', { method: 'GET' }),

  listJobs: async (q: JobsQuery = {}): Promise<{ items: ImportJob[]; pagination: ImportPagination }> => {
    const env = await raw<ImportJob[]>(`/import/jobs${qs(q as Record<string, unknown>)}`, { method: 'GET' });
    return {
      items: env.data,
      pagination: env.meta?.pagination ?? { page: 1, perPage: env.data.length, total: env.data.length, totalPages: 1 },
    };
  },

  getJob: (id: string): Promise<ImportJobDetail> => request<ImportJobDetail>(`/import/jobs/${id}`, { method: 'GET' }),

  getReport: (id: string): Promise<ImportReport> => request<ImportReport>(`/import/jobs/${id}/report`, { method: 'GET' }),

  createCsv: (input: { fileName: string; csv: string; duplicateMode?: DuplicateMode; name?: string }): Promise<ImportJob> =>
    request<ImportJob>('/import/csv', { method: 'POST', body: JSON.stringify(input) }),

  createAsins: (input: { asins: string[]; duplicateMode?: DuplicateMode; name?: string }): Promise<ImportJob> =>
    request<ImportJob>('/import/asins', { method: 'POST', body: JSON.stringify(input) }),

  createCategories: (input: { categories: CategoryInput[]; duplicateMode?: DuplicateMode; name?: string }): Promise<ImportJob> =>
    request<ImportJob>('/import/categories', { method: 'POST', body: JSON.stringify(input) }),

  retry: (id: string): Promise<ImportJob> => request<ImportJob>(`/import/jobs/${id}/retry`, { method: 'POST' }),

  cancel: (id: string): Promise<ImportJob> => request<ImportJob>(`/import/jobs/${id}/cancel`, { method: 'POST' }),

  listTemplates: (): Promise<ImportTemplate[]> => request<ImportTemplate[]>('/import/templates', { method: 'GET' }),

  // ── Import through API (PA-API) — readiness/start/history (no secrets) ──
  getApiConfig: (): Promise<ApiImportConfig> => request<ApiImportConfig>('/admin/import/api/config', { method: 'GET' }),
  startApiImport: (): Promise<ApiImportStartResult> => request<ApiImportStartResult>('/admin/import/api/start', { method: 'POST' }),
  getApiHistory: (): Promise<ApiImportHistoryRow[]> => request<ApiImportHistoryRow[]>('/admin/import/api/history', { method: 'GET' }),

  // ── Amazon PA-API Import Wizard (additive; always-queued) ──
  startPaapiWizard: (input: PaapiWizardInput): Promise<PaapiWizardStart> =>
    request<PaapiWizardStart>('/admin/import/api/wizard', { method: 'POST', body: JSON.stringify(input) }),
  getPaapiWizardStatus: (id: string): Promise<PaapiWizardStatus> =>
    request<PaapiWizardStatus>(`/admin/import/api/wizard/${id}`, { method: 'GET' }),
};

export interface PaapiWizardCategoryInput {
  category: string;
  keywords: string[];
  brand?: string;
}
export interface PaapiWizardInput {
  marketplace?: string;
  categories: PaapiWizardCategoryInput[];
  productsPerKeyword?: number;
  duplicateMode?: DuplicateMode;
  dryRun?: boolean;
  name?: string;
}
export interface PaapiWizardStart {
  resolveJobId: string;
  dryRun: boolean;
}
export interface PaapiWizardPreviewRow {
  category: string;
  keyword: string;
  asin: string;
  title: string;
  brand: string;
  image: string;
}
export interface PaapiWizardStatus {
  resolveJobId: string;
  state: string; // waiting | active | completed | failed | delayed
  progress: number;
  result:
    | { dryRun: true; resolved: number; rows: PaapiWizardPreviewRow[] }
    | { dryRun: false; importJobId: string; resolved: number; productRows: number }
    | null;
  error: string | null;
}

export interface ApiImportConfig {
  provider: 'amazon-paapi';
  partnerType: string;
  ready: boolean;
  required: string[];
  missing: string[];
  partnerTagConfigured: boolean;
  marketplace: string;
  region: string;
  host: string | null;
  keywordsFile: string;
  reviewFile: string;
}

export interface ApiImportStartResult {
  provider: 'amazon-paapi';
  keywords: number;
  rows: number;
  selected: number;
  reviewFile: string;
  message: string;
}

export interface ApiImportHistoryRow {
  id: string;
  type: string;
  status: string;
  source: string;
  totalItems: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
}
