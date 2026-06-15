import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { requireCsrf } from '../middleware/csrf';
import { validateBody } from '../middleware/validate';
import { auditLogger } from '../middleware/audit';
import {
  importCsvSchema,
  importAsinsSchema,
  importCategoriesSchema,
  createTemplateSchema,
} from '../validation/import.schemas';
import * as ctrl from '../controllers/import/import.controller';

/**
 * Import Center API (mounted at `/api`). Reads need `import.view`; creating jobs
 * needs `import.create`; managing (retry/cancel/templates) needs `import.manage`.
 * All writes: JWT + CSRF + audit. Jobs run via the inline or BullMQ driver (ADR-023).
 */
export const importRouter = Router();

const view = [authenticate, requirePermission('import.view')] as const;

/**
 * @openapi
 * /api/import/stats:
 *   get: { tags: [Import], summary: Import dashboard stats (import.view), responses: { 200: { description: Stats } } }
 * /api/import/jobs:
 *   get:
 *     tags: [Import]
 *     summary: List import jobs (paginated; import.view)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: perPage, schema: { type: integer } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, pending, processing, completed, failed, cancelled] } }
 *       - { in: query, name: type, schema: { type: string, enum: [csv_product, asin, category] } }
 *     responses: { 200: { description: Jobs } }
 * /api/import/jobs/{id}:
 *   get: { tags: [Import], summary: Import job detail + items (import.view), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Job }, 404: { description: Not found } } }
 * /api/import/jobs/{id}/report:
 *   get: { tags: [Import], summary: Import job report (imported/skipped/failed/duplicates/duration) (import.view), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Report } } }
 */
importRouter.get('/import/stats', ...view, asyncHandler(ctrl.getStats));
importRouter.get('/import/jobs', ...view, asyncHandler(ctrl.listJobs));
importRouter.get('/import/jobs/:id', ...view, asyncHandler(ctrl.getJob));
importRouter.get('/import/jobs/:id/report', ...view, asyncHandler(ctrl.getReport));

/**
 * @openapi
 * /api/import/csv:
 *   post:
 *     tags: [Import]
 *     summary: Bulk/CSV product import (import.create)
 *     description: Body { fileName, csv, duplicateMode?, name? }. Columns asin,title,brand,category,price,originalPrice,rating,reviewCount,imageUrl,description.
 *     responses: { 201: { description: Job started }, 400: { description: Invalid CSV } }
 * /api/import/asins:
 *   post: { tags: [Import], summary: ASIN import (import.create), description: "Body { asins: string[], duplicateMode? }", responses: { 201: { description: Job started } } }
 * /api/import/categories:
 *   post: { tags: [Import], summary: Category import incl. nested (import.create), description: "Body { categories: [{ name, parentName?, slug?, description? }], duplicateMode? }", responses: { 201: { description: Job started } } }
 */
importRouter.post(
  '/import/csv',
  authenticate,
  requireCsrf,
  requirePermission('import.create'),
  validateBody(importCsvSchema),
  auditLogger('import.csv', 'import'),
  asyncHandler(ctrl.createCsv),
);
importRouter.post(
  '/import/asins',
  authenticate,
  requireCsrf,
  requirePermission('import.create'),
  validateBody(importAsinsSchema),
  auditLogger('import.asins', 'import'),
  asyncHandler(ctrl.createAsins),
);
importRouter.post(
  '/import/categories',
  authenticate,
  requireCsrf,
  requirePermission('import.create'),
  validateBody(importCategoriesSchema),
  auditLogger('import.categories', 'import'),
  asyncHandler(ctrl.createCategories),
);

/**
 * @openapi
 * /api/import/jobs/{id}/retry:
 *   post: { tags: [Import], summary: Retry failed items of a job (import.manage), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Retried } } }
 * /api/import/jobs/{id}/cancel:
 *   post: { tags: [Import], summary: Cancel a pending/processing job (import.manage), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Cancelled }, 400: { description: Not cancellable } } }
 */
importRouter.post(
  '/import/jobs/:id/retry',
  authenticate,
  requireCsrf,
  requirePermission('import.manage'),
  auditLogger('import.retry', 'import'),
  asyncHandler(ctrl.retry),
);
importRouter.post(
  '/import/jobs/:id/cancel',
  authenticate,
  requireCsrf,
  requirePermission('import.manage'),
  auditLogger('import.cancel', 'import'),
  asyncHandler(ctrl.cancel),
);

/**
 * @openapi
 * /api/import/templates:
 *   get: { tags: [Import], summary: List import templates (import.view), responses: { 200: { description: Templates } } }
 *   post: { tags: [Import], summary: Create an import template/mapping (import.manage), responses: { 201: { description: Created } } }
 * /api/import/templates/{id}:
 *   delete: { tags: [Import], summary: Delete a template (import.manage), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Deleted } } }
 */
importRouter.get('/import/templates', ...view, asyncHandler(ctrl.listTemplates));
importRouter.post(
  '/import/templates',
  authenticate,
  requireCsrf,
  requirePermission('import.manage'),
  validateBody(createTemplateSchema),
  auditLogger('import.template_created', 'import'),
  asyncHandler(ctrl.createTemplate),
);
importRouter.delete(
  '/import/templates/:id',
  authenticate,
  requireCsrf,
  requirePermission('import.manage'),
  auditLogger('import.template_deleted', 'import'),
  asyncHandler(ctrl.removeTemplate),
);
