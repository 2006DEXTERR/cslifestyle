import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../lib/http';
import { verifyAccessToken } from '../lib/jwt';
import { COOKIE } from '../lib/cookies';
import { loadAuthUser } from '../services/rbac.service';

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[COOKIE.ACCESS];
}

/**
 * Verifies the access token (cookie or Bearer), then loads the user fresh from
 * the DB so disabled accounts and revised permissions take effect immediately.
 * Attaches `req.user`.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) throw new ApiError(401, 'Authentication required');

    let sub: string;
    try {
      sub = verifyAccessToken(token).sub;
    } catch {
      throw new ApiError(401, 'Invalid or expired token');
    }

    const user = await loadAuthUser(sub);
    if (!user || !user.isActive) throw new ApiError(401, 'Account unavailable');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
