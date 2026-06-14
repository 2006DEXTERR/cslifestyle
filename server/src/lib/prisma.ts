import { PrismaClient } from '@prisma/client';
import { isProd } from '../config/env';

/**
 * Prisma client singleton. Reused across hot-reloads in dev to avoid exhausting
 * the connection pool. Connects lazily on first query.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: isProd ? ['error'] : ['warn', 'error'] });

if (!isProd) globalForPrisma.prisma = prisma;
