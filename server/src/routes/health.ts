import { Router, type Request, type Response } from 'express';
import { ok } from '../lib/http';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

export const healthRouter = Router();

const START_TIME = Date.now();
const VERSION = process.env.npm_package_version ?? '0.1.0';

/** Reject a promise after `ms` so a downed dependency can't hang the probe. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} check timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function checkDatabase(): Promise<boolean> {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 2000, 'database');
    return true;
  } catch (err) {
    logger.warn({ err }, 'Database readiness check failed');
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    const pong = await withTimeout(redis.ping(), 2000, 'redis');
    return pong === 'PONG';
  } catch (err) {
    logger.warn({ err }, 'Redis readiness check failed');
    return false;
  }
}

/**
 * @openapi
 * /healthz:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe
 *     description: Returns 200 as long as the process is running. Does not touch dependencies.
 *     responses:
 *       200:
 *         description: Service is alive
 */
healthRouter.get('/healthz', (_req: Request, res: Response) => {
  res.json(
    ok({
      status: 'ok',
      uptimeSeconds: Math.round((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString(),
      version: VERSION,
    }),
  );
});

/**
 * @openapi
 * /readyz:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe
 *     description: Verifies PostgreSQL and Redis connectivity. Returns 503 if any dependency is down.
 *     responses:
 *       200:
 *         description: All dependencies healthy
 *       503:
 *         description: One or more dependencies unavailable
 */
healthRouter.get('/readyz', async (_req: Request, res: Response) => {
  const [database, redisUp] = await Promise.all([checkDatabase(), checkRedis()]);
  const checks = {
    database: database ? 'up' : 'down',
    redis: redisUp ? 'up' : 'down',
  };
  const healthy = database && redisUp;
  res.status(healthy ? 200 : 503).json(
    ok({ status: healthy ? 'ready' : 'degraded', checks, timestamp: new Date().toISOString() }),
  );
});
