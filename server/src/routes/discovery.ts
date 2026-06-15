import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/authorize';
import { requireCsrf } from '../middleware/csrf';
import { validateBody } from '../middleware/validate';
import { auditLogger } from '../middleware/audit';
import { searchLimiter, publicCatalogLimiter } from '../middleware/rateLimit';
import {
  createSynonymSchema,
  updateSynonymSchema,
  createRuleSchema,
  updateRuleSchema,
  generateLinksSchema,
  linkStatusSchema,
} from '../validation/discovery.schemas';
import * as ctrl from '../controllers/discovery/discovery.controller';

/**
 * Discovery API (Phase 11): advanced search, recommendations, internal linking. Mounted
 * at `/api`. Search + product/content recommendations are **public** (storefront + SSR).
 * Synonyms/reindex need `search.manage`; rules + internal-link management need
 * `recommendations.manage` (read with `recommendations.view`). All writes: JWT + CSRF + audit.
 */
export const discoveryRouter = Router();

/**
 * @openapi
 * /api/search/advanced:
 *   get:
 *     tags: [Search]
 *     summary: Advanced search — weighted, fuzzy, synonym-expanded, across all entities (public)
 *     parameters:
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: types, schema: { type: string }, description: "CSV: product,category,brand,guide,comparison,author" }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses: { 200: { description: Grouped hits + suggestions + didYouMean } }
 * /api/search/suggestions:
 *   get: { tags: [Search], summary: Autocomplete suggestions (public), parameters: [{ in: query, name: q, schema: { type: string } }], responses: { 200: { description: Suggestions } } }
 * /api/search/trending:
 *   get: { tags: [Search], summary: Trending search terms (public), responses: { 200: { description: Terms } } }
 */
discoveryRouter.get('/search/advanced', searchLimiter, asyncHandler(ctrl.advanced));
discoveryRouter.get('/search/suggestions', searchLimiter, asyncHandler(ctrl.suggestions));
discoveryRouter.get('/search/trending', publicCatalogLimiter, asyncHandler(ctrl.trending));

/**
 * @openapi
 * /api/recommendations/products:
 *   get:
 *     tags: [Recommendations]
 *     summary: Product recommendations — related/similar/category/brand/price/trending (public)
 *     parameters:
 *       - { in: query, name: type, schema: { type: string, enum: [related, similar, category, brand, price, trending] } }
 *       - { in: query, name: productId, schema: { type: string } }
 *       - { in: query, name: categoryId, schema: { type: string } }
 *       - { in: query, name: brandId, schema: { type: string } }
 *     responses: { 200: { description: Products } }
 * /api/recommendations/content:
 *   get: { tags: [Recommendations], summary: Related guides/comparisons (public), parameters: [{ in: query, name: type, schema: { type: string, enum: [guide, comparison] } }, { in: query, name: id, schema: { type: string } }], responses: { 200: { description: Content } } }
 */
discoveryRouter.get('/recommendations/products', publicCatalogLimiter, asyncHandler(ctrl.products));
discoveryRouter.get('/recommendations/content', publicCatalogLimiter, asyncHandler(ctrl.content));

// ── Admin: synonyms + reindex (search.manage) ──
const searchManage = [authenticate, requirePermission('search.manage')] as const;
discoveryRouter.get('/search/synonyms', ...searchManage, asyncHandler(ctrl.listSynonyms));
discoveryRouter.post('/search/synonyms', authenticate, requireCsrf, requirePermission('search.manage'), validateBody(createSynonymSchema), auditLogger('search.synonym_created', 'search'), asyncHandler(ctrl.createSynonym));
discoveryRouter.patch('/search/synonyms/:id', authenticate, requireCsrf, requirePermission('search.manage'), validateBody(updateSynonymSchema), auditLogger('search.synonym_updated', 'search'), asyncHandler(ctrl.updateSynonym));
discoveryRouter.delete('/search/synonyms/:id', authenticate, requireCsrf, requirePermission('search.manage'), auditLogger('search.synonym_deleted', 'search'), asyncHandler(ctrl.removeSynonym));
discoveryRouter.post('/search/reindex', authenticate, requireCsrf, requirePermission('search.manage'), auditLogger('search.reindex', 'search'), asyncHandler(ctrl.reindex));

// ── Admin: recommendation rules (recommendations.view / manage) ──
/**
 * @openapi
 * /api/recommendations/rules:
 *   get: { tags: [Recommendations], summary: List recommendation rules (recommendations.view), responses: { 200: { description: Rules } } }
 *   post: { tags: [Recommendations], summary: Create a recommendation rule (recommendations.manage), responses: { 201: { description: Created } } }
 */
discoveryRouter.get('/recommendations/rules', authenticate, requirePermission('recommendations.view'), asyncHandler(ctrl.listRules));
discoveryRouter.post('/recommendations/rules', authenticate, requireCsrf, requirePermission('recommendations.manage'), validateBody(createRuleSchema), auditLogger('recommendations.rule_created', 'recommendations'), asyncHandler(ctrl.createRule));
discoveryRouter.patch('/recommendations/rules/:id', authenticate, requireCsrf, requirePermission('recommendations.manage'), validateBody(updateRuleSchema), auditLogger('recommendations.rule_updated', 'recommendations'), asyncHandler(ctrl.updateRule));
discoveryRouter.delete('/recommendations/rules/:id', authenticate, requireCsrf, requirePermission('recommendations.manage'), auditLogger('recommendations.rule_deleted', 'recommendations'), asyncHandler(ctrl.removeRule));

// ── Admin: internal links (recommendations.view / manage) ──
/**
 * @openapi
 * /api/recommendations/internal-links:
 *   get: { tags: [Recommendations], summary: List internal-link suggestions (recommendations.view), responses: { 200: { description: Links } } }
 * /api/recommendations/internal-links/generate:
 *   post: { tags: [Recommendations], summary: Generate suggestions for a guide/comparison (recommendations.manage), responses: { 201: { description: Generated } } }
 * /api/recommendations/internal-links/detect-broken:
 *   post: { tags: [Recommendations], summary: Detect broken internal links in content (recommendations.manage), responses: { 200: { description: Findings } } }
 */
discoveryRouter.get('/recommendations/internal-links', authenticate, requirePermission('recommendations.view'), asyncHandler(ctrl.listLinks));
discoveryRouter.post('/recommendations/internal-links/generate', authenticate, requireCsrf, requirePermission('recommendations.manage'), validateBody(generateLinksSchema), auditLogger('recommendations.links_generated', 'recommendations'), asyncHandler(ctrl.generateLinks));
discoveryRouter.post('/recommendations/internal-links/detect-broken', authenticate, requireCsrf, requirePermission('recommendations.manage'), auditLogger('recommendations.broken_scan', 'recommendations'), asyncHandler(ctrl.detectBroken));
discoveryRouter.patch('/recommendations/internal-links/:id', authenticate, requireCsrf, requirePermission('recommendations.manage'), validateBody(linkStatusSchema), auditLogger('recommendations.link_updated', 'recommendations'), asyncHandler(ctrl.setLinkStatus));
discoveryRouter.delete('/recommendations/internal-links/:id', authenticate, requireCsrf, requirePermission('recommendations.manage'), auditLogger('recommendations.link_deleted', 'recommendations'), asyncHandler(ctrl.removeLink));
