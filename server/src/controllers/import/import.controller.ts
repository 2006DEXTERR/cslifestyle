import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import { jobsQuerySchema } from '../../validation/import.schemas';
import * as svc from '../../services/import/import.service';

// ── Job creation ──
export async function createCsv(req: Request, res: Response): Promise<void> {
  const job = await svc.createCsvJob({ ...req.body, userId: req.user?.id ?? null });
  res.status(201).json(ok(job, null, 'CSV import started'));
}
export async function createAsins(req: Request, res: Response): Promise<void> {
  const job = await svc.createAsinJob({ ...req.body, userId: req.user?.id ?? null });
  res.status(201).json(ok(job, null, 'ASIN import started'));
}
export async function createCategories(req: Request, res: Response): Promise<void> {
  const job = await svc.createCategoryJob({ ...req.body, userId: req.user?.id ?? null });
  res.status(201).json(ok(job, null, 'Category import started'));
}

// ── Queries ──
export async function listJobs(req: Request, res: Response): Promise<void> {
  const q = parseQuery(jobsQuerySchema, req.query);
  const { items, pagination } = await svc.listJobs(q);
  res.json(ok(items, { pagination }));
}
export async function getJob(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getJob(req.params.id)));
}
export async function getReport(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getReport(req.params.id)));
}
export async function getStats(_req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getStats()));
}

// ── Job control ──
export async function retry(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.retryJob(req.params.id), null, 'Import retried'));
}
export async function cancel(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.cancelJob(req.params.id), null, 'Import cancelled'));
}

// ── Templates ──
export async function listTemplates(_req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.listTemplates()));
}
export async function createTemplate(req: Request, res: Response): Promise<void> {
  res.status(201).json(ok(await svc.createTemplate({ ...req.body, userId: req.user?.id ?? null }), null, 'Template created'));
}
export async function removeTemplate(req: Request, res: Response): Promise<void> {
  await svc.deleteTemplate(req.params.id);
  res.json(ok({ id: req.params.id }, null, 'Template deleted'));
}
