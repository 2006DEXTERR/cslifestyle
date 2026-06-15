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
import { catalogRouter } from './routes/catalog';
import { contentRouter } from './routes/content';
import { affiliateRouter } from './routes/affiliate';
import { goRouter } from './routes/go';
import { importRouter } from './routes/import';
import { aiRouter } from './routes/ai';
import { analyticsRouter } from './routes/analytics';
import { marketingRouter } from './routes/marketing';
import { mediaRouter } from './routes/media';
import { uploadRoot } from './services/media/storage';
import { discoveryRouter } from './routes/discovery';
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

  // Catalog (unversioned per the Phase 2 contract: /api/products|categories|brands|search).
  app.use('/api', catalogRouter);

  // Content (Phase 3: /api/authors|guides|comparisons).
  app.use('/api', contentRouter);

  // Affiliate redirect engine (Phase 5: /go/:asin) + affiliate/revenue admin API (/api).
  app.use('/go', goRouter);
  app.use('/api', affiliateRouter);

  // Import Center (Phase 6: /api/import/*).
  app.use('/api', importRouter);

  // AI content engine (Phase 7: /api/ai/*).
  app.use('/api', aiRouter);

  // Analytics & Reporting (Phase 8: /api/analytics/*).
  app.use('/api', analyticsRouter);

  // Marketing & Communication (Phase 9: /api/marketing/* + /api/newsletter/*).
  app.use('/api', marketingRouter);

  // Media Library (Phase 10: /api/media/* + static files at /uploads).
  app.use('/uploads', express.static(uploadRoot(), { maxAge: '7d', immutable: true, fallthrough: true }));
  app.use('/api', mediaRouter);

  // Discovery — advanced search, recommendations, internal linking (Phase 11).
  app.use('/api', discoveryRouter);

  // Versioned API surface.
  app.use(env.API_PREFIX, apiRouter);

  // 404 + centralised error handling (must be last).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
