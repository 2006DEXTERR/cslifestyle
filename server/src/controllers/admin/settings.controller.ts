import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import * as svc from '../../services/admin/settings-admin.service';

export async function getSettings(_req: Request, res: Response): Promise<void> {
  const result = await svc.listSettings();
  res.json(ok(result));
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const result = await svc.saveSettings(req.body);
  res.json(ok(result, null, 'Settings saved'));
}

export async function getSitemapStatus(_req: Request, res: Response): Promise<void> {
  const status = await svc.getSitemapStatus();
  res.json(ok(status));
}
