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

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully…');
    // Force-exit if draining hangs (e.g. a stuck connection), so the platform can restart.
    const force = setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000);
    force.unref();
    // Stop accepting new connections and let in-flight requests drain, then close deps.
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Promise.allSettled([closeQueues(), prisma.$disconnect(), redis.quit()]);
    clearTimeout(force);
    process.exit(0);
  };

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => void shutdown(signal));
  }

  // Last-resort fault handlers so a stray rejection/exception is logged (not silent).
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception — shutting down');
    void shutdown('uncaughtException');
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal: failed to start server');
  process.exit(1);
});
