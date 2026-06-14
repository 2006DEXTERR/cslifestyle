import type { Server } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { connectRedis, redis } from './lib/redis';
import { closeQueues } from './lib/queue';

async function bootstrap(): Promise<void> {
  const app = createApp();

  const server: Server = app.listen(env.PORT, env.HOST, () => {
    logger.info(
      `🚀 CSLifestyle API listening on http://${env.HOST}:${env.PORT} ` +
        `(${env.NODE_ENV}) — docs at /docs, health at /healthz`,
    );
  });

  // Open dependency connections (non-fatal: the app stays up so /readyz can
  // report degraded status if a dependency is temporarily unavailable).
  prisma.$connect().catch((err) => logger.error({ err }, 'Initial Postgres connect failed'));
  connectRedis().catch((err) => logger.error({ err }, 'Initial Redis connect failed'));

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down gracefully…');
    server.close();
    await Promise.allSettled([closeQueues(), prisma.$disconnect(), redis.quit()]);
    process.exit(0);
  };

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => void shutdown(signal));
  }
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal: failed to start server');
  process.exit(1);
});
