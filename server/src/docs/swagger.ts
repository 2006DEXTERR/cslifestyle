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
        'AI-powered SEO affiliate commerce platform API. Auth (/api/auth) + catalog ' +
        '(/api/products, /api/categories, /api/brands, /api/search) are live. Remaining ' +
        'domain endpoints (guides, comparisons, affiliate, AI, SEO, analytics) follow in later phases.',
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
        Product: {
          type: 'object',
          description: 'Catalog product (presented shape consumed by the storefront + admin).',
          properties: {
            id: { type: 'string' },
            slug: { type: 'string' },
            name: { type: 'string' },
            brand: { type: 'string' },
            brandSlug: { type: 'string' },
            category: { type: 'string' },
            categorySlug: { type: 'string' },
            image: { type: 'string' },
            images: { type: 'array', items: { type: 'string' } },
            rating: { type: 'number' },
            reviewCount: { type: 'integer' },
            currentPrice: { type: 'number' },
            originalPrice: { type: 'number', nullable: true },
            discount: { type: 'integer', nullable: true },
            availability: { type: 'string', example: 'In Stock' },
            highlights: { type: 'array', items: { type: 'string' } },
            pros: { type: 'array', items: { type: 'string' } },
            cons: { type: 'array', items: { type: 'string' } },
            specifications: { type: 'object' },
            faqs: { type: 'array', items: { type: 'object' } },
            affiliateUrl: { type: 'string' },
            asin: { type: 'string' },
            isPublished: { type: 'boolean' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            slug: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            image: { type: 'string' },
            icon: { type: 'string' },
            productCount: { type: 'integer' },
            subcategories: { type: 'array', items: { type: 'string' } },
            parentId: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            sortOrder: { type: 'integer' },
          },
        },
        Brand: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            slug: { type: 'string' },
            name: { type: 'string' },
            logo: { type: 'string' },
            description: { type: 'string' },
            productCount: { type: 'integer' },
            rating: { type: 'number' },
            website: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Liveness & readiness probes' },
      { name: 'Products', description: 'Catalog products (public reads, RBAC-guarded writes)' },
      { name: 'Categories', description: 'Catalog categories' },
      { name: 'Brands', description: 'Catalog brands' },
      { name: 'Search', description: 'Catalog search' },
      { name: 'Authors', description: 'Content authors' },
      { name: 'Guides', description: 'Buying guides (public reads, RBAC-guarded writes)' },
      { name: 'Comparisons', description: 'Product comparisons' },
      { name: 'Affiliate', description: 'Affiliate redirect, clicks, campaigns, settings, compliance' },
      { name: 'Revenue', description: 'Revenue CSV imports + reports' },
      { name: 'Import', description: 'Import Center — CSV/ASIN/category imports, jobs, reports' },
      { name: 'AI', description: 'AI content engine — queue, generation, prompts, providers, logs' },
      { name: 'Analytics', description: 'Analytics & reporting — dashboard, product/search/revenue/AI/content, events, reports' },
      { name: 'Marketing', description: 'Marketing & communication — newsletter, subscribers, campaigns, email tracking' },
      { name: 'Media', description: 'Media Library — upload, optimize, browse/search, folders, usage tracking' },
      { name: 'Recommendations', description: 'Recommendation engine + internal linking (Phase 11)' },
    ],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
});
