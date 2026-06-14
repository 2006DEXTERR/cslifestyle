import { Router, type Request, type Response } from 'express';
import { ok } from '../lib/http';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { validateBody } from '../middleware/validate';
import { auditLogger } from '../middleware/audit';
import { requireCsrf } from '../middleware/csrf';
import { asyncHandler } from '../lib/async-handler';
import * as security from '../controllers/security.controller';
import { twoFactorPolicySchema } from '../validation/twofactor.schemas';

/**
 * Versioned API router (mounted at API_PREFIX, default `/api/v1`).
 * Phase 0 exposed a base ping; Phase 1 adds a JWT+RBAC-protected admin probe.
 * Domain routers (products, categories, guides, comparisons, search, affiliate,
 * ai, seo, admin…) attach here in later phases per `07-api-design.md`.
 */
export const apiRouter = Router();

/**
 * @openapi
 * /api/v1/health:
 *   get:
 *     tags: [Health]
 *     summary: API base ping
 *     description: Confirms the versioned API surface is mounted.
 *     responses:
 *       200:
 *         description: API is reachable
 */
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json(ok({ status: 'ok', api: 'v1', timestamp: new Date().toISOString() }));
});

/**
 * @openapi
 * /api/v1/admin/ping:
 *   get:
 *     tags: [Admin]
 *     summary: JWT+RBAC-protected probe (requires the "admin.access" permission)
 *     responses:
 *       200: { description: Authorised }
 *       401: { description: Not authenticated }
 *       403: { description: Authenticated but lacking admin.access }
 */
apiRouter.get(
  '/admin/ping',
  authenticate,
  requirePermission('admin.access'),
  (req: Request, res: Response) => {
    res.json(ok({ status: 'ok', user: req.user?.email, role: req.user?.role }));
  },
);

/**
 * @openapi
 * /api/v1/admin/security/2fa-policy:
 *   get:
 *     tags: [Admin]
 *     summary: Get the roles for which two-factor authentication is enforced
 *     responses:
 *       200: { description: Enforced roles }
 *       401: { description: Not authenticated }
 *       403: { description: Missing settings.view permission }
 *   put:
 *     tags: [Admin]
 *     summary: Set the roles for which two-factor authentication is enforced
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roles]
 *             properties:
 *               roles: { type: array, items: { type: string }, example: [admin, seo_manager] }
 *     responses:
 *       200: { description: Policy updated }
 *       401: { description: Not authenticated }
 *       403: { description: Missing settings.edit permission }
 */
apiRouter.get(
  '/admin/security/2fa-policy',
  authenticate,
  requirePermission('settings.view'),
  asyncHandler(security.getTwoFactorPolicy),
);
apiRouter.put(
  '/admin/security/2fa-policy',
  authenticate,
  requireCsrf,
  requirePermission('settings.edit'),
  validateBody(twoFactorPolicySchema),
  auditLogger('security.2fa_policy_updated', 'security'),
  asyncHandler(security.updateTwoFactorPolicy),
);
