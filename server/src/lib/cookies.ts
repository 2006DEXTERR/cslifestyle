import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';

/**
 * Auth cookie helpers.
 * - `cs_access`  — httpOnly JWT access token (sent to all API routes).
 * - `cs_refresh` — httpOnly opaque refresh token (scoped to /api/auth).
 * - `cs_csrf`    — readable double-submit CSRF token (sent to all routes).
 */
export const COOKIE = {
  ACCESS: 'cs_access',
  REFRESH: 'cs_refresh',
  CSRF: 'cs_csrf',
} as const;

const REFRESH_PATH = '/api/auth';

/** Parse "15m" / "7d" / "3600s" / "2h" into milliseconds. */
export function durationToMs(value: string): number {
  const m = /^(\d+)\s*(ms|s|m|h|d)$/.exec(value.trim());
  if (!m) return Number(value) || 0;
  const n = Number(m[1]);
  const unit = m[2];
  const mult = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 1000;
  return n * mult;
}

function base(path: string): CookieOptions {
  return {
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN,
    path,
  };
}

export function setAccessCookie(res: Response, token: string): void {
  res.cookie(COOKIE.ACCESS, token, {
    ...base('/'),
    httpOnly: true,
    maxAge: durationToMs(env.ACCESS_TOKEN_TTL),
  });
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(COOKIE.REFRESH, token, {
    ...base(REFRESH_PATH),
    httpOnly: true,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
  });
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(COOKIE.CSRF, token, {
    ...base('/'),
    httpOnly: false, // readable by the client so it can echo it in a header
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE.ACCESS, { ...base('/') });
  res.clearCookie(COOKIE.REFRESH, { ...base(REFRESH_PATH) });
  res.clearCookie(COOKIE.CSRF, { ...base('/'), httpOnly: false });
}
