// Frontend catalog API client. Calls the backend catalog API same-origin
// (proxied via next.config.js rewrites). Public reads need no auth; admin
// mutations send the cs_csrf double-submit token, mirroring lib/auth.ts.

import type { Product, Category, Brand } from '@/lib/types';

interface Envelope<T> {
  status: 'success' | 'error';
  data: T;
  meta: { pagination?: Pagination; [k: string]: unknown } | null;
  message: string;
  errors: Record<string, unknown>;
}

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export class CatalogApiError extends Error {
  status: number;
  errors: Record<string, unknown>;
  constructor(message: string, status: number, errors: Record<string, unknown> = {}) {
    super(message);
    this.name = 'CatalogApiError';
    this.status = status;
    this.errors = errors;
  }
}

/** Presented product — the frontend Product plus admin/editable extras. */
export interface CatalogProduct extends Product {
  asin: string;
  title: string;
  shortDescription: string;
  categoryId: string;
  brandId: string | null;
  discountPercent: number | null;
  currency: string;
  seoTitle: string | null;
  metaDescription: string | null;
  isPublished: boolean;
  gallery: string[];
  /** Admin-only data-quality warnings (fake ASIN / stock image / placeholder link). Empty when clean. */
  dataWarnings?: { field: 'asin' | 'image' | 'affiliateUrl'; message: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CatalogCategory extends Category {
  parentId: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogBrand extends Brand {
  website: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResults {
  query: string;
  type: string;
  products: CatalogProduct[];
  categories: CatalogCategory[];
  brands: CatalogBrand[];
  total: number;
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
    throw new CatalogApiError(body.message || 'Request failed', res.status, body.errors ?? {});
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

export interface ProductListParams {
  page?: number;
  perPage?: number;
  sort?: 'popularity' | 'price-low' | 'price-high' | 'rating' | 'newest';
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  q?: string;
  trending?: boolean;
  deals?: boolean;
  editorsPick?: boolean;
  status?: 'published' | 'all' | 'draft';
}

export const catalogApi = {
  // ── Products ──
  listProducts: async (
    params: ProductListParams = {},
  ): Promise<{ items: CatalogProduct[]; pagination: Pagination }> => {
    const env = await raw<CatalogProduct[]>(`/products${qs(params as Record<string, unknown>)}`, { method: 'GET' });
    return {
      items: env.data,
      pagination: env.meta?.pagination ?? {
        page: 1,
        perPage: env.data.length,
        total: env.data.length,
        totalPages: 1,
      },
    };
  },
  getProduct: (slug: string) => request<CatalogProduct>(`/products/${slug}`, { method: 'GET' }),
  createProduct: (input: Record<string, unknown>) =>
    request<CatalogProduct>('/products', { method: 'POST', body: JSON.stringify(input) }),
  updateProduct: (id: string, input: Record<string, unknown>) =>
    request<CatalogProduct>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteProduct: (id: string) => request<{ id: string }>(`/products/${id}`, { method: 'DELETE' }),
  bulkProducts: (action: 'publish' | 'unpublish' | 'delete', ids: string[]) =>
    request<{ affected: number }>('/products/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, ids }),
    }),

  // ── Categories ──
  listCategories: (params: { status?: 'active' | 'all'; parent?: 'root' | 'all'; q?: string } = {}) =>
    request<CatalogCategory[]>(`/categories${qs(params)}`, { method: 'GET' }),
  getCategory: (slug: string) => request<CatalogCategory>(`/categories/${slug}`, { method: 'GET' }),
  createCategory: (input: Record<string, unknown>) =>
    request<CatalogCategory>('/categories', { method: 'POST', body: JSON.stringify(input) }),
  updateCategory: (id: string, input: Record<string, unknown>) =>
    request<CatalogCategory>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteCategory: (id: string) => request<{ id: string }>(`/categories/${id}`, { method: 'DELETE' }),

  // ── Brands ──
  listBrands: (params: { status?: 'active' | 'all'; q?: string } = {}) =>
    request<CatalogBrand[]>(`/brands${qs(params)}`, { method: 'GET' }),
  getBrand: (slug: string) => request<CatalogBrand>(`/brands/${slug}`, { method: 'GET' }),
  createBrand: (input: Record<string, unknown>) =>
    request<CatalogBrand>('/brands', { method: 'POST', body: JSON.stringify(input) }),
  updateBrand: (id: string, input: Record<string, unknown>) =>
    request<CatalogBrand>(`/brands/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteBrand: (id: string) => request<{ id: string }>(`/brands/${id}`, { method: 'DELETE' }),

  // ── Search ──
  search: (q: string, type: 'all' | 'products' | 'categories' | 'brands' = 'all', limit = 8) =>
    request<SearchResults>(`/search${qs({ q, type, limit })}`, { method: 'GET' }),
};
