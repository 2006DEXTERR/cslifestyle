// Frontend Media Library API client (Phase 10): upload, browse/search, replace, delete,
// metadata, folders, usage. Same-origin (proxied); mutations send the cs_csrf token.

interface Envelope<T> {
  status: 'success' | 'error';
  data: T;
  meta: { pagination?: MediaPagination; [k: string]: unknown } | null;
  message: string;
  errors: Record<string, unknown>;
}

export interface MediaPagination { page: number; perPage: number; total: number; totalPages: number }

export class MediaApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'MediaApiError';
    this.status = status;
  }
}

export interface MediaUsage { id: string; mediaId: string; entityType: string; entityId: string; field: string | null; createdAt: string }

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  folderId: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  webpUrl: string | null;
  sizes: { w: number; url: string | null }[];
  hash: string;
  createdAt: string;
  usages?: MediaUsage[];
  usageCount?: number;
}

export interface MediaStats {
  totalAssets: number;
  totalSize: number;
  unusedCount: number;
  folders: number;
  byType: { mimeType: string; count: number; size: number }[];
}

export interface MediaFolder { id: string; name: string; parentId: string | null; assetCount?: number; createdAt: string }

const BASE = '/api';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function raw<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
  if (init.method && init.method !== 'GET') {
    const csrf = readCookie('cs_csrf');
    if (csrf) headers['x-csrf-token'] = csrf;
  }
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...init, headers });
  const body = (await res.json().catch(() => ({}))) as Partial<Envelope<T>>;
  if (!res.ok || body.status === 'error') throw new MediaApiError(body.message || 'Request failed', res.status);
  return body as Envelope<T>;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await raw<T>(path, init)).data;
}

/** Multipart POST (FormData) — never sets Content-Type so the browser adds the boundary. */
async function upload<T>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const csrf = readCookie('cs_csrf');
  if (csrf) headers['x-csrf-token'] = csrf;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', credentials: 'include', headers, body: form });
  const body = (await res.json().catch(() => ({}))) as Partial<Envelope<T>>;
  if (!res.ok || body.status === 'error') throw new MediaApiError(body.message || 'Upload failed', res.status);
  return body.data as T;
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const mediaApi = {
  getStats: () => request<MediaStats>('/media/stats', { method: 'GET' }),

  list: async (q: { page?: number; perPage?: number; mimeType?: string; search?: string; unused?: boolean; folderId?: string } = {}): Promise<{ items: MediaAsset[]; pagination: MediaPagination }> => {
    const env = await raw<MediaAsset[]>(`/media${qs(q)}`, { method: 'GET' });
    return { items: env.data, pagination: env.meta?.pagination ?? { page: 1, perPage: env.data.length, total: env.data.length, totalPages: 1 } };
  },

  get: (id: string) => request<MediaAsset>(`/media/${id}`, { method: 'GET' }),
  listUsage: (id: string) => request<MediaUsage[]>(`/media/${id}/usage`, { method: 'GET' }),
  listFolders: () => request<MediaFolder[]>('/media/folders', { method: 'GET' }),

  upload: (files: File[], opts: { folderId?: string; altText?: string } = {}) => {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    if (opts.folderId) form.append('folderId', opts.folderId);
    if (opts.altText) form.append('altText', opts.altText);
    return upload<{ uploaded: MediaAsset[]; duplicates: number }>('/media/upload', form);
  },

  replace: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return upload<MediaAsset>(`/media/${id}/replace`, form);
  },

  update: (id: string, patch: { altText?: string; caption?: string; folderId?: string | null }) =>
    request<MediaAsset>(`/media/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id: string) => request<{ id: string; usageCount: number }>(`/media/${id}`, { method: 'DELETE' }),

  createFolder: (name: string, parentId?: string) => request<MediaFolder>('/media/folders', { method: 'POST', body: JSON.stringify({ name, parentId }) }),
};
