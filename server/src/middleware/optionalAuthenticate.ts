import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { COOKIE } from '../lib/cookies';
import { loadAuthUser } from '../services/rbac.service';

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[COOKIE.ACCESS];
}

/**
 * Best-effort authentication for public endpoints that expose MORE when a
 * privileged user is signed in (e.g. catalog listings show drafts to editors).
 * Never rejects: if no/invalid token, `req.user` is left undefined and the
 * request proceeds as anonymous.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const { sub } = verifyAccessToken(token);
    const user = await loadAuthUser(sub);
    if (user && user.isActive) req.user = user;
  } catch {
    /* ignore — treat as anonymous */
  }
  next();
}

/** True if the (optionally) authenticated user holds the given permission. */
export function userHasPermission(req: Request, permission: string): boolean {
  return Boolean(req.user?.permissions.includes(permission));
}
