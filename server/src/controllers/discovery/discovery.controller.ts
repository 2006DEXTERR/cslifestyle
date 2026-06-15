import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import { getContext } from '../../lib/request-context';
import {
  advancedSearchQuerySchema,
  suggestionsQuerySchema,
  recommendProductsQuerySchema,
  recommendContentQuerySchema,
  pageQuerySchema,
  linksQuerySchema,
} from '../../validation/discovery.schemas';
import * as search from '../../services/discovery/search.service';
import * as recommend from '../../services/discovery/recommend.service';
import type { PresentedProduct } from '../../services/catalog/presenters';
import * as linking from '../../services/discovery/linking.service';
import * as synonym from '../../services/discovery/synonym.service';
import { rebuildIndex } from '../../services/discovery/index.service';

// ── Search (public) ──
export async function advanced(req: Request, res: Response): Promise<void> {
  const q = parseQuery(advancedSearchQuerySchema, req.query);
  res.json(ok(await search.advancedSearch({ q: q.q, types: q.types, limit: q.limit, page: q.page }, getContext(req).ipHash)));
}
export async function suggestions(req: Request, res: Response): Promise<void> {
  const q = parseQuery(suggestionsQuerySchema, req.query);
  res.json(ok(await search.searchSuggestions(q.q, q.limit)));
}
export async function trending(_req: Request, res: Response): Promise<void> {
  res.json(ok(await search.trendingTerms()));
}

// ── Recommendations (public reads) ──
export async function products(req: Request, res: Response): Promise<void> {
  const q = parseQuery(recommendProductsQuerySchema, req.query);
  let items: PresentedProduct[];
  switch (q.type) {
    case 'related': items = q.productId ? await recommend.relatedProducts(q.productId, q.limit) : await recommend.trendingProducts(q.limit); break;
    case 'similar': items = q.productId ? await recommend.similarProducts(q.productId, q.limit) : []; break;
    case 'category': items = q.categoryId ? await recommend.categoryRecommendations(q.categoryId, q.limit) : []; break;
    case 'brand': items = q.brandId ? await recommend.brandRecommendations(q.brandId, q.limit) : []; break;
    case 'price': items = await recommend.priceRangeRecommendations(q.minPrice ?? 0, q.maxPrice ?? Number.MAX_SAFE_INTEGER, q.limit); break;
    case 'trending': items = await recommend.trendingProducts(q.limit); break;
    default: items = [];
  }
  res.json(ok(items));
}
export async function content(req: Request, res: Response): Promise<void> {
  const q = parseQuery(recommendContentQuerySchema, req.query);
  const items = q.type === 'guide' ? await recommend.relatedGuides(q.id, q.limit) : await recommend.relatedComparisons(q.id, q.limit);
  res.json(ok(items));
}

// ── Synonyms (search.manage) ──
export async function listSynonyms(req: Request, res: Response): Promise<void> {
  const q = parseQuery(pageQuerySchema, req.query);
  const { items, pagination } = await synonym.listSynonyms(q);
  res.json(ok(items, { pagination }));
}
export async function createSynonym(req: Request, res: Response): Promise<void> {
  res.status(201).json(ok(await synonym.createSynonym(req.body), null, 'Synonym created'));
}
export async function updateSynonym(req: Request, res: Response): Promise<void> {
  res.json(ok(await synonym.updateSynonym(req.params.id, req.body), null, 'Synonym updated'));
}
export async function removeSynonym(req: Request, res: Response): Promise<void> {
  await synonym.deleteSynonym(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Synonym deleted'));
}
export async function reindex(_req: Request, res: Response): Promise<void> {
  res.json(ok(await rebuildIndex(), null, 'Search index rebuilt'));
}

// ── Recommendation rules (recommendations.view / manage) ──
export async function listRules(req: Request, res: Response): Promise<void> {
  const q = parseQuery(pageQuerySchema, req.query);
  const { items, pagination } = await recommend.listRules(q);
  res.json(ok(items, { pagination }));
}
export async function createRule(req: Request, res: Response): Promise<void> {
  res.status(201).json(ok(await recommend.createRule({ ...req.body, userId: req.user?.id ?? null }), null, 'Rule created'));
}
export async function updateRule(req: Request, res: Response): Promise<void> {
  res.json(ok(await recommend.updateRule(req.params.id, req.body), null, 'Rule updated'));
}
export async function removeRule(req: Request, res: Response): Promise<void> {
  await recommend.deleteRule(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Rule deleted'));
}

// ── Internal links (recommendations.view / manage) ──
export async function listLinks(req: Request, res: Response): Promise<void> {
  const q = parseQuery(linksQuerySchema, req.query);
  const { items, pagination } = await linking.listLinks(q);
  res.json(ok(items, { pagination }));
}
export async function generateLinks(req: Request, res: Response): Promise<void> {
  res.status(201).json(ok(await linking.generateSuggestions(req.body.sourceType, req.body.sourceId), null, 'Suggestions generated'));
}
export async function setLinkStatus(req: Request, res: Response): Promise<void> {
  res.json(ok(await linking.setLinkStatus(req.params.id, req.body.status), null, 'Link updated'));
}
export async function removeLink(req: Request, res: Response): Promise<void> {
  await linking.deleteLink(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Link deleted'));
}
export async function detectBroken(_req: Request, res: Response): Promise<void> {
  res.json(ok(await linking.detectBrokenLinks(), null, 'Scan complete'));
}
