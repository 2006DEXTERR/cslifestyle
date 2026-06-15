// Frontend affiliate/revenue admin API client (Phase 5). Same-origin (next.config
// rewrites); admin mutations send the cs_csrf token, mirroring the other clients.

import type { Pagination } from '@/lib/api/catalog';

export class AffiliateApiError extends Error {
  status: number;
  errors: Record<string, unknown>;
  constructor(message: string, status: number, errors: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AffiliateApiError';
    this.status = status;
    this.errors = errors;
  }
}

export interface AffiliateStats {
  days: number;
  totalClicks: number;
  totalRevenue: number;
  totalConversions: number;
  conversionRate: number;
  epc: number;
  byDevice: Record<string, number>;
  bySource: Record<string, number>;
  daily: { date: string; clicks: number; revenue: number; conversions: number }[];
}
export interface TopProduct {
  asin: string;
  name: string;
  slug: string | null;
  clicks: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}
export interface AffiliateClickRow {
  id: string;
  asin: string;
  productTitle: string | null;
  productSlug: string | null;
  sourceType: string;
  deviceType: string;
  country: string | null;
  campaign: string | null;
  affiliateTag: string | null;
  clickedAt: string;
}
export interface ComplianceItem {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}
export interface AffiliateSettings {
  id: string;
  amazonAssociateTag: string;
  amazonDomain: string;
  linkCode: string;
  extraParams: Record<string, string> | null;
  disclosureText: string | null;
  trackingEnabled: boolean;
  updatedAt: string;
}
export interface AffiliateCampaign {
  id: string;
  name: string;
  slug: string;
  affiliateTag: string | null;
  description: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  clickCount: number;
  goUrl: string;
  createdAt: string;
  updatedAt: string;
}
export interface RevenueSummary {
  days: number;
  totalRevenue: number;
  totalOrders: number;
  totalClicks: number;
  bySource: Record<string, number>;
  topCategories: { category: string; revenue: number }[];
}
export interface RevenueImportRow {
  id: string;
  fileName: string;
  source: string;
  status: string;
  rowCount: number;
  totalRevenue: number;
  periodStart: string | null;
  periodEnd: string | null;
  importedBy: string | null;
  createdAt: string;
}

interface Envelope<T> {
  status: 'success' | 'error';
  data: T;
  meta: { pagination?: Pagination } | null;
  message: string;
  errors: Record<string, unknown>;
}

const BASE = '/api';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}
async function raw<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
  if (init.method && init.method !== 'GET') {
    const csrf = readCookie('cs_csrf');
    if (csrf) headers['x-csrf-token'] = csrf;
  }
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...init, headers });
  const body = (await res.json().catch(() => ({}))) as Partial<Envelope<T>>;
  if (!res.ok || body.status === 'error') throw new AffiliateApiError(body.message || 'Request failed', res.status, body.errors ?? {});
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

export const affiliateApi = {
  getStats: (days = 30) => request<AffiliateStats>(`/affiliate/stats${qs({ days })}`, { method: 'GET' }),
  getTopProducts: (days = 30) => request<TopProduct[]>(`/affiliate/top-products${qs({ days })}`, { method: 'GET' }),
  getClicks: async (params: { page?: number; perPage?: number; asin?: string; sourceType?: string; deviceType?: string; days?: number } = {}) => {
    const env = await raw<AffiliateClickRow[]>(`/affiliate/clicks${qs(params)}`, { method: 'GET' });
    return { items: env.data, pagination: env.meta?.pagination };
  },
  getCompliance: () => request<{ items: ComplianceItem[]; score: number }>(`/affiliate/compliance`, { method: 'GET' }),

  getSettings: () => request<AffiliateSettings>(`/affiliate/settings`, { method: 'GET' }),
  updateSettings: (patch: Record<string, unknown>) =>
    request<AffiliateSettings>(`/affiliate/settings`, { method: 'PUT', body: JSON.stringify(patch) }),

  listCampaigns: () => request<AffiliateCampaign[]>(`/affiliate/campaigns`, { method: 'GET' }),
  createCampaign: (input: Record<string, unknown>) =>
    request<AffiliateCampaign>(`/affiliate/campaigns`, { method: 'POST', body: JSON.stringify(input) }),
  updateCampaign: (id: string, input: Record<string, unknown>) =>
    request<AffiliateCampaign>(`/affiliate/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteCampaign: (id: string) => request<{ id: string }>(`/affiliate/campaigns/${id}`, { method: 'DELETE' }),

  importRevenue: (input: { fileName: string; source: string; csv: string }) =>
    request<{ importId: string; rowCount: number; totalRevenue: number; skipped: number }>(`/revenue/import`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  listImports: () => request<RevenueImportRow[]>(`/revenue/imports`, { method: 'GET' }),
  getSummary: (days = 30) => request<RevenueSummary>(`/revenue/summary${qs({ days })}`, { method: 'GET' }),
};
