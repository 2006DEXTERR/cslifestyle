import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import { guideListQuerySchema } from '../../validation/content.schemas';
import { userHasPermission } from '../../middleware/optionalAuthenticate';
import * as svc from '../../services/content/guide.service';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseQuery(guideListQuerySchema, req.query);
  const canSeeUnpublished = userHasPermission(req, 'guides.view');
  const { items, pagination } = await svc.listGuides(query, canSeeUnpublished);
  res.json(ok(items, { pagination }));
}

export async function getBySlug(req: Request, res: Response): Promise<void> {
  const canSeeUnpublished = userHasPermission(req, 'guides.view');
  const guide = await svc.getGuideBySlug(req.params.slug, canSeeUnpublished);
  res.json(ok(guide));
}

export async function create(req: Request, res: Response): Promise<void> {
  const guide = await svc.createGuide(req.body);
  res.status(201).json(ok(guide, null, 'Guide created'));
}

export async function update(req: Request, res: Response): Promise<void> {
  const guide = await svc.updateGuide(req.params.id, req.body);
  res.json(ok(guide, null, 'Guide updated'));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await svc.deleteGuide(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Guide deleted'));
}

export async function publish(req: Request, res: Response): Promise<void> {
  const guide = await svc.setGuideStatus(req.params.id, 'publish');
  res.json(ok(guide, null, 'Guide published'));
}

export async function unpublish(req: Request, res: Response): Promise<void> {
  const guide = await svc.setGuideStatus(req.params.id, 'unpublish');
  res.json(ok(guide, null, 'Guide unpublished'));
}

export async function draft(req: Request, res: Response): Promise<void> {
  const guide = await svc.setGuideStatus(req.params.id, 'draft');
  res.json(ok(guide, null, 'Guide moved to draft'));
}
