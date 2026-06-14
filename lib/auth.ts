// Frontend auth client. Calls the backend auth API same-origin (proxied via
// next.config.js rewrites), so the httpOnly auth cookies are first-party.

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  isActive: boolean;
  emailVerified: boolean;
  role: string;
  permissions: string[];
}

interface Envelope<T> {
  status: 'success' | 'error';
  data: T;
  meta: unknown;
  message: string;
  errors: Record<string, unknown>;
}

export class AuthApiError extends Error {
  status: number;
  errors: Record<string, unknown>;
  constructor(message: string, status: number, errors: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.errors = errors;
  }
}

const BASE = '/api/auth';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  // Attach CSRF token for state-changing cookie-authenticated calls.
  if (init.method && init.method !== 'GET') {
    const csrf = readCookie('cs_csrf');
    if (csrf) headers['x-csrf-token'] = csrf;
  }

  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...init, headers });
  const body = (await res.json().catch(() => ({}))) as Partial<Envelope<T>>;

  if (!res.ok || body.status === 'error') {
    throw new AuthApiError(body.message || 'Request failed', res.status, body.errors ?? {});
  }
  return body.data as T;
}

export interface SessionResult {
  user: AuthUser;
  csrfToken: string;
  devVerificationToken?: string;
  mustEnable2fa?: boolean;
}

/** Login either completes, or returns a 2FA challenge to be completed. */
export type LoginResponse = SessionResult | { twoFactorRequired: true; challenge: string };

export interface TwoFactorStatus {
  enabled: boolean;
  pending: boolean;
  backupCodesRemaining: number;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUri: string;
  qrDataUrl: string;
}

export const authApi = {
  register: (input: { name: string; email: string; password: string }) =>
    request<SessionResult>('/register', { method: 'POST', body: JSON.stringify(input) }),

  login: (input: { email: string; password: string }) =>
    request<LoginResponse>('/login', { method: 'POST', body: JSON.stringify(input) }),

  loginTwoFactor: (challenge: string, code: string) =>
    request<SessionResult>('/login/2fa', { method: 'POST', body: JSON.stringify({ challenge, code }) }),

  twoFactorStatus: () => request<TwoFactorStatus>('/2fa/status', { method: 'GET' }),

  twoFactorSetup: () => request<TwoFactorSetup>('/2fa/setup', { method: 'POST' }),

  twoFactorEnable: (code: string) =>
    request<{ enabled: boolean; backupCodes: string[] }>('/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  twoFactorDisable: (code: string) =>
    request<{ enabled: boolean }>('/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) }),

  regenerateBackupCodes: (code: string) =>
    request<{ backupCodes: string[] }>('/2fa/backup-codes', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  logout: () => request<{ loggedOut: boolean }>('/logout', { method: 'POST' }),

  refresh: () => request<SessionResult>('/refresh', { method: 'POST' }),

  me: () => request<{ user: AuthUser }>('/me', { method: 'GET' }),

  forgotPassword: (email: string) =>
    request<{ message: string; devResetToken?: string }>('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ reset: boolean }>('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  verifyEmail: (token: string) =>
    request<{ verified: boolean }>('/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  resendVerification: (email: string) =>
    request<{ message: string }>('/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};
