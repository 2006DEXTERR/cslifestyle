import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import { authorListQuerySchema } from '../../validation/content.schemas';
import { userHasPermission } from '../../middleware/optionalAuthenticate';
import * as svc from '../../services/content/author.service';

export async function list(req: Request, res: Response): Promise<void> {
  const query = parseQuery(authorListQuerySchema, req.query);
  const canSeeInactive = userHasPermission(req, 'authors.view');
  const { items, pagination } = await svc.listAuthors(query, canSeeInactive);
  res.json(ok(items, { pagination }));
}

export async function getBySlug(req: Request, res: Response): Promise<void> {
  const canSeeInactive = userHasPermission(req, 'authors.view');
  const author = await svc.getAuthorBySlug(req.params.slug, canSeeInactive);
  res.json(ok(author));
}

export async function create(req: Request, res: Response): Promise<void> {
  const author = await svc.createAuthor(req.body);
  res.status(201).json(ok(author, null, 'Author created'));
}

export async function update(req: Request, res: Response): Promise<void> {
  const author = await svc.updateAuthor(req.params.id, req.body);
  res.json(ok(author, null, 'Author updated'));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await svc.deleteAuthor(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Author deleted'));
}
