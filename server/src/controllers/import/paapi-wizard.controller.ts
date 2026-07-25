import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import * as svc from '../../services/import/paapi-wizard.service';

/**
 * Amazon PA-API Import Wizard (additive). The request only validates + enqueues a
 * background resolution job; PA-API is never called in-request. Status is read back from
 * the BullMQ job so the admin can preview (dry run) or follow the created import.
 */

/** Enqueue a wizard run (or dry-run preview). Returns the resolution job id. */
export async function startPaapiWizard(req: Request, res: Response): Promise<void> {
  const result = await svc.submitPaapiWizard(req.body as svc.PaapiWizardInput, req.user?.id ?? null);
  res.status(202).json(ok(result, null, result.dryRun ? 'Preview started' : 'Import queued'));
}

/** Live state of a wizard resolution job (waiting/active/completed/failed + result). */
export async function getPaapiWizardStatus(req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getPaapiWizardStatus(req.params.id)));
}
