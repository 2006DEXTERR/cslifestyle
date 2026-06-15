import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import { categoryListQuerySchema } from '../../validation/catalog.schemas';
import { userHasPermission } from '../../middleware/optionalAuthenticate';
import * as svc from '../../services/catalog/category.service';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseQuery(categoryListQuerySchema, req.query);
  const canSeeInactive = userHasPermission(req, 'categories.view');
  const items = await svc.listCategories(query, canSeeInactive);
  res.json(ok(items));
}

export async function getBySlug(req: Request, res: Response): Promise<void> {
  const canSeeInactive = userHasPermission(req, 'categories.view');
  const category = await svc.getCategoryBySlug(req.params.slug, canSeeInactive);
  res.json(ok(category));
}

export async function create(req: Request, res: Response): Promise<void> {
  const category = await svc.createCategory(req.body);
  res.status(201).json(ok(category, null, 'Category created'));
}

export async function update(req: Request, res: Response): Promise<void> {
  const category = await svc.updateCategory(req.params.id, req.body);
  res.json(ok(category, null, 'Category updated'));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await svc.deleteCategory(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Category deleted'));
}
