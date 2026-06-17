import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { requireCsrf } from '../middleware/csrf';
import { validateBody } from '../middleware/validate';
import { auditLogger } from '../middleware/audit';
import {
  updateUserSchema,
  updateUserStatusSchema,
  updateRoleSchema,
  updateSettingsSchema,
} from '../validation/admin.schemas';
import * as access from '../controllers/admin/access.controller';
import * as settings from '../controllers/admin/settings.controller';

/**
 * Admin management router — mounted at `/api` (Phase 13). Wires the previously
 * mock-backed admin screens to live data: Users, Roles & Permissions, Settings,
 * and the SEO sitemap status. All routes require JWT + the relevant RBAC
 * permission; writes additionally require CSRF + audit. No new models — these
 * read/write the existing User/Role/Permission/Session/Setting tables.
 */
export const adminRouter = Router();

// ───────────────────────── Users ─────────────────────────

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Admin Users]
 *     summary: List admin users (paginated, searchable, filter by role/status). Requires users.view.
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: perPage, schema: { type: integer, default: 24 } }
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: role, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, inactive, all] } }
 *     responses: { 200: { description: User list (no password/2FA secrets) } }
 */
adminRouter.get(
  '/users',
  authenticate,
  requirePermission('users.view'),
  asyncHandler(access.listUsers),
);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Admin Users]
 *     summary: Get a single user (requires users.view)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: User }, 404: { description: Not found } }
 *   patch:
 *     tags: [Admin Users]
 *     summary: Update a user's basic details — name/email/role (requires users.edit)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Updated }, 404: { description: Not found } }
 */
adminRouter.get(
  '/users/:id',
  authenticate,
  requirePermission('users.view'),
  asyncHandler(access.getUser),
);
adminRouter.patch(
  '/users/:id',
  authenticate,
  requireCsrf,
  requirePermission('users.edit'),
  validateBody(updateUserSchema),
  auditLogger('users.update', 'users'),
  asyncHandler(access.updateUser),
);

/**
 * @openapi
 * /api/users/{id}/status:
 *   patch:
 *     tags: [Admin Users]
 *     summary: Activate/deactivate a user (requires users.edit)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [isActive], properties: { isActive: { type: boolean } } } } }
 *     responses: { 200: { description: Status updated } }
 */
adminRouter.patch(
  '/users/:id/status',
  authenticate,
  requireCsrf,
  requirePermission('users.edit'),
  validateBody(updateUserStatusSchema),
  auditLogger('users.status', 'users'),
  asyncHandler(access.updateUserStatus),
);

// ───────────────────────── Roles ─────────────────────────

/**
 * @openapi
 * /api/roles:
 *   get:
 *     tags: [Admin Roles]
 *     summary: List roles with their permissions + user counts (requires roles.view)
 *     responses: { 200: { description: Roles } }
 */
adminRouter.get(
  '/roles',
  authenticate,
  requirePermission('roles.view'),
  asyncHandler(access.listRoles),
);

/**
 * @openapi
 * /api/roles/{id}:
 *   get:
 *     tags: [Admin Roles]
 *     summary: Get a single role with permissions (requires roles.view)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Role }, 404: { description: Not found } }
 *   patch:
 *     tags: [Admin Roles]
 *     summary: Update a role's description (requires roles.edit)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Updated }, 404: { description: Not found } }
 */
adminRouter.get(
  '/roles/:id',
  authenticate,
  requirePermission('roles.view'),
  asyncHandler(access.getRole),
);
adminRouter.patch(
  '/roles/:id',
  authenticate,
  requireCsrf,
  requirePermission('roles.edit'),
  validateBody(updateRoleSchema),
  auditLogger('roles.update', 'roles'),
  asyncHandler(access.updateRole),
);

// ───────────────────────── Settings ─────────────────────────

/**
 * @openapi
 * /api/settings:
 *   get:
 *     tags: [Admin Settings]
 *     summary: Get all application settings as a key/value map (requires settings.view; secrets redacted)
 *     responses: { 200: { description: Settings map } }
 *   put:
 *     tags: [Admin Settings]
 *     summary: Upsert a batch of settings (requires settings.edit)
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [values], properties: { values: { type: object } } } } }
 *     responses: { 200: { description: Saved } }
 */
adminRouter.get(
  '/settings',
  authenticate,
  requirePermission('settings.view'),
  asyncHandler(settings.getSettings),
);
adminRouter.put(
  '/settings',
  authenticate,
  requireCsrf,
  requirePermission('settings.edit'),
  validateBody(updateSettingsSchema),
  auditLogger('settings.update', 'settings'),
  asyncHandler(settings.updateSettings),
);

// ───────────────────────── SEO ─────────────────────────

/**
 * @openapi
 * /api/seo/sitemap:
 *   get:
 *     tags: [Admin SEO]
 *     summary: Real sitemap status — counts of published entities exposed in sitemap.xml (requires seo.view)
 *     responses: { 200: { description: Sitemap status } }
 */
adminRouter.get(
  '/seo/sitemap',
  authenticate,
  requirePermission('seo.view'),
  asyncHandler(settings.getSitemapStatus),
);
