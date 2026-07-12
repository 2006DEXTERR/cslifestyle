// Frontend Admin API client (Phase 13): users, roles & permissions, settings,
// and SEO sitemap status. Same-origin (proxied); admin mutations send the
// cs_csrf token. Mirrors lib/api/discovery.ts.

interface Envelope<T> {
  status: 'success' | 'error';
  data: T;
  meta: { pagination?: AdminPagination; [k: string]: unknown } | null;
  message: string;
  errors: Record<string, unknown>;
}

export interface AdminPagination { page: number; perPage: number; total: number; totalPages: number }

export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  roleId: string;
  role: string;
  status: 'active' | 'inactive';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SitemapStatus {
  totalUrls: number;
  byType: {
    products: number;
    categories: number;
    brands: number;
    guides: number;
    comparisons: number;
    authors: number;
    staticPages: number;
  };
  sitemapUrl: string;
  robotsUrl: string;
}

export interface AdminOverview {
  counts: {
    products: { total: number; published: number; draft: number };
    categories: number;
    brands: number;
    guides: { total: number; published: number; draft: number };
    comparisons: number;
    authors: number;
    users: number;
    roles: number;
    subscribers: number;
  };
  categoryDistribution: { name: string; value: number }[];
  recentProducts: { id: string; title: string; slug: string; category: string; isPublished: boolean }[];
  recentGuides: { id: string; title: string; slug: string; author: string; status: string }[];
  contentGrowth: { month: string; products: number; guides: number; comparisons: number }[];
  affiliateClicksDaily: { day: string; clicks: number }[];
}

export interface UserListParams {
  page?: number;
  perPage?: number;
  q?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'all';
}

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
  if (!res.ok || body.status === 'error') throw new AdminApiError(body.message || 'Request failed', res.status);
  return body as Envelope<T>;
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await raw<T>(path, init)).data;
}
function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const adminApi = {
  // ── Dashboard (admin.access) ──
  getOverview: () => request<AdminOverview>('/admin/overview', { method: 'GET' }),

  // ── Users (users.view / users.edit) ──
  listUsers: async (params: UserListParams = {}) => {
    const env = await raw<AdminUser[]>(`/users${qs(params as Record<string, unknown>)}`, { method: 'GET' });
    return {
      items: env.data,
      pagination: env.meta?.pagination ?? { page: 1, perPage: env.data.length, total: env.data.length, totalPages: 1 },
    };
  },
  getUser: (id: string) => request<AdminUser>(`/users/${id}`, { method: 'GET' }),
  createUser: (body: { name: string; email: string; roleId: string; password: string; isActive?: boolean }) =>
    request<AdminUser>('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: string, body: { name?: string; email?: string; roleId?: string }) =>
    request<AdminUser>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  setUserStatus: (id: string, isActive: boolean) =>
    request<AdminUser>(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  deleteUser: (id: string) => request<AdminUser>(`/users/${id}`, { method: 'DELETE' }),

  // ── Roles (roles.view / roles.create / roles.edit) ──
  listRoles: () => request<AdminRole[]>('/roles', { method: 'GET' }),
  getRole: (id: string) => request<AdminRole>(`/roles/${id}`, { method: 'GET' }),
  createRole: (body: { name: string; description?: string; permissions?: string[] }) =>
    request<AdminRole>('/roles', { method: 'POST', body: JSON.stringify(body) }),
  updateRole: (id: string, body: { description?: string; permissions?: string[] }) =>
    request<AdminRole>(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  // ── Settings (settings.view / settings.edit) ──
  getSettings: () => request<{ values: Record<string, string> }>('/settings', { method: 'GET' }),
  saveSettings: (values: Record<string, string | number | boolean | null>) =>
    request<{ values: Record<string, string> }>('/settings', { method: 'PUT', body: JSON.stringify({ values }) }),

  // ── SEO (seo.view) ──
  sitemapStatus: () => request<SitemapStatus>('/seo/sitemap', { method: 'GET' }),
};
