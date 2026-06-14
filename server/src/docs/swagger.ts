import swaggerJSDoc from 'swagger-jsdoc';
import { env } from '../config/env';

/**
 * OpenAPI spec built from JSDoc `@openapi` annotations on route files.
 * Served as Swagger UI at `/docs` and raw JSON at `/docs.json`.
 * Globs cover both TS sources (dev via tsx) and compiled JS (prod).
 */
export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'CSLifestyle API',
      version: '0.1.0',
      description:
        'AI-powered SEO affiliate commerce platform API. Phase 0: foundation, health, and docs. ' +
        'Domain endpoints (products, categories, guides, comparisons, search, affiliate, AI, SEO) ' +
        'are added in subsequent phases.',
    },
    servers: [
      { url: `http://localhost:${env.PORT}`, description: 'Local' },
    ],
    components: {
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { type: 'object', nullable: true },
            meta: { type: 'object', nullable: true },
            message: { type: 'string', example: '' },
            errors: { type: 'object' },
          },
        },
        ErrorEnvelope: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            data: { type: 'object', nullable: true, example: null },
            meta: { type: 'object', nullable: true },
            message: { type: 'string', example: 'Route not found' },
            errors: { type: 'object' },
          },
        },
      },
    },
    tags: [{ name: 'Health', description: 'Liveness & readiness probes' }],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
});
