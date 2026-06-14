import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Assigns a correlation id to every request (honouring an inbound
 * `x-request-id` if present) and echoes it back on the response. pino-http
 * picks up `req.id` automatically for log correlation.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const id = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
}
