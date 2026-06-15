import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { requireCsrf } from '../middleware/csrf';
import { validateBody } from '../middleware/validate';
import { auditLogger } from '../middleware/audit';
import { generateSchema, bulkGenerateSchema, updatePromptSchema } from '../validation/ai.schemas';
import * as ctrl from '../controllers/ai/ai.controller';

/**
 * AI Center API (Phase 7, spec §8.7 / §2.6). Mounted at `/api`. Reads need `ai.view`;
 * generating needs `ai.generate`; managing (retry, approve, prompts) needs `ai.manage`.
 * All writes: JWT + CSRF + audit. Jobs run via the inline or BullMQ driver (ADR-023).
 * AI content is stored for review; only approval applies it to public fields (§4.6).
 */
export const aiRouter = Router();

const view = [authenticate, requirePermission('ai.view')] as const;

/**
 * @openapi
 * /api/ai/stats:
 *   get: { tags: [AI], summary: AI dashboard stats — tokens/cost this month, jobs, providers (ai.view), responses: { 200: { description: Stats } } }
 * /api/ai/queue:
 *   get:
 *     tags: [AI]
 *     summary: List AI queue jobs (paginated; ai.view)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: perPage, schema: { type: integer } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, pending, processing, done, failed] } }
 *       - { in: query, name: entityType, schema: { type: string, enum: [product, guide, comparison, category, brand] } }
 *       - { in: query, name: jobType, schema: { type: string } }
 *     responses: { 200: { description: Jobs } }
 * /api/ai/queue/{id}:
 *   get: { tags: [AI], summary: AI job detail + logs (ai.view), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Job }, 404: { description: Not found } } }
 * /api/ai/logs:
 *   get: { tags: [AI], summary: AI logs — model/tokens/cost/status, 30-day retention (ai.view), responses: { 200: { description: Logs } } }
 * /api/ai/providers:
 *   get: { tags: [AI], summary: Configured providers + usage (ai.view), responses: { 200: { description: Providers } } }
 * /api/ai/usage:
 *   get: { tags: [AI], summary: Usage & cost series (ai.view), responses: { 200: { description: Usage } } }
 * /api/ai/prompts:
 *   get: { tags: [AI], summary: List the 10 editable prompt templates (ai.view), responses: { 200: { description: Prompts } } }
 */
aiRouter.get('/ai/stats', ...view, asyncHandler(ctrl.getStats));
aiRouter.get('/ai/queue', ...view, asyncHandler(ctrl.listQueue));
aiRouter.get('/ai/queue/:id', ...view, asyncHandler(ctrl.getJob));
aiRouter.get('/ai/logs', ...view, asyncHandler(ctrl.listLogs));
aiRouter.get('/ai/providers', ...view, asyncHandler(ctrl.getProviders));
aiRouter.get('/ai/usage', ...view, asyncHandler(ctrl.getUsage));
aiRouter.get('/ai/prompts', ...view, asyncHandler(ctrl.listPrompts));

/**
 * @openapi
 * /api/ai/generate:
 *   post: { tags: [AI], summary: Generate AI content for one entity (ai.generate), description: "Body { entityType, entityId, jobTypes? }. Covers per-entity generate-ai / regenerate-ai.", responses: { 201: { description: Queued } } }
 * /api/ai/bulk-generate:
 *   post: { tags: [AI], summary: Bulk generate (FR-051; ai.generate), description: "Body { entityType, entityIds?, jobTypes?, limit? }. Without ids, auto-selects products needing AI.", responses: { 201: { description: Queued } } }
 * /api/ai/queue/retry/{id}:
 *   post: { tags: [AI], summary: Retry a failed AI job (ai.generate), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Retried } } }
 * /api/ai/queue/retry-all-failed:
 *   post: { tags: [AI], summary: Retry all failed AI jobs (ai.generate), responses: { 200: { description: Retried } } }
 */
aiRouter.post(
  '/ai/generate',
  authenticate,
  requireCsrf,
  requirePermission('ai.generate'),
  validateBody(generateSchema),
  auditLogger('ai.generate', 'ai'),
  asyncHandler(ctrl.generate),
);
aiRouter.post(
  '/ai/bulk-generate',
  authenticate,
  requireCsrf,
  requirePermission('ai.generate'),
  validateBody(bulkGenerateSchema),
  auditLogger('ai.bulk_generate', 'ai'),
  asyncHandler(ctrl.bulkGenerate),
);
aiRouter.post(
  '/ai/queue/retry-all-failed',
  authenticate,
  requireCsrf,
  requirePermission('ai.generate'),
  auditLogger('ai.retry_all', 'ai'),
  asyncHandler(ctrl.retryAllFailed),
);
aiRouter.post(
  '/ai/queue/retry/:id',
  authenticate,
  requireCsrf,
  requirePermission('ai.generate'),
  auditLogger('ai.retry', 'ai'),
  asyncHandler(ctrl.retry),
);

/**
 * @openapi
 * /api/ai/queue/approve/{id}:
 *   post: { tags: [AI], summary: Approve a completed AI job → apply to entity (review gate; ai.manage), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Approved }, 400: { description: Not approvable } } }
 * /api/ai/prompts/{type}:
 *   put: { tags: [AI], summary: Update a prompt template (FR-054; ai.manage), parameters: [{ in: path, name: type, required: true, schema: { type: string } }], responses: { 200: { description: Saved }, 400: { description: Unknown type } } }
 */
aiRouter.post(
  '/ai/queue/approve/:id',
  authenticate,
  requireCsrf,
  requirePermission('ai.manage'),
  auditLogger('ai.approve', 'ai'),
  asyncHandler(ctrl.approve),
);
aiRouter.put(
  '/ai/prompts/:type',
  authenticate,
  requireCsrf,
  requirePermission('ai.manage'),
  validateBody(updatePromptSchema),
  auditLogger('ai.prompt_updated', 'ai'),
  asyncHandler(ctrl.updatePrompt),
);
