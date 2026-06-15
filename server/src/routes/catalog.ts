import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { authenticate } from '../middleware/authenticate';
import { optionalAuthenticate } from '../middleware/optionalAuthenticate';
import { requirePermission } from '../middleware/authorize';
import { requireCsrf } from '../middleware/csrf';
import { validateBody } from '../middleware/validate';
import { auditLogger } from '../middleware/audit';
import { publicCatalogLimiter, searchLimiter } from '../middleware/rateLimit';
import {
  createProductSchema,
  updateProductSchema,
  bulkProductSchema,
  createCategorySchema,
  updateCategorySchema,
  createBrandSchema,
  updateBrandSchema,
} from '../validation/catalog.schemas';
import * as products from '../controllers/catalog/product.controller';
import * as categories from '../controllers/catalog/category.controller';
import * as brands from '../controllers/catalog/brand.controller';
import * as search from '../controllers/catalog/search.controller';

/**
 * Catalog router — mounted at `/api` (unversioned, per the Phase 2 specification's
 * explicit endpoint contract: /api/products, /api/categories, /api/brands,
 * /api/search). Public reads use `optionalAuthenticate` so privileged users can
 * additionally see drafts/inactive rows; writes require JWT + RBAC + CSRF + audit.
 * See ADR-019.
 */
export const catalogRouter = Router();

// ───────────────────────── Products ─────────────────────────

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: List products (paginated, filterable, sortable, searchable)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: perPage, schema: { type: integer, default: 12, maximum: 100 } }
 *       - { in: query, name: sort, schema: { type: string, enum: [popularity, price-low, price-high, rating, newest] } }
 *       - { in: query, name: category, schema: { type: string }, description: category slug or id }
 *       - { in: query, name: brand, schema: { type: string }, description: brand slug or id }
 *       - { in: query, name: minPrice, schema: { type: number } }
 *       - { in: query, name: maxPrice, schema: { type: number } }
 *       - { in: query, name: minRating, schema: { type: number } }
 *       - { in: query, name: q, schema: { type: string }, description: free-text title/description match }
 *       - { in: query, name: trending, schema: { type: boolean } }
 *       - { in: query, name: deals, schema: { type: boolean } }
 *       - { in: query, name: status, schema: { type: string, enum: [published, all, draft] }, description: non-published requires products.view }
 *     responses:
 *       200: { description: Paginated product list }
 *   post:
 *     tags: [Products]
 *     summary: Create a product
 *     description: Requires the products.create permission.
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [asin, title, categoryId] } } }
 *     responses:
 *       201: { description: Created }
 *       401: { description: Not authenticated }
 *       403: { description: Missing products.create }
 *       409: { description: Duplicate ASIN }
 */
catalogRouter.get('/products', publicCatalogLimiter, optionalAuthenticate, asyncHandler(products.list));
catalogRouter.post(
  '/products',
  authenticate,
  requireCsrf,
  requirePermission('products.create'),
  validateBody(createProductSchema),
  auditLogger('products.create', 'products'),
  asyncHandler(products.create),
);

/**
 * @openapi
 * /api/products/bulk:
 *   post:
 *     tags: [Products]
 *     summary: Bulk publish / unpublish / delete products
 *     description: publish/unpublish require products.publish; delete requires products.delete.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, ids]
 *             properties:
 *               action: { type: string, enum: [publish, unpublish, delete] }
 *               ids: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Bulk action applied }
 *       403: { description: Missing permission }
 */
catalogRouter.post(
  '/products/bulk',
  authenticate,
  requireCsrf,
  requirePermission('products.publish'),
  validateBody(bulkProductSchema),
  auditLogger('products.bulk', 'products'),
  asyncHandler(products.bulk),
);

/**
 * @openapi
 * /api/products/{slug}:
 *   get:
 *     tags: [Products]
 *     summary: Get a product by slug
 *     parameters:
 *       - { in: path, name: slug, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Product }
 *       404: { description: Not found }
 */
catalogRouter.get('/products/:slug', publicCatalogLimiter, optionalAuthenticate, asyncHandler(products.getBySlug));

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update a product (requires products.edit)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Updated }
 *       403: { description: Missing products.edit }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product (requires products.delete)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Deleted }
 *       403: { description: Missing products.delete }
 *       404: { description: Not found }
 */
catalogRouter.put(
  '/products/:id',
  authenticate,
  requireCsrf,
  requirePermission('products.edit'),
  validateBody(updateProductSchema),
  auditLogger('products.update', 'products'),
  asyncHandler(products.update),
);
catalogRouter.delete(
  '/products/:id',
  authenticate,
  requireCsrf,
  requirePermission('products.delete'),
  auditLogger('products.delete', 'products'),
  asyncHandler(products.remove),
);

// ───────────────────────── Categories ─────────────────────────

/**
 * @openapi
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: List categories
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [active, all] } }
 *       - { in: query, name: parent, schema: { type: string, enum: [root, all] }, description: root = top-level only }
 *       - { in: query, name: q, schema: { type: string } }
 *     responses:
 *       200: { description: Category list }
 *   post:
 *     tags: [Categories]
 *     summary: Create a category (requires categories.create)
 *     responses:
 *       201: { description: Created }
 *       403: { description: Missing categories.create }
 */
catalogRouter.get('/categories', publicCatalogLimiter, optionalAuthenticate, asyncHandler(categories.list));
catalogRouter.post(
  '/categories',
  authenticate,
  requireCsrf,
  requirePermission('categories.create'),
  validateBody(createCategorySchema),
  auditLogger('categories.create', 'categories'),
  asyncHandler(categories.create),
);

/**
 * @openapi
 * /api/categories/{slug}:
 *   get:
 *     tags: [Categories]
 *     summary: Get a category by slug
 *     parameters: [{ in: path, name: slug, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Category }
 *       404: { description: Not found }
 */
catalogRouter.get('/categories/:slug', publicCatalogLimiter, optionalAuthenticate, asyncHandler(categories.getBySlug));

/**
 * @openapi
 * /api/categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update a category (requires categories.edit)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category (requires categories.delete; blocked if it has products/children)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Deleted }
 *       409: { description: Has products or sub-categories }
 */
catalogRouter.put(
  '/categories/:id',
  authenticate,
  requireCsrf,
  requirePermission('categories.edit'),
  validateBody(updateCategorySchema),
  auditLogger('categories.update', 'categories'),
  asyncHandler(categories.update),
);
catalogRouter.delete(
  '/categories/:id',
  authenticate,
  requireCsrf,
  requirePermission('categories.delete'),
  auditLogger('categories.delete', 'categories'),
  asyncHandler(categories.remove),
);

// ───────────────────────── Brands ─────────────────────────

/**
 * @openapi
 * /api/brands:
 *   get:
 *     tags: [Brands]
 *     summary: List brands
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [active, all] } }
 *       - { in: query, name: q, schema: { type: string } }
 *     responses:
 *       200: { description: Brand list }
 *   post:
 *     tags: [Brands]
 *     summary: Create a brand (requires brands.create)
 *     responses:
 *       201: { description: Created }
 *       403: { description: Missing brands.create }
 */
catalogRouter.get('/brands', publicCatalogLimiter, optionalAuthenticate, asyncHandler(brands.list));
catalogRouter.post(
  '/brands',
  authenticate,
  requireCsrf,
  requirePermission('brands.create'),
  validateBody(createBrandSchema),
  auditLogger('brands.create', 'brands'),
  asyncHandler(brands.create),
);

/**
 * @openapi
 * /api/brands/{slug}:
 *   get:
 *     tags: [Brands]
 *     summary: Get a brand by slug
 *     parameters: [{ in: path, name: slug, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Brand }
 *       404: { description: Not found }
 */
catalogRouter.get('/brands/:slug', publicCatalogLimiter, optionalAuthenticate, asyncHandler(brands.getBySlug));

/**
 * @openapi
 * /api/brands/{id}:
 *   put:
 *     tags: [Brands]
 *     summary: Update a brand (requires brands.edit)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Brands]
 *     summary: Delete a brand (requires brands.delete; products are kept, brand unlinked)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Deleted }
 */
catalogRouter.put(
  '/brands/:id',
  authenticate,
  requireCsrf,
  requirePermission('brands.edit'),
  validateBody(updateBrandSchema),
  auditLogger('brands.update', 'brands'),
  asyncHandler(brands.update),
);
catalogRouter.delete(
  '/brands/:id',
  authenticate,
  requireCsrf,
  requirePermission('brands.delete'),
  auditLogger('brands.delete', 'brands'),
  asyncHandler(brands.remove),
);

// ───────────────────────── Search ─────────────────────────

/**
 * @openapi
 * /api/search:
 *   get:
 *     tags: [Search]
 *     summary: Search the catalog (products, categories, brands) — logged
 *     parameters:
 *       - { in: query, name: q, required: true, schema: { type: string } }
 *       - { in: query, name: type, schema: { type: string, enum: [all, products, categories, brands] } }
 *       - { in: query, name: limit, schema: { type: integer, default: 8, maximum: 50 } }
 *     responses:
 *       200: { description: Grouped search results }
 *       400: { description: Missing query term }
 */
catalogRouter.get('/search', searchLimiter, asyncHandler(search.search));
