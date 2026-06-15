// Frontend AI Center API client (Phase 7): queue, generation, logs, providers, usage,
// stats, prompts. Same-origin (proxied via next.config.js rewrites); mutations send the
// cs_csrf double-submit token, mirroring lib/api/import.ts.

interface Envelope<T> {
  status: 'success' | 'error';
  data: T;
  meta: { pagination?: AiPagination; [k: string]: unknown } | null;
  message: string;
  errors: Record<string, unknown>;
}

export interface AiPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export class AiApiError extends Error {
  status: number;
  errors: Record<string, unknown>;
  constructor(message: string, status: number, errors: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AiApiError';
    this.status = status;
    this.errors = errors;
  }
}

export type AiEntityType = 'product' | 'guide' | 'comparison' | 'category' | 'brand';
export type AiJobType =
  | 'title' | 'meta_description' | 'description' | 'pros' | 'cons' | 'faq'
  | 'verdict' | 'guide' | 'category_description';
export type AiQueueStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface AiJob {
  id: string;
  entityType: AiEntityType;
  entityId: string;
  jobType: AiJobType;
  status: AiQueueStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  approved: boolean;
  promptTemplate: string | null;
  result: { text: string; provider: string | null; model: string | null } | null;
  error: string | null;
  model: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AiLogEntry {
  id: string;
  queueId: string | null;
  entityType: AiEntityType;
  entityId: string;
  jobType: AiJobType;
  model: string | null;
  provider: string | null;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  status: 'success' | 'failed';
  error: string | null;
  createdAt: string;
}

export interface AiStats {
  totalTokensThisMonth: number;
  costThisMonth: number;
  activeJobs: number;
  doneJobs: number;
  failedJobs: number;
  pendingReview: number;
  activeProviders: number;
  totalProviders: number;
}

export interface AiProvider {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  primary: boolean;
  models: string[];
  driver: string;
  usage: { tokens: number; cost: number };
  lastUsed: string | null;
}

export interface AiUsage {
  daily: { date: string; tokens: number; cost: number }[];
  providerDistribution: { name: string; tokens: number }[];
  inputCost: number;
  outputCost: number;
}

export interface AiPrompt {
  type: string;
  template: string;
  isDefault: boolean;
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
    throw new AiApiError(body.message || 'Request failed', res.status, body.errors ?? {});
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

export interface QueueQuery {
  page?: number;
  perPage?: number;
  status?: AiQueueStatus | 'active';
  entityType?: AiEntityType;
  jobType?: AiJobType;
}

export const aiApi = {
  getStats: (): Promise<AiStats> => request<AiStats>('/ai/stats', { method: 'GET' }),

  listQueue: async (q: QueueQuery = {}): Promise<{ items: AiJob[]; pagination: AiPagination }> => {
    const env = await raw<AiJob[]>(`/ai/queue${qs(q as Record<string, unknown>)}`, { method: 'GET' });
    return {
      items: env.data,
      pagination: env.meta?.pagination ?? { page: 1, perPage: env.data.length, total: env.data.length, totalPages: 1 },
    };
  },

  getJob: (id: string): Promise<AiJob & { logs: AiLogEntry[] }> =>
    request<AiJob & { logs: AiLogEntry[] }>(`/ai/queue/${id}`, { method: 'GET' }),

  listLogs: async (q: { page?: number; perPage?: number; status?: 'success' | 'failed' } = {}): Promise<{
    items: AiLogEntry[];
    pagination: AiPagination;
  }> => {
    const env = await raw<AiLogEntry[]>(`/ai/logs${qs(q as Record<string, unknown>)}`, { method: 'GET' });
    return {
      items: env.data,
      pagination: env.meta?.pagination ?? { page: 1, perPage: env.data.length, total: env.data.length, totalPages: 1 },
    };
  },

  getProviders: (): Promise<AiProvider[]> => request<AiProvider[]>('/ai/providers', { method: 'GET' }),
  getUsage: (): Promise<AiUsage> => request<AiUsage>('/ai/usage', { method: 'GET' }),
  listPrompts: (): Promise<AiPrompt[]> => request<AiPrompt[]>('/ai/prompts', { method: 'GET' }),

  generate: (input: { entityType: AiEntityType; entityId: string; jobTypes?: AiJobType[] }): Promise<AiJob[]> =>
    request<AiJob[]>('/ai/generate', { method: 'POST', body: JSON.stringify(input) }),

  bulkGenerate: (input: { entityType?: AiEntityType; entityIds?: string[]; jobTypes?: AiJobType[]; limit?: number }): Promise<{ entities: number; jobs: number }> =>
    request<{ entities: number; jobs: number }>('/ai/bulk-generate', { method: 'POST', body: JSON.stringify(input) }),

  retry: (id: string): Promise<AiJob> => request<AiJob>(`/ai/queue/retry/${id}`, { method: 'POST' }),
  retryAllFailed: (): Promise<{ retried: number }> => request<{ retried: number }>('/ai/queue/retry-all-failed', { method: 'POST' }),
  approve: (id: string): Promise<AiJob> => request<AiJob>(`/ai/queue/approve/${id}`, { method: 'POST' }),

  updatePrompt: (type: string, template: string): Promise<AiPrompt> =>
    request<AiPrompt>(`/ai/prompts/${type}`, { method: 'PUT', body: JSON.stringify({ template }) }),
};
