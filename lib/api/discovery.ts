// Frontend Discovery API client (Phase 11): advanced search, suggestions, trending,
// recommendations, synonyms, rules, internal links. Same-origin (proxied); admin
// mutations send the cs_csrf token. Mirrors lib/api/media.ts.

interface Envelope<T> {
  status: 'success' | 'error';
  data: T;
  meta: { pagination?: DiscoveryPagination; [k: string]: unknown } | null;
  message: string;
  errors: Record<string, unknown>;
}

export interface DiscoveryPagination { page: number; perPage: number; total: number; totalPages: number }

export class DiscoveryApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'DiscoveryApiError';
    this.status = status;
  }
}

export type SearchEntityType = 'product' | 'category' | 'brand' | 'guide' | 'comparison' | 'author';

/** Predictive autocomplete suggestion (DB-sourced), tagged with its source for grouping. */
export type SuggestionType = 'product' | 'category' | 'brand' | 'guide' | 'comparison' | 'popular';
export interface SearchSuggestion {
  label: string;
  type: SuggestionType;
}

export interface SearchHit {
  entityType: SearchEntityType;
  entityId: string;
  title: string;
  slug: string | null;
  url: string | null;
  image: string | null;
  snippet: string | null;
  score: number;
}

export interface AdvancedSearchResult {
  query: string;
  expandedTerms: string[];
  total: number;
  groups: Partial<Record<SearchEntityType, SearchHit[]>>;
  hits: SearchHit[];
  suggestions: string[];
  didYouMean: string | null;
}

export interface Synonym { id: string; term: string; synonyms: string[]; isActive: boolean; updatedAt: string }
export interface RecommendationRule { id: string; name: string; type: string; weight: number; isActive: boolean; conditions: unknown; updatedAt: string }
export interface InternalLink { id: string; sourceType: string; sourceId: string; targetType: string; targetId: string; anchorText: string; targetUrl: string | null; status: string; score: number; createdAt: string }

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
  if (!res.ok || body.status === 'error') throw new DiscoveryApiError(body.message || 'Request failed', res.status);
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

export const discoveryApi = {
  // Public
  advancedSearch: (q: string, opts: { types?: string; limit?: number } = {}) =>
    request<AdvancedSearchResult>(`/search/advanced${qs({ q, ...opts })}`, { method: 'GET' }),
  suggestions: (q: string) => request<SearchSuggestion[]>(`/search/suggestions${qs({ q })}`, { method: 'GET' }),
  trending: () => request<string[]>('/search/trending', { method: 'GET' }),

  // Admin: synonyms (search.manage)
  listSynonyms: async (q: { page?: number; perPage?: number; search?: string } = {}) => {
    const env = await raw<Synonym[]>(`/search/synonyms${qs(q)}`, { method: 'GET' });
    return { items: env.data, pagination: env.meta?.pagination ?? { page: 1, perPage: env.data.length, total: env.data.length, totalPages: 1 } };
  },
  createSynonym: (term: string, synonyms: string[]) => request<Synonym>('/search/synonyms', { method: 'POST', body: JSON.stringify({ term, synonyms }) }),
  updateSynonym: (id: string, body: { synonyms?: string[]; isActive?: boolean }) => request<Synonym>(`/search/synonyms/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSynonym: (id: string) => request<{ id: string }>(`/search/synonyms/${id}`, { method: 'DELETE' }),
  reindex: () => request<{ indexed: number }>('/search/reindex', { method: 'POST' }),

  // Admin: rules (recommendations.view/manage)
  listRules: async (q: { page?: number; perPage?: number } = {}) => {
    const env = await raw<RecommendationRule[]>(`/recommendations/rules${qs(q)}`, { method: 'GET' });
    return { items: env.data, pagination: env.meta?.pagination ?? { page: 1, perPage: env.data.length, total: env.data.length, totalPages: 1 } };
  },
  createRule: (body: { name: string; type: string; weight?: number; isActive?: boolean }) => request<RecommendationRule>('/recommendations/rules', { method: 'POST', body: JSON.stringify(body) }),
  updateRule: (id: string, body: { weight?: number; isActive?: boolean; name?: string }) => request<RecommendationRule>(`/recommendations/rules/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteRule: (id: string) => request<{ id: string }>(`/recommendations/rules/${id}`, { method: 'DELETE' }),

  // Admin: internal links (recommendations.view/manage)
  listLinks: async (q: { page?: number; perPage?: number; status?: string } = {}) => {
    const env = await raw<InternalLink[]>(`/recommendations/internal-links${qs(q)}`, { method: 'GET' });
    return { items: env.data, pagination: env.meta?.pagination ?? { page: 1, perPage: env.data.length, total: env.data.length, totalPages: 1 } };
  },
  generateLinks: (sourceType: 'guide' | 'comparison', sourceId: string) => request<{ created: number }>('/recommendations/internal-links/generate', { method: 'POST', body: JSON.stringify({ sourceType, sourceId }) }),
  detectBroken: () => request<{ broken: { sourceType: string; sourceId: string; url: string }[]; scanned: number }>('/recommendations/internal-links/detect-broken', { method: 'POST' }),
  setLinkStatus: (id: string, status: string) => request<InternalLink>(`/recommendations/internal-links/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteLink: (id: string) => request<{ id: string }>(`/recommendations/internal-links/${id}`, { method: 'DELETE' }),
};
