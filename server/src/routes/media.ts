import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { requireCsrf } from '../middleware/csrf';
import { validateBody } from '../middleware/validate';
import { auditLogger } from '../middleware/audit';
import { uploadMedia, uploadSingle } from '../middleware/upload';
import { updateMediaSchema, attachUsageSchema, createFolderSchema } from '../validation/media.schemas';
import * as ctrl from '../controllers/media/media.controller';

/**
 * Media Library API (Phase 10). Mounted at `/api`. Reads need `media.view`; uploads need
 * `media.upload`; replace/delete/usage/folders need `media.manage`. All writes: JWT +
 * CSRF + audit. Files are served statically at `/uploads`.
 */
export const mediaRouter = Router();

const view = [authenticate, requirePermission('media.view')] as const;

/**
 * @openapi
 * /api/media/upload:
 *   post:
 *     tags: [Media]
 *     summary: Upload one or more images (multipart, field "files"; media.upload)
 *     description: jpg/jpeg/png/webp/svg. Hash-deduped; sharp generates thumbnail/webp/responsive variants.
 *     responses: { 201: { description: Uploaded }, 400: { description: Invalid file } }
 */
mediaRouter.post(
  '/media/upload',
  authenticate,
  requireCsrf,
  requirePermission('media.upload'),
  uploadMedia,
  auditLogger('media.upload', 'media'),
  asyncHandler(ctrl.upload),
);

/**
 * @openapi
 * /api/media:
 *   get:
 *     tags: [Media]
 *     summary: Browse media assets (paginated; folder/type/search/unused filters; media.view)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: perPage, schema: { type: integer } }
 *       - { in: query, name: folderId, schema: { type: string } }
 *       - { in: query, name: mimeType, schema: { type: string } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: unused, schema: { type: string, enum: [true, false] } }
 *     responses: { 200: { description: Assets } }
 * /api/media/search:
 *   get: { tags: [Media], summary: Search media by name (media.view), parameters: [{ in: query, name: q, schema: { type: string } }], responses: { 200: { description: Results } } }
 * /api/media/unused:
 *   get: { tags: [Media], summary: List unused assets — no usage links (media.view), responses: { 200: { description: Unused } } }
 * /api/media/stats:
 *   get: { tags: [Media], summary: Library stats — count/size/by-type/unused/folders (media.view), responses: { 200: { description: Stats } } }
 * /api/media/{id}:
 *   get: { tags: [Media], summary: Get an asset + its usages (media.view), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Asset }, 404: { description: Not found } } }
 * /api/media/{id}/usage:
 *   get: { tags: [Media], summary: List where an asset is used (media.view), parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Usage } } }
 */
mediaRouter.get('/media/search', ...view, asyncHandler(ctrl.search));
mediaRouter.get('/media/unused', ...view, asyncHandler(ctrl.unused));
mediaRouter.get('/media/stats', ...view, asyncHandler(ctrl.stats));
mediaRouter.get('/media/folders', ...view, asyncHandler(ctrl.listFolders));
mediaRouter.get('/media', ...view, asyncHandler(ctrl.list));
mediaRouter.get('/media/:id/usage', ...view, asyncHandler(ctrl.usage));
mediaRouter.get('/media/:id', ...view, asyncHandler(ctrl.get));

// ── Manage (media.manage) ──
/**
 * @openapi
 * /api/media/{id}/replace:
 *   post: { tags: [Media], summary: Replace an asset's binary in place — references update (media.manage), responses: { 200: { description: Replaced } } }
 * /api/media/{id}:
 *   patch: { tags: [Media], summary: Edit metadata — altText/caption/folder (media.manage), responses: { 200: { description: Updated } } }
 *   delete: { tags: [Media], summary: Delete an asset + files (media.manage), responses: { 200: { description: Deleted } } }
 * /api/media/{id}/usage:
 *   post: { tags: [Media], summary: Link an asset to an entity (media.manage), responses: { 201: { description: Linked } } }
 *   delete: { tags: [Media], summary: Unlink an asset from an entity (media.manage), responses: { 200: { description: Unlinked } } }
 */
mediaRouter.post('/media/:id/replace', authenticate, requireCsrf, requirePermission('media.manage'), uploadSingle, auditLogger('media.replace', 'media'), asyncHandler(ctrl.replace));
mediaRouter.patch('/media/:id', authenticate, requireCsrf, requirePermission('media.manage'), validateBody(updateMediaSchema), auditLogger('media.update', 'media'), asyncHandler(ctrl.update));
mediaRouter.delete('/media/:id/usage', authenticate, requireCsrf, requirePermission('media.manage'), validateBody(attachUsageSchema), auditLogger('media.usage_detached', 'media'), asyncHandler(ctrl.detachUsage));
mediaRouter.delete('/media/:id', authenticate, requireCsrf, requirePermission('media.manage'), auditLogger('media.delete', 'media'), asyncHandler(ctrl.remove));
mediaRouter.post('/media/:id/usage', authenticate, requireCsrf, requirePermission('media.manage'), validateBody(attachUsageSchema), auditLogger('media.usage_attached', 'media'), asyncHandler(ctrl.attachUsage));

// ── Folders (media.manage) ──
mediaRouter.post('/media/folders', authenticate, requireCsrf, requirePermission('media.manage'), validateBody(createFolderSchema), auditLogger('media.folder_created', 'media'), asyncHandler(ctrl.createFolder));
mediaRouter.delete('/media/folders/:id', authenticate, requireCsrf, requirePermission('media.manage'), auditLogger('media.folder_deleted', 'media'), asyncHandler(ctrl.removeFolder));
