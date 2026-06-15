import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import { brandListQuerySchema } from '../../validation/catalog.schemas';
import { userHasPermission } from '../../middleware/optionalAuthenticate';
import * as svc from '../../services/catalog/brand.service';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseQuery(brandListQuerySchema, req.query);
  const canSeeInactive = userHasPermission(req, 'brands.view');
  const items = await svc.listBrands(query, canSeeInactive);
  res.json(ok(items));
}

export async function getBySlug(req: Request, res: Response): Promise<void> {
  const canSeeInactive = userHasPermission(req, 'brands.view');
  const brand = await svc.getBrandBySlug(req.params.slug, canSeeInactive);
  res.json(ok(brand));
}

export async function create(req: Request, res: Response): Promise<void> {
  const brand = await svc.createBrand(req.body);
  res.status(201).json(ok(brand, null, 'Brand created'));
}

export async function update(req: Request, res: Response): Promise<void> {
  const brand = await svc.updateBrand(req.params.id, req.body);
  res.json(ok(brand, null, 'Brand updated'));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await svc.deleteBrand(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Brand deleted'));
}
