import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../lib/http';
import { COOKIE } from '../lib/cookies';
import { safeEqualHex } from '../lib/tokens';

/**
 * Double-submit-cookie CSRF protection. Applied to cookie-authenticated
 * state-changing routes (refresh, logout). The client reads the non-httpOnly
 * `cs_csrf` cookie and echoes it in the `x-csrf-token` header; the two must
 * match. Bearer-token API clients are exempt (they aren't cookie-CSRF-prone).
 */
export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  // Pure Bearer auth (no auth cookie) is not susceptible to CSRF.
  const usingCookieAuth = Boolean(req.cookies?.[COOKIE.ACCESS] || req.cookies?.[COOKIE.REFRESH]);
  if (!usingCookieAuth) return next();

  const cookieToken = req.cookies?.[COOKIE.CSRF];
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken || !sameToken(cookieToken, headerToken)) {
    return next(new ApiError(403, 'Invalid or missing CSRF token'));
  }
  next();
}

function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  // Tokens are base64url; compare as hex of their bytes for constant time.
  const toHex = (s: string): string => Buffer.from(s).toString('hex');
  return safeEqualHex(toHex(a), toHex(b));
}
