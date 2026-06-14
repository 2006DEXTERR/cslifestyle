import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ApiError } from '../lib/http';
import { hasRole } from '../services/rbac.service';

/** Require the authenticated user to hold one of the given roles. */
export function requireRole(...roles: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!hasRole(req.user.role, roles)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
}

/** Require the authenticated user to hold ALL of the given permissions. */
export function requirePermission(...permissions: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    const granted = req.user.permissions;
    const missing = permissions.filter((p) => !granted.includes(p));
    if (missing.length > 0) {
      return next(new ApiError(403, 'You do not have permission to perform this action', { missing }));
    }
    next();
  };
}
