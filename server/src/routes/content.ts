import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { authenticate } from '../middleware/authenticate';
import { optionalAuthenticate } from '../middleware/optionalAuthenticate';
import { requirePermission } from '../middleware/authorize';
import { requireCsrf } from '../middleware/csrf';
import { validateBody } from '../middleware/validate';
import { auditLogger } from '../middleware/audit';
import { publicCatalogLimiter } from '../middleware/rateLimit';
import {
  createAuthorSchema,
  updateAuthorSchema,
  createGuideSchema,
  updateGuideSchema,
  createComparisonSchema,
  updateComparisonSchema,
} from '../validation/content.schemas';
import * as authors from '../controllers/content/author.controller';
import * as guides from '../controllers/content/guide.controller';
import * as comparisons from '../controllers/content/comparison.controller';

/**
 * Content router — mounted at `/api` (Phase 3): authors, guides, comparisons.
 * Public reads via `optionalAuthenticate` (editors additionally see drafts/inactive);
 * writes require JWT + RBAC + CSRF + audit. See ADR-019/ADR-020.
 */
export const contentRouter = Router();

// ───────────────────────── Authors ─────────────────────────

/**
 * @openapi
 * /api/authors:
 *   get:
 *     tags: [Authors]
 *     summary: List authors (paginated, searchable)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: perPage, schema: { type: integer, default: 24 } }
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, all] } }
 *       - { in: query, name: sort, schema: { type: string, enum: [name, newest] } }
 *     responses: { 200: { description: Author list } }
 *   post:
 *     tags: [Authors]
 *     summary: Create an author (requires authors.create)
 *     responses: { 201: { description: Created }, 403: { description: Missing authors.create } }
 */
contentRouter.get('/authors', publicCatalogLimiter, optionalAuthenticate, asyncHandler(authors.list));
contentRouter.post(
  '/authors',
  authenticate,
  requireCsrf,
  requirePermission('authors.create'),
  validateBody(createAuthorSchema),
  auditLogger('authors.create', 'authors'),
  asyncHandler(authors.create),
);

/**
 * @openapi
 * /api/authors/{slug}:
 *   get:
 *     tags: [Authors]
 *     summary: Get an author by slug (incl. their published guides)
 *     parameters: [{ in: path, name: slug, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Author }, 404: { description: Not found } }
 */
contentRouter.get('/authors/:slug', publicCatalogLimiter, optionalAuthenticate, asyncHandler(authors.getBySlug));

/**
 * @openapi
 * /api/authors/{id}:
 *   put:
 *     tags: [Authors]
 *     summary: Update an author (requires authors.edit)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Updated }, 404: { description: Not found } }
 *   delete:
 *     tags: [Authors]
 *     summary: Delete an author (requires authors.delete; their guides are kept, unlinked)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Deleted } }
 */
contentRouter.put(
  '/authors/:id',
  authenticate,
  requireCsrf,
  requirePermission('authors.edit'),
  validateBody(updateAuthorSchema),
  auditLogger('authors.update', 'authors'),
  asyncHandler(authors.update),
);
contentRouter.delete(
  '/authors/:id',
  authenticate,
  requireCsrf,
  requirePermission('authors.delete'),
  auditLogger('authors.delete', 'authors'),
  asyncHandler(authors.remove),
);

// ───────────────────────── Guides ─────────────────────────

/**
 * @openapi
 * /api/guides:
 *   get:
 *     tags: [Guides]
 *     summary: List guides (paginated, filterable, sortable, searchable)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: perPage, schema: { type: integer, default: 12 } }
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: category, schema: { type: string }, description: slug or id }
 *       - { in: query, name: author, schema: { type: string }, description: slug or id }
 *       - { in: query, name: status, schema: { type: string, enum: [published, draft, all] }, description: non-published requires guides.view }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, oldest, title] } }
 *     responses: { 200: { description: Paginated guide list } }
 *   post:
 *     tags: [Guides]
 *     summary: Create a guide (requires guides.create)
 *     responses: { 201: { description: Created }, 403: { description: Missing guides.create } }
 */
contentRouter.get('/guides', publicCatalogLimiter, optionalAuthenticate, asyncHandler(guides.list));
contentRouter.post(
  '/guides',
  authenticate,
  requireCsrf,
  requirePermission('guides.create'),
  validateBody(createGuideSchema),
  auditLogger('guides.create', 'guides'),
  asyncHandler(guides.create),
);

/**
 * @openapi
 * /api/guides/{id}/publish:
 *   post: { tags: [Guides], summary: Publish a guide (requires guides.publish), responses: { 200: { description: Published } } }
 * /api/guides/{id}/unpublish:
 *   post: { tags: [Guides], summary: Unpublish a guide (requires guides.publish), responses: { 200: { description: Unpublished } } }
 * /api/guides/{id}/draft:
 *   post: { tags: [Guides], summary: Move a guide to draft (requires guides.publish), responses: { 200: { description: Draft } } }
 */
for (const action of ['publish', 'unpublish', 'draft'] as const) {
  contentRouter.post(
    `/guides/:id/${action}`,
    authenticate,
    requireCsrf,
    requirePermission('guides.publish'),
    auditLogger(`guides.${action}`, 'guides'),
    asyncHandler(guides[action]),
  );
}

/**
 * @openapi
 * /api/guides/{slug}:
 *   get:
 *     tags: [Guides]
 *     summary: Get a guide by slug (full content + product picks)
 *     parameters: [{ in: path, name: slug, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Guide }, 404: { description: Not found } }
 */
contentRouter.get('/guides/:slug', publicCatalogLimiter, optionalAuthenticate, asyncHandler(guides.getBySlug));

/**
 * @openapi
 * /api/guides/{id}:
 *   put:
 *     tags: [Guides]
 *     summary: Update a guide (requires guides.edit)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Updated }, 404: { description: Not found } }
 *   delete:
 *     tags: [Guides]
 *     summary: Delete a guide (requires guides.delete)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Deleted } }
 */
contentRouter.put(
  '/guides/:id',
  authenticate,
  requireCsrf,
  requirePermission('guides.edit'),
  validateBody(updateGuideSchema),
  auditLogger('guides.update', 'guides'),
  asyncHandler(guides.update),
);
contentRouter.delete(
  '/guides/:id',
  authenticate,
  requireCsrf,
  requirePermission('guides.delete'),
  auditLogger('guides.delete', 'guides'),
  asyncHandler(guides.remove),
);

// ───────────────────────── Comparisons ─────────────────────────

/**
 * @openapi
 * /api/comparisons:
 *   get:
 *     tags: [Comparisons]
 *     summary: List comparisons (paginated, sortable, searchable)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: perPage, schema: { type: integer, default: 12 } }
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [published, draft, all] } }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, oldest, title] } }
 *     responses: { 200: { description: Paginated comparison list } }
 *   post:
 *     tags: [Comparisons]
 *     summary: Create a comparison (requires comparisons.create)
 *     responses: { 201: { description: Created }, 403: { description: Missing comparisons.create } }
 */
contentRouter.get('/comparisons', publicCatalogLimiter, optionalAuthenticate, asyncHandler(comparisons.list));
contentRouter.post(
  '/comparisons',
  authenticate,
  requireCsrf,
  requirePermission('comparisons.create'),
  validateBody(createComparisonSchema),
  auditLogger('comparisons.create', 'comparisons'),
  asyncHandler(comparisons.create),
);

/**
 * @openapi
 * /api/comparisons/{id}/publish:
 *   post: { tags: [Comparisons], summary: Publish (requires comparisons.publish), responses: { 200: { description: Published } } }
 * /api/comparisons/{id}/unpublish:
 *   post: { tags: [Comparisons], summary: Unpublish (requires comparisons.publish), responses: { 200: { description: Unpublished } } }
 * /api/comparisons/{id}/draft:
 *   post: { tags: [Comparisons], summary: Move to draft (requires comparisons.publish), responses: { 200: { description: Draft } } }
 */
for (const action of ['publish', 'unpublish', 'draft'] as const) {
  contentRouter.post(
    `/comparisons/:id/${action}`,
    authenticate,
    requireCsrf,
    requirePermission('comparisons.publish'),
    auditLogger(`comparisons.${action}`, 'comparisons'),
    asyncHandler(comparisons[action]),
  );
}

/**
 * @openapi
 * /api/comparisons/{slug}:
 *   get:
 *     tags: [Comparisons]
 *     summary: Get a comparison by slug (products, specs matrix, verdict)
 *     parameters: [{ in: path, name: slug, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Comparison }, 404: { description: Not found } }
 */
contentRouter.get('/comparisons/:slug', publicCatalogLimiter, optionalAuthenticate, asyncHandler(comparisons.getBySlug));

/**
 * @openapi
 * /api/comparisons/{id}:
 *   put:
 *     tags: [Comparisons]
 *     summary: Update a comparison (requires comparisons.edit)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Updated }, 404: { description: Not found } }
 *   delete:
 *     tags: [Comparisons]
 *     summary: Delete a comparison (requires comparisons.delete)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Deleted } }
 */
contentRouter.put(
  '/comparisons/:id',
  authenticate,
  requireCsrf,
  requirePermission('comparisons.edit'),
  validateBody(updateComparisonSchema),
  auditLogger('comparisons.update', 'comparisons'),
  asyncHandler(comparisons.update),
);
contentRouter.delete(
  '/comparisons/:id',
  authenticate,
  requireCsrf,
  requirePermission('comparisons.delete'),
  auditLogger('comparisons.delete', 'comparisons'),
  asyncHandler(comparisons.remove),
);
