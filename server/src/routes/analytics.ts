import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { requireCsrf } from '../middleware/csrf';
import { validateBody } from '../middleware/validate';
import { auditLogger } from '../middleware/audit';
import { publicCatalogLimiter } from '../middleware/rateLimit';
import { collectSchema, generateReportSchema } from '../validation/analytics.schemas';
import * as ctrl from '../controllers/analytics/analytics.controller';

/**
 * Analytics & Reporting API (Phase 8, spec §13 / §8.8). Mounted at `/api`. Reads need
 * `analytics.view`; report reads need `reports.view`; generating/deleting reports needs
 * `reports.manage` (JWT + CSRF + audit). The public `/analytics/collect` beacon is
 * unauthenticated by necessity (first-party page-view tracking) but privacy-safe
 * (SHA-256(ip) only — NFR-SEC-007), validated, and rate-limited.
 */
export const analyticsRouter = Router();

const view = [authenticate, requirePermission('analytics.view')] as const;
const reportsView = [authenticate, requirePermission('reports.view')] as const;

/**
 * @openapi
 * /api/analytics/collect:
 *   post: { tags: [Analytics], summary: Public privacy-safe event beacon (no auth; SHA-256(ip) only), responses: { 202: { description: Accepted } } }
 */
analyticsRouter.post('/analytics/collect', publicCatalogLimiter, validateBody(collectSchema), asyncHandler(ctrl.collect));

/**
 * @openapi
 * /api/analytics/dashboard:
 *   get: { tags: [Analytics], summary: Dashboard KPIs + traffic/devices/geo/top-pages/realtime (analytics.view), parameters: [{ in: query, name: range, schema: { type: string, enum: [today, last7days, last30days, thisMonth] } }], responses: { 200: { description: Dashboard } } }
 * /api/analytics/products:
 *   get: { tags: [Analytics], summary: Most viewed/clicked/highest-revenue/trending products (analytics.view), responses: { 200: { description: Products } } }
 * /api/analytics/search:
 *   get: { tags: [Analytics], summary: Top searches, zero-result, trends (analytics.view), responses: { 200: { description: Search } } }
 * /api/analytics/revenue:
 *   get: { tags: [Analytics], summary: Daily/weekly/monthly revenue + by category/brand + estimate (analytics.view), responses: { 200: { description: Revenue } } }
 * /api/analytics/ai:
 *   get: { tags: [Analytics], summary: AI tokens/cost/provider/model/generation/failed (analytics.view), responses: { 200: { description: AI } } }
 * /api/analytics/content:
 *   get: { tags: [Analytics], summary: Top guides/comparisons/authors/categories/brands (analytics.view), responses: { 200: { description: Content } } }
 * /api/analytics/providers:
 *   get: { tags: [Analytics], summary: External provider status — PostHog/GA4/GSC (analytics.view), responses: { 200: { description: Providers } } }
 * /api/analytics/events:
 *   get:
 *     tags: [Analytics]
 *     summary: Paginated raw analytics events (analytics.view)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: perPage, schema: { type: integer } }
 *       - { in: query, name: eventType, schema: { type: string } }
 *       - { in: query, name: entityType, schema: { type: string } }
 *     responses: { 200: { description: Events } }
 */
analyticsRouter.get('/analytics/dashboard', ...view, asyncHandler(ctrl.getDashboard));
analyticsRouter.get('/analytics/products', ...view, asyncHandler(ctrl.getProducts));
analyticsRouter.get('/analytics/search', ...view, asyncHandler(ctrl.getSearch));
analyticsRouter.get('/analytics/revenue', ...view, asyncHandler(ctrl.getRevenue));
analyticsRouter.get('/analytics/ai', ...view, asyncHandler(ctrl.getAi));
analyticsRouter.get('/analytics/content', ...view, asyncHandler(ctrl.getContent));
analyticsRouter.get('/analytics/providers', ...view, asyncHandler(ctrl.getProviders));
analyticsRouter.get('/analytics/events', ...view, asyncHandler(ctrl.listEvents));

/**
 * @openapi
 * /api/analytics/reports:
 *   get: { tags: [Analytics], summary: List report snapshots (reports.view), responses: { 200: { description: Reports } } }
 *   post: { tags: [Analytics], summary: Generate a report snapshot (reports.manage), responses: { 201: { description: Generated } } }
 * /api/analytics/reports/{id}:
 *   get: { tags: [Analytics], summary: Get a report snapshot (reports.view), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Report }, 404: { description: Not found } } }
 *   delete: { tags: [Analytics], summary: Delete a report snapshot (reports.manage), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Deleted } } }
 */
analyticsRouter.get('/analytics/reports', ...reportsView, asyncHandler(ctrl.listReports));
analyticsRouter.get('/analytics/reports/:id', ...reportsView, asyncHandler(ctrl.getReport));
analyticsRouter.post(
  '/analytics/reports',
  authenticate,
  requireCsrf,
  requirePermission('reports.manage'),
  validateBody(generateReportSchema),
  auditLogger('analytics.report_generated', 'reports'),
  asyncHandler(ctrl.generateReport),
);
analyticsRouter.delete(
  '/analytics/reports/:id',
  authenticate,
  requireCsrf,
  requirePermission('reports.manage'),
  auditLogger('analytics.report_deleted', 'reports'),
  asyncHandler(ctrl.removeReport),
);
