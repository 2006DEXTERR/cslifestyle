import type { Request, Response } from 'express';
import { ok, ApiError } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import { productListQuerySchema } from '../../validation/catalog.schemas';
import { userHasPermission } from '../../middleware/optionalAuthenticate';
import * as svc from '../../services/catalog/product.service';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseQuery(productListQuerySchema, req.query);
  const canSeeUnpublished = userHasPermission(req, 'products.view');
  const { items, pagination } = await svc.listProducts(query, canSeeUnpublished);
  res.json(ok(items, { pagination }));
}

export async function getBySlug(req: Request, res: Response): Promise<void> {
  const canSeeUnpublished = userHasPermission(req, 'products.view');
  const product = await svc.getProductBySlug(req.params.slug, canSeeUnpublished);
  res.json(ok(product));
}

export async function create(req: Request, res: Response): Promise<void> {
  const product = await svc.createProduct(req.body);
  res.status(201).json(ok(product, null, 'Product created'));
}

export async function update(req: Request, res: Response): Promise<void> {
  const product = await svc.updateProduct(req.params.id, req.body);
  res.json(ok(product, null, 'Product updated'));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await svc.deleteProduct(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Product deleted'));
}

export async function bulk(req: Request, res: Response): Promise<void> {
  const { action, ids } = req.body as { action: 'publish' | 'unpublish' | 'delete'; ids: string[] };
  // Route gate is products.publish; deleting additionally requires products.delete.
  if (action === 'delete' && !userHasPermission(req, 'products.delete')) {
    throw ApiError.forbidden('You do not have permission to delete products');
  }
  const result = await svc.bulkProducts(action, ids);
  res.json(ok(result, null, `Bulk ${action} applied to ${result.affected} product(s)`));
}
