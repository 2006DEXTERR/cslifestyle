import type { Request, Response } from 'express';
import { ok, ApiError } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import { mediaListQuerySchema, mediaSearchQuerySchema } from '../../validation/media.schemas';
import * as svc from '../../services/media/media.service';

// ── Upload (media.upload) ──
export async function upload(req: Request, res: Response): Promise<void> {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw ApiError.badRequest('No files uploaded (field "files")');
  const folderId = typeof req.body.folderId === 'string' && req.body.folderId ? req.body.folderId : null;
  const altText = typeof req.body.altText === 'string' ? req.body.altText : undefined;
  const results = [];
  for (const f of files) {
    results.push(
      await svc.uploadAsset({
        buffer: f.buffer,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        folderId,
        altText,
        userId: req.user?.id ?? null,
      }),
    );
  }
  res.status(201).json(ok({ uploaded: results.map((r) => r.asset), duplicates: results.filter((r) => r.duplicate).length }, null, 'Upload complete'));
}

export async function replace(req: Request, res: Response): Promise<void> {
  const f = req.file as Express.Multer.File | undefined;
  if (!f) throw ApiError.badRequest('No file uploaded (field "file")');
  res.json(ok(await svc.replaceAsset(req.params.id, { buffer: f.buffer, originalName: f.originalname, mimeType: f.mimetype, size: f.size }), null, 'Asset replaced'));
}

// ── Browse / search (media.view) ──
export async function list(req: Request, res: Response): Promise<void> {
  const q = parseQuery(mediaListQuerySchema, req.query);
  const { items, pagination } = await svc.listAssets(q);
  res.json(ok(items, { pagination }));
}
export async function search(req: Request, res: Response): Promise<void> {
  const q = parseQuery(mediaSearchQuerySchema, req.query);
  const { items, pagination } = await svc.listAssets({ page: q.page, perPage: q.perPage, search: q.q, mimeType: q.mimeType });
  res.json(ok(items, { pagination }));
}
export async function unused(req: Request, res: Response): Promise<void> {
  const q = parseQuery(mediaListQuerySchema, req.query);
  const { items, pagination } = await svc.listUnused({ page: q.page, perPage: q.perPage });
  res.json(ok(items, { pagination }));
}
export async function stats(_req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getStats()));
}
export async function get(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getAsset(req.params.id)));
}
export async function usage(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.listUsage(req.params.id)));
}

// ── Manage (media.manage) ──
export async function update(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.updateAsset(req.params.id, req.body), null, 'Asset updated'));
}
export async function remove(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.deleteAsset(req.params.id), null, 'Asset deleted'));
}
export async function attachUsage(req: Request, res: Response): Promise<void> {
  res.status(201).json(ok(await svc.attachUsage(req.params.id, req.body.entityType, req.body.entityId, req.body.field), null, 'Usage linked'));
}
export async function detachUsage(req: Request, res: Response): Promise<void> {
  await svc.detachUsage(req.params.id, req.body.entityType, req.body.entityId, req.body.field);
  res.json(ok({ id: req.params.id }, null, 'Usage unlinked'));
}

// ── Folders ──
export async function listFolders(_req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.listFolders()));
}
export async function createFolder(req: Request, res: Response): Promise<void> {
  res.status(201).json(ok(await svc.createFolder(req.body), null, 'Folder created'));
}
export async function removeFolder(req: Request, res: Response): Promise<void> {
  await svc.deleteFolder(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Folder deleted'));
}
