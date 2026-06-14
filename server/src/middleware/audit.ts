import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { recordAudit } from '../lib/audit';
import { getContext } from '../lib/request-context';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Records an audit-log entry for mutating requests on response finish.
 * Optionally pin a fixed `event`/`module`; otherwise derives them from the route.
 */
export function auditLogger(event?: string, module?: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (!MUTATING.has(req.method)) return;
      if (res.statusCode >= 500) return;
      const ctx = getContext(req);
      recordAudit({
        userId: req.user?.id ?? null,
        event: event ?? `${req.method} ${req.baseUrl}${req.path}`,
        module,
        ipHash: ctx.ipHash,
        userAgent: ctx.userAgent,
        metadata: { status: res.statusCode },
      });
    });
    next();
  };
}
