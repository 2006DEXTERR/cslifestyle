import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import { comparisonListQuerySchema } from '../../validation/content.schemas';
import { userHasPermission } from '../../middleware/optionalAuthenticate';
import * as svc from '../../services/content/comparison.service';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseQuery(comparisonListQuerySchema, req.query);
  const canSeeUnpublished = userHasPermission(req, 'comparisons.view');
  const { items, pagination } = await svc.listComparisons(query, canSeeUnpublished);
  res.json(ok(items, { pagination }));
}

export async function getBySlug(req: Request, res: Response): Promise<void> {
  const canSeeUnpublished = userHasPermission(req, 'comparisons.view');
  const comparison = await svc.getComparisonBySlug(req.params.slug, canSeeUnpublished);
  res.json(ok(comparison));
}

export async function create(req: Request, res: Response): Promise<void> {
  const comparison = await svc.createComparison(req.body);
  res.status(201).json(ok(comparison, null, 'Comparison created'));
}

export async function update(req: Request, res: Response): Promise<void> {
  const comparison = await svc.updateComparison(req.params.id, req.body);
  res.json(ok(comparison, null, 'Comparison updated'));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await svc.deleteComparison(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Comparison deleted'));
}

export async function publish(req: Request, res: Response): Promise<void> {
  const comparison = await svc.setComparisonStatus(req.params.id, 'publish');
  res.json(ok(comparison, null, 'Comparison published'));
}

export async function unpublish(req: Request, res: Response): Promise<void> {
  const comparison = await svc.setComparisonStatus(req.params.id, 'unpublish');
  res.json(ok(comparison, null, 'Comparison unpublished'));
}

export async function draft(req: Request, res: Response): Promise<void> {
  const comparison = await svc.setComparisonStatus(req.params.id, 'draft');
  res.json(ok(comparison, null, 'Comparison moved to draft'));
}
