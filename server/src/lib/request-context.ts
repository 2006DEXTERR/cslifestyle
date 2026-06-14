import type { Request } from 'express';
import { sha256 } from './tokens';
import type { RequestContext } from '../types/auth';

/** Build per-request context (IP stored hashed for privacy, NFR-SEC-007). */
export function getContext(req: Request): RequestContext {
  const ip = req.ip ?? req.socket.remoteAddress ?? '';
  return {
    ipHash: ip ? sha256(ip) : undefined,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
  };
}
