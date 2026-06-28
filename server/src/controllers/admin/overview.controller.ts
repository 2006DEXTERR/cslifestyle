import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import * as svc from '../../services/admin/overview.service';

/** Admin dashboard overview — live counts + recent activity + small series (admin.access). */
export async function getOverview(_req: Request, res: Response): Promise<void> {
  res.json(ok(await svc.getAdminOverview()));
}
