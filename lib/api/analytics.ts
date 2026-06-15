// Frontend Analytics API client (Phase 8). Admin reads are same-origin (proxied via
// next.config.js). The public `track()` beacon posts privacy-safe view events to the
// collector (server hashes IP; no PII sent). Mirrors lib/api/ai.ts.

interface Envelope<T> {
  status: 'success' | 'error';
  data: T;
  meta: { pagination?: AnalyticsPagination; [k: string]: unknown } | null;
  message: string;
  errors: Record<string, unknown>;
}

export interface AnalyticsPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export class AnalyticsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AnalyticsApiError';
    this.status = status;
  }
}

export type AnalyticsRange = 'today' | 'last7days' | 'last30days' | 'thisMonth';

export interface DashboardCards {
  pageViews: number;
  productViews: number;
  guideViews: number;
  comparisonViews: number;
  affiliateClicks: number;
  revenue: number;
  aiCost: number;
  searchCount: number;
  importCount: number;
  sessions: number;
  users: number;
  bounceRate: number;
}

export interface DashboardData {
  cards: DashboardCards;
  deltas: { pageViews: number; sessions: number; users: number };
  traffic: { date: string; pageViews: number; sessions: number; users: number }[];
  devices: { name: string; value: number }[];
  geographic: { country: string; sessions: number }[];
  topPages: { path: string; views: number }[];
  trafficSources: { source: string; sessions: number }[];
  realtime: { activeUsers: number; series: { time: string; activeUsers: number }[] };
}

export interface ProductAnalytics {
  mostViewed: { product: { id: string; title: string; slug: string }; views: number }[];
  mostClicked: { product: { id: string; title: string; slug: string }; clicks: number }[];
  highestRevenue: { product: { id: string; title: string; slug: string }; revenue: number }[];
  trending: { product: { id: string; title: string; slug: string }; views: number }[];
}

export interface SearchAnalytics {
  topSearches: { query: string; count: number; avgResults: number }[];
  zeroResultSearches: { query: string; count: number }[];
  trends: { date: string; count: number }[];
  total: number;
}

export interface RevenueAnalytics {
  total: number;
  estimated: number;
  estimateInputs: { clicks: number; cvr: number; commission: number };
  daily: { date: string; revenue: number }[];
  weekly: { week: string; revenue: number }[];
  monthly: { month: string; revenue: number }[];
  byCategory: { category: string; revenue: number }[];
  byBrand: { brand: string; revenue: number }[];
}

export interface AiAnalytics {
  tokens: number;
  cost: number;
  generationCount: number;
  failedJobs: number;
  byProvider: { provider: string; tokens: number; cost: number; count: number }[];
  byModel: { model: string; cost: number; count: number }[];
  daily: { date: string; tokens: number; cost: number }[];
}

export interface ContentAnalytics {
  topGuides: { id: string; title: string; slug: string; views: number }[];
  topComparisons: { id: string; title: string; slug: string; views: number }[];
  topAuthors: { id: string; name: string; slug: string; views: number }[];
  topCategories: { id: string; name: string; slug: string; views: number }[];
  topBrands: { id: string; name: string; slug: string; views: number }[];
}

const BASE = '/api';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
  if (init.method && init.method !== 'GET') {
    const csrf = readCookie('cs_csrf');
    if (csrf) headers['x-csrf-token'] = csrf;
  }
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...init, headers });
  const body = (await res.json().catch(() => ({}))) as Partial<Envelope<T>>;
  if (!res.ok || body.status === 'error') throw new AnalyticsApiError(body.message || 'Request failed', res.status);
  return body.data as T;
}

function qs(range: AnalyticsRange): string {
  return `?range=${range}`;
}

export const analyticsApi = {
  getDashboard: (range: AnalyticsRange = 'last7days') => request<DashboardData>(`/analytics/dashboard${qs(range)}`, { method: 'GET' }),
  getProducts: (range: AnalyticsRange = 'last30days') => request<ProductAnalytics>(`/analytics/products${qs(range)}`, { method: 'GET' }),
  getSearch: (range: AnalyticsRange = 'last30days') => request<SearchAnalytics>(`/analytics/search${qs(range)}`, { method: 'GET' }),
  getRevenue: (range: AnalyticsRange = 'last30days') => request<RevenueAnalytics>(`/analytics/revenue${qs(range)}`, { method: 'GET' }),
  getAi: (range: AnalyticsRange = 'last30days') => request<AiAnalytics>(`/analytics/ai${qs(range)}`, { method: 'GET' }),
  getContent: (range: AnalyticsRange = 'last30days') => request<ContentAnalytics>(`/analytics/content${qs(range)}`, { method: 'GET' }),
};

// ── Public privacy-safe beacon ──

const SID_KEY = 'cs_sid';

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = window.localStorage.getItem(SID_KEY);
    if (!id) {
      id = (window.crypto?.randomUUID?.() ?? `s_${Date.now()}_${Math.floor(Math.random() * 1e9)}`);
      window.localStorage.setItem(SID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export type TrackType =
  | 'page_view' | 'product_view' | 'guide_view' | 'comparison_view'
  | 'author_view' | 'category_view' | 'brand_view' | 'search';

/** Fire a privacy-safe analytics beacon (no PII; server hashes IP). Never throws. */
export function track(type: TrackType, opts: { entityType?: string; entityId?: string; metadata?: Record<string, unknown> } = {}): void {
  if (typeof window === 'undefined') return;
  const payload = {
    type,
    entityType: opts.entityType,
    entityId: opts.entityId,
    url: window.location.pathname,
    referrer: document.referrer || undefined,
    sessionId: getSessionId(),
    metadata: opts.metadata,
  };
  try {
    void fetch(`${BASE}/analytics/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}
