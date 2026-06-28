import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import * as svc from '../../services/import/api-import.service';

// ── Import through API (PA-API) ──

/** Provider readiness (no secret values). */
export async function getApiConfig(_req: Request, res: Response): Promise<void> {
  res.json(ok(svc.getApiImportConfig()));
}

/** Start an API import → review CSV. Rejects clearly when credentials are missing. */
export async function startApiImport(_req: Request, res: Response): Promise<void> {
  const result = await svc.startApiImport();
  res.status(202).json(ok(result, null, result.message));
}

/** Recent import history (existing import jobs). */
export async function getApiHistory(_req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getApiImportHistory()));
}
