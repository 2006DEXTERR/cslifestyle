import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { requireCsrf } from '../middleware/csrf';
import { validateBody } from '../middleware/validate';
import { auditLogger } from '../middleware/audit';
import {
  updateSettingsSchema,
  createCampaignSchema,
  updateCampaignSchema,
  importRevenueSchema,
} from '../validation/affiliate.schemas';
import * as ctrl from '../controllers/affiliate/affiliate.controller';

/**
 * Affiliate + Revenue admin API (mounted at `/api`). All endpoints require auth;
 * reads need `affiliate.view`, writes need `affiliate.{create,edit,delete}` + CSRF + audit.
 */
export const affiliateRouter = Router();

const view = [authenticate, requirePermission('affiliate.view')] as const;

// ───────────────────────── Analytics ─────────────────────────

/**
 * @openapi
 * /api/affiliate/stats:
 *   get: { tags: [Affiliate], summary: Click/revenue stats over N days (affiliate.view), parameters: [{ in: query, name: days, schema: { type: integer, default: 30 } }], responses: { 200: { description: Stats } } }
 * /api/affiliate/top-products:
 *   get: { tags: [Affiliate], summary: Top products by clicks/revenue (affiliate.view), responses: { 200: { description: Top products } } }
 * /api/affiliate/compliance:
 *   get: { tags: [Affiliate], summary: Affiliate-compliance checklist (FR-063, affiliate.view), responses: { 200: { description: Checklist + score } } }
 */
affiliateRouter.get('/affiliate/stats', ...view, asyncHandler(ctrl.getStats));
affiliateRouter.get('/affiliate/top-products', ...view, asyncHandler(ctrl.getTopProducts));
affiliateRouter.get('/affiliate/compliance', ...view, asyncHandler(ctrl.getCompliance));

/**
 * @openapi
 * /api/affiliate/clicks:
 *   get:
 *     tags: [Affiliate]
 *     summary: List affiliate clicks (paginated/filterable; affiliate.view). IP/UA hashes never exposed.
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: perPage, schema: { type: integer } }
 *       - { in: query, name: asin, schema: { type: string } }
 *       - { in: query, name: sourceType, schema: { type: string } }
 *       - { in: query, name: deviceType, schema: { type: string } }
 *       - { in: query, name: days, schema: { type: integer } }
 *     responses: { 200: { description: Paginated clicks } }
 */
affiliateRouter.get('/affiliate/clicks', ...view, asyncHandler(ctrl.getClicks));

// ───────────────────────── Settings (associate tag) ─────────────────────────

/**
 * @openapi
 * /api/affiliate/settings:
 *   get: { tags: [Affiliate], summary: Get affiliate settings (associate tag, domain, disclosure) (affiliate.view), responses: { 200: { description: Settings } } }
 *   put: { tags: [Affiliate], summary: Update affiliate settings (affiliate.edit), responses: { 200: { description: Updated }, 403: { description: Missing affiliate.edit } } }
 */
affiliateRouter.get('/affiliate/settings', ...view, asyncHandler(ctrl.getSettings));
affiliateRouter.put(
  '/affiliate/settings',
  authenticate,
  requireCsrf,
  requirePermission('affiliate.edit'),
  validateBody(updateSettingsSchema),
  auditLogger('affiliate.settings_updated', 'affiliate'),
  asyncHandler(ctrl.updateSettings),
);

// ───────────────────────── Campaigns ─────────────────────────

/**
 * @openapi
 * /api/affiliate/campaigns:
 *   get: { tags: [Affiliate], summary: List campaigns (affiliate.view), responses: { 200: { description: Campaigns } } }
 *   post: { tags: [Affiliate], summary: Create a campaign (affiliate.create), responses: { 201: { description: Created } } }
 * /api/affiliate/campaigns/{id}:
 *   put: { tags: [Affiliate], summary: Update a campaign (affiliate.edit), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Updated } } }
 *   delete: { tags: [Affiliate], summary: Delete a campaign (affiliate.delete), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Deleted } } }
 */
affiliateRouter.get('/affiliate/campaigns', ...view, asyncHandler(ctrl.listCampaigns));
affiliateRouter.post(
  '/affiliate/campaigns',
  authenticate,
  requireCsrf,
  requirePermission('affiliate.create'),
  validateBody(createCampaignSchema),
  auditLogger('affiliate.campaign_created', 'affiliate'),
  asyncHandler(ctrl.createCampaign),
);
affiliateRouter.put(
  '/affiliate/campaigns/:id',
  authenticate,
  requireCsrf,
  requirePermission('affiliate.edit'),
  validateBody(updateCampaignSchema),
  auditLogger('affiliate.campaign_updated', 'affiliate'),
  asyncHandler(ctrl.updateCampaign),
);
affiliateRouter.delete(
  '/affiliate/campaigns/:id',
  authenticate,
  requireCsrf,
  requirePermission('affiliate.delete'),
  auditLogger('affiliate.campaign_deleted', 'affiliate'),
  asyncHandler(ctrl.deleteCampaign),
);

// ───────────────────────── Revenue ─────────────────────────

/**
 * @openapi
 * /api/revenue/import:
 *   post:
 *     tags: [Revenue]
 *     summary: Import a revenue CSV (affiliate.edit)
 *     description: Body { fileName, source, csv }. Parses rows → RevenueReport + a RevenueImport record.
 *     responses: { 201: { description: Imported }, 400: { description: Invalid CSV } }
 * /api/revenue/imports:
 *   get: { tags: [Revenue], summary: List revenue imports (affiliate.view), responses: { 200: { description: Imports } } }
 * /api/revenue/reports:
 *   get: { tags: [Revenue], summary: List revenue reports (paginated; affiliate.view), responses: { 200: { description: Reports } } }
 * /api/revenue/summary:
 *   get: { tags: [Revenue], summary: Revenue summary over N days (affiliate.view), responses: { 200: { description: Summary } } }
 */
affiliateRouter.post(
  '/revenue/import',
  authenticate,
  requireCsrf,
  requirePermission('affiliate.edit'),
  validateBody(importRevenueSchema),
  auditLogger('revenue.imported', 'affiliate'),
  asyncHandler(ctrl.importRevenue),
);
affiliateRouter.get('/revenue/imports', ...view, asyncHandler(ctrl.listImports));
affiliateRouter.get('/revenue/reports', ...view, asyncHandler(ctrl.getReports));
affiliateRouter.get('/revenue/summary', ...view, asyncHandler(ctrl.getSummary));
