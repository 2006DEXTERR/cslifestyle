// Frontend content API client (Phase 3): authors, guides, comparisons.
// Same-origin (proxied via next.config.js rewrites); admin mutations send the
// cs_csrf double-submit token, mirroring lib/api/catalog.ts.

import type { BuyingGuide, Comparison, Author } from '@/lib/types';
import type { Pagination, CatalogProduct } from '@/lib/api/catalog';

interface Envelope<T> {
  status: 'success' | 'error';
  data: T;
  meta: { pagination?: Pagination; [k: string]: unknown } | null;
  message: string;
  errors: Record<string, unknown>;
}

export class ContentApiError extends Error {
  status: number;
  errors: Record<string, unknown>;
  constructor(message: string, status: number, errors: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ContentApiError';
    this.status = status;
    this.errors = errors;
  }
}

/** Presented shapes — frontend types plus admin/editable extras. */
export interface ContentAuthor extends Author {
  avatarUrl: string | null;
  credentials: string | null;
  socialLinks: Record<string, unknown>;
  seoTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContentGuide extends BuyingGuide {
  categoryId: string | null;
  authorId: string | null;
  faqItems: { question: string; answer: string }[];
  seoTitle: string | null;
  metaDescription: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonInsights {
  bestPrice: 'A' | 'B' | null;
  higherRated: 'A' | 'B' | null;
  moreReviewed: 'A' | 'B' | null;
  specWins: { a: number; b: number; tie: number };
  priceDiff: number | null;
}

/** A single comparison spec row with typed/grouped metadata (schema-driven UI). */
export interface ComparisonSpecView {
  name: string;
  winner: 'A' | 'B' | 'tie';
  details: string;
  productA: string;
  productB: string;
  group: string;
  subgroup: string | null;
  displayType: string; // text | number | boolean | percentage | rating | currency | badge | progress | stars | icon
  valueType: string;
  winnerMode: string;
  unit: string | null;
  numberValueA: number | null;
  numberValueB: number | null;
  booleanValueA: boolean | null;
  booleanValueB: boolean | null;
  jsonValueA: unknown;
  jsonValueB: unknown;
}

export interface ContentComparison extends Omit<Comparison, 'productA' | 'productB' | 'categories'> {
  // Presented products carry the catalog extras (incl. `asin`, used by /go links).
  productA: CatalogProduct;
  productB: CatalogProduct;
  insights: ComparisonInsights;
  categories: ComparisonSpecView[]; // flat (backward compatible)
  specGroups: { group: string; specs: ComparisonSpecView[] }[]; // grouped view
  // Rich editorial content (Phase: rich comparison schema) — empty/null until populated.
  editorSummary: string | null;
  whoShouldBuyA: string | null;
  whoShouldBuyB: string | null;
  bestFor: string | null;
  bestAlternativeIds: string[];
  /** Resolved, published alternative products (safe to render as links). */
  bestAlternatives: CatalogProduct[];
  faq: { question: string; answer: string }[];
  comparisonNotes: string | null;
  lastReviewedBy: string | null;
  reviewStatus: string;
  featured: boolean;
  stickyCta: boolean;
  comparisonScoreA: number | null;
  comparisonScoreB: number | null;
  productAId: string;
  productBId: string;
  seoTitle: string | null;
  metaDescription: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
    throw new ContentApiError(body.message || 'Request failed', res.status, body.errors ?? {});
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

async function list<T>(path: string): Promise<{ items: T[]; pagination: Pagination }> {
  const env = await raw<T[]>(path, { method: 'GET' });
  return {
    items: env.data,
    pagination: env.meta?.pagination ?? {
      page: 1,
      perPage: env.data.length,
      total: env.data.length,
      totalPages: 1,
    },
  };
}

export interface GuideListParams {
  page?: number;
  perPage?: number;
  q?: string;
  category?: string;
  author?: string;
  status?: 'published' | 'draft' | 'all';
  sort?: 'newest' | 'oldest' | 'title';
}
export interface ComparisonListParams {
  page?: number;
  perPage?: number;
  q?: string;
  status?: 'published' | 'draft' | 'all';
  sort?: 'newest' | 'oldest' | 'title';
}
export interface AuthorListParams {
  page?: number;
  perPage?: number;
  q?: string;
  status?: 'active' | 'all';
  sort?: 'name' | 'newest';
}

export const contentApi = {
  // ── Authors ──
  listAuthors: (params: AuthorListParams = {}) =>
    list<ContentAuthor>(`/authors${qs(params as Record<string, unknown>)}`),
  getAuthor: (slug: string) => request<ContentAuthor>(`/authors/${slug}`, { method: 'GET' }),
  createAuthor: (input: Record<string, unknown>) =>
    request<ContentAuthor>('/authors', { method: 'POST', body: JSON.stringify(input) }),
  updateAuthor: (id: string, input: Record<string, unknown>) =>
    request<ContentAuthor>(`/authors/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteAuthor: (id: string) => request<{ id: string }>(`/authors/${id}`, { method: 'DELETE' }),

  // ── Guides ──
  listGuides: (params: GuideListParams = {}) =>
    list<ContentGuide>(`/guides${qs(params as Record<string, unknown>)}`),
  getGuide: (slug: string) => request<ContentGuide>(`/guides/${slug}`, { method: 'GET' }),
  createGuide: (input: Record<string, unknown>) =>
    request<ContentGuide>('/guides', { method: 'POST', body: JSON.stringify(input) }),
  updateGuide: (id: string, input: Record<string, unknown>) =>
    request<ContentGuide>(`/guides/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteGuide: (id: string) => request<{ id: string }>(`/guides/${id}`, { method: 'DELETE' }),
  setGuideStatus: (id: string, action: 'publish' | 'unpublish' | 'draft') =>
    request<ContentGuide>(`/guides/${id}/${action}`, { method: 'POST' }),

  // ── Comparisons ──
  listComparisons: (params: ComparisonListParams = {}) =>
    list<ContentComparison>(`/comparisons${qs(params as Record<string, unknown>)}`),
  getComparison: (slug: string) =>
    request<ContentComparison>(`/comparisons/${slug}`, { method: 'GET' }),
  createComparison: (input: Record<string, unknown>) =>
    request<ContentComparison>('/comparisons', { method: 'POST', body: JSON.stringify(input) }),
  updateComparison: (id: string, input: Record<string, unknown>) =>
    request<ContentComparison>(`/comparisons/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteComparison: (id: string) => request<{ id: string }>(`/comparisons/${id}`, { method: 'DELETE' }),
  setComparisonStatus: (id: string, action: 'publish' | 'unpublish' | 'draft') =>
    request<ContentComparison>(`/comparisons/${id}/${action}`, { method: 'POST' }),
};
