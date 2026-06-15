import type { Request, Response } from 'express';
import { ok, ApiError } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import { queueQuerySchema, logsQuerySchema } from '../../validation/ai.schemas';
import { isPromptTemplateType, getAllPrompts, getPrompt, setPrompt } from '../../services/ai/prompts';
import * as svc from '../../services/ai/ai.service';

// ── Queue ──
export async function listQueue(req: Request, res: Response): Promise<void> {
  const q = parseQuery(queueQuerySchema, req.query);
  const { items, pagination } = await svc.listQueue(q);
  res.json(ok(items, { pagination }));
}
export async function getJob(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getJob(req.params.id)));
}

// ── Generate ──
export async function generate(req: Request, res: Response): Promise<void> {
  const jobs = await svc.enqueueJobs({
    entityType: req.body.entityType,
    entityId: req.body.entityId,
    jobTypes: req.body.jobTypes,
    priority: req.body.priority,
  });
  res.status(201).json(ok(jobs, null, 'AI generation queued'));
}
export async function bulkGenerate(req: Request, res: Response): Promise<void> {
  const result = await svc.bulkGenerate(req.body);
  res.status(201).json(ok(result, null, 'Bulk AI generation queued'));
}

// ── Job control ──
export async function retry(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.retryJob(req.params.id), null, 'AI job retried'));
}
export async function retryAllFailed(_req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.retryAllFailed(), null, 'Failed AI jobs retried'));
}
export async function approve(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.approveJob(req.params.id), null, 'AI content approved'));
}

// ── Logs / stats / providers / usage ──
export async function listLogs(req: Request, res: Response): Promise<void> {
  const q = parseQuery(logsQuerySchema, req.query);
  const { items, pagination } = await svc.listLogs(q);
  res.json(ok(items, { pagination }));
}
export async function getStats(_req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getStats()));
}
export async function getProviders(_req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getProvidersWithUsage()));
}
export async function getUsage(_req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getUsage()));
}

// ── Prompts (FR-054) ──
export async function listPrompts(_req: Request, res: Response): Promise<void> {
  res.json(ok(await getAllPrompts()));
}
export async function updatePrompt(req: Request, res: Response): Promise<void> {
  const { type } = req.params;
  if (!isPromptTemplateType(type)) throw ApiError.badRequest(`Unknown prompt type "${type}"`);
  await setPrompt(type, req.body.template);
  res.json(ok({ type, template: await getPrompt(type) }, null, 'Prompt template saved'));
}
