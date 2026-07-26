import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import * as svc from '../../services/import/paapi-wizard.service';

/**
 * Amazon PA-API Import Wizard (direct/synchronous). The request resolves PA-API in memory
 * and hands the products to the existing importer; there is no queue and no status polling.
 */
export async function startPaapiWizard(req: Request, res: Response): Promise<void> {
  const result = await svc.runPaapiWizard(req.body as svc.PaapiWizardInput, req.user?.id ?? null);
  res
    .status(result.dryRun ? 200 : 201)
    .json(ok(result, null, result.dryRun ? 'Preview ready' : 'Import created'));
}
