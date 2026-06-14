import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { corsOrigins, env } from './config/env';
import { logger } from './lib/logger';
import { requestId } from './middleware/requestId';
import { errorHandler, notFound } from './middleware/error';
import { healthRouter } from './routes/health';
import { apiRouter } from './routes';
import { authRouter } from './routes/auth';
import { swaggerSpec } from './docs/swagger';

/**
 * Builds the Express application (no network binding — see src/index.ts).
 * Factored out so tests can import the app directly via supertest.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  // Correlation id first, then request logging, then security/parse middleware.
  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => (req as { id?: string }).id ?? '' }));
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health probes at root (for infra/orchestrator checks).
  app.use('/', healthRouter);

  // API docs.
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'CSLifestyle API' }));
  app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

  // Authentication (unversioned per spec: /api/auth/*).
  app.use('/api/auth', authRouter);

  // Versioned API surface.
  app.use(env.API_PREFIX, apiRouter);

  // 404 + centralised error handling (must be last).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
