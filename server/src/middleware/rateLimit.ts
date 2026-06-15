import rateLimit, { type Options, type Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { Request, Response } from 'express';
import { redis } from '../lib/redis';
import { env } from '../config/env';
import { fail } from '../lib/http';

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** Distributed Redis store when enabled, else per-instance memory store. */
function makeStore(prefix: string): Store | undefined {
  if (!env.RATE_LIMIT_REDIS) return undefined; // express-rate-limit defaults to MemoryStore
  const sendCommand = redis.call.bind(redis) as unknown as (...args: string[]) => Promise<never>;
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args: string[]) => sendCommand(...args),
  });
}

function handler(_req: Request, res: Response): void {
  res.status(429).json(fail('Too many requests. Please try again later.'));
}

const common: Partial<Options> = {
  windowMs: WINDOW_MS,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  // Custom key generators below intentionally key on req.ip; disable the
  // library's IPv6 keygen validation to avoid noisy warnings in tests.
  validate: false,
};

/** General limiter for the auth surface (registration, password flows, etc.). */
export const authLimiter = rateLimit({
  ...common,
  limit: 100,
  keyGenerator: (req) => req.ip ?? 'unknown',
  store: makeStore('auth'),
});

/**
 * Brute-force protection for login: max 5 FAILED attempts per IP+email per
 * window (successful logins are not counted).
 */
export const loginLimiter = rateLimit({
  ...common,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip ?? 'unknown'}:${(req.body?.email ?? '').toLowerCase()}`,
  store: makeStore('login'),
});

/**
 * Limits 2FA code attempts (TOTP/backup) to thwart code guessing —
 * 10 attempts per IP per window.
 */
export const twoFactorLimiter = rateLimit({
  ...common,
  limit: 10,
  keyGenerator: (req) => req.ip ?? 'unknown',
  store: makeStore('2fa'),
});

/** Public catalog reads (products/categories/brands listings + detail). Generous. */
export const publicCatalogLimiter = rateLimit({
  ...common,
  limit: 600,
  keyGenerator: (req) => req.ip ?? 'unknown',
  store: makeStore('catalog'),
});

/** Catalog search — tighter (logged + DB-backed). ~120/15m per IP. */
export const searchLimiter = rateLimit({
  ...common,
  limit: 120,
  keyGenerator: (req) => req.ip ?? 'unknown',
  store: makeStore('search'),
});

/** Affiliate /go redirect — generous (high-traffic outbound clicks). ~900/15m per IP. */
export const goLimiter = rateLimit({
  ...common,
  limit: 900,
  keyGenerator: (req) => req.ip ?? 'unknown',
  store: makeStore('go'),
});
