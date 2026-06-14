import { prisma } from './prisma';
import { logger } from './logger';

export interface AuditEntry {
  userId?: string | null;
  event: string; // e.g. "auth.login"
  module?: string;
  ipHash?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Persist an audit-log row. Returns a promise that NEVER rejects (failures are
 * logged), so callers may ignore it (fire-and-forget) or await it when ordering
 * matters (e.g. tests).
 */
export function recordAudit(entry: AuditEntry): Promise<void> {
  return prisma.auditLog
    .create({
      data: {
        userId: entry.userId ?? null,
        event: entry.event,
        module: entry.module,
        ipAddress: entry.ipHash,
        userAgent: entry.userAgent?.slice(0, 500),
        metadata: (entry.metadata ?? {}) as object,
      },
    })
    .then(() => undefined)
    .catch((err) => logger.warn({ err, event: entry.event }, 'Failed to write audit log'));
}
