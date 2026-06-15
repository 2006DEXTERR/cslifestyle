// Frontend Marketing API client (Phase 9): dashboard, campaigns, subscribers, events,
// templates + public newsletter subscribe/unsubscribe. Same-origin (proxied); admin
// mutations send the cs_csrf token. Mirrors lib/api/analytics.ts.

interface Envelope<T> {
  status: 'success' | 'error';
  data: T;
  meta: { pagination?: MktPagination; [k: string]: unknown } | null;
  message: string;
  errors: Record<string, unknown>;
}

export interface MktPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export class MarketingApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'MarketingApiError';
    this.status = status;
  }
}

export type SubscriberStatus = 'pending' | 'active' | 'unsubscribed' | 'bounced' | 'complained';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';

export interface MarketingDashboard {
  cards: { totalSubscribers: number; activeSubscribers: number; avgOpenRate: number; avgClickRate: number; campaignsSent: number };
  performance: { date: string; sent: number; opened: number; clicked: number }[];
  segments: { name: string; count: number }[];
  deliveryRate: number;
}

export interface SubscriberStats {
  total: number; active: number; pending: number; unsubscribed: number; bounced: number;
  growth: { date: string; count: number }[];
  segments: { name: string; count: number }[];
}

export interface Subscriber {
  id: string; email: string; status: SubscriberStatus; source: string | null;
  tags: string[]; verifiedAt: string | null; subscribedAt: string; unsubscribedAt: string | null;
}

export interface Campaign {
  id: string; name: string; subject: string; template: string; content: string | null;
  entityId: string | null; segmentTag: string | null; status: CampaignStatus;
  scheduledAt: string | null; sentAt: string | null;
  recipientCount: number; deliveredCount: number; openedCount: number; clickedCount: number;
  failedCount: number; bouncedCount: number; openRate: number; clickRate: number; createdAt: string;
}

export interface EmailTemplate { key: string; name: string; description: string }

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
  if (!res.ok || body.status === 'error') throw new MarketingApiError(body.message || 'Request failed', res.status);
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

export const marketingApi = {
  getDashboard: () => request<MarketingDashboard>('/marketing/dashboard', { method: 'GET' }),
  getSubscriberStats: () => request<SubscriberStats>('/marketing/subscribers/stats', { method: 'GET' }),

  listSubscribers: async (q: { page?: number; perPage?: number; status?: SubscriberStatus; search?: string; tag?: string } = {}): Promise<{ items: Subscriber[]; pagination: MktPagination }> => {
    const env = await raw<Subscriber[]>(`/marketing/subscribers${qs(q)}`, { method: 'GET' });
    return { items: env.data, pagination: env.meta?.pagination ?? { page: 1, perPage: env.data.length, total: env.data.length, totalPages: 1 } };
  },

  listCampaigns: async (q: { page?: number; perPage?: number; status?: CampaignStatus } = {}): Promise<{ items: Campaign[]; pagination: MktPagination }> => {
    const env = await raw<Campaign[]>(`/marketing/campaigns${qs(q)}`, { method: 'GET' });
    return { items: env.data, pagination: env.meta?.pagination ?? { page: 1, perPage: env.data.length, total: env.data.length, totalPages: 1 } };
  },

  listTemplates: () => request<EmailTemplate[]>('/marketing/templates', { method: 'GET' }),

  createCampaign: (input: { name: string; subject: string; template?: string; content?: string; segmentTag?: string; scheduledAt?: string }) =>
    request<Campaign>('/marketing/campaigns', { method: 'POST', body: JSON.stringify(input) }),
  updateCampaign: (id: string, input: Partial<{ name: string; subject: string; content: string }>) =>
    request<Campaign>(`/marketing/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  scheduleCampaign: (id: string, scheduledAt: string) =>
    request<Campaign>(`/marketing/campaigns/${id}/schedule`, { method: 'POST', body: JSON.stringify({ scheduledAt }) }),
  sendTest: (id: string, email: string) =>
    request<{ sent: boolean }>(`/marketing/campaigns/${id}/test`, { method: 'POST', body: JSON.stringify({ email }) }),
  sendCampaign: (id: string) => request<Campaign>(`/marketing/campaigns/${id}/send`, { method: 'POST' }),
  deleteCampaign: (id: string) => request<{ id: string }>(`/marketing/campaigns/${id}`, { method: 'DELETE' }),

  addSubscriber: (input: { email: string; tags?: string[]; status?: SubscriberStatus }) =>
    request<Subscriber>('/marketing/subscribers', { method: 'POST', body: JSON.stringify(input) }),
  updateSubscriber: (id: string, input: { tags?: string[]; status?: SubscriberStatus }) =>
    request<Subscriber>(`/marketing/subscribers/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteSubscriber: (id: string) => request<{ id: string }>(`/marketing/subscribers/${id}`, { method: 'DELETE' }),
};

// ── Public newsletter (used by the footer/homepage signup, no auth) ──
export async function subscribeNewsletter(email: string, source = 'site'): Promise<'pending' | 'active' | 'already_subscribed'> {
  const data = await request<{ status: 'pending' | 'active' | 'already_subscribed' }>('/newsletter/subscribe', {
    method: 'POST',
    body: JSON.stringify({ email, source }),
  });
  return data.status;
}
