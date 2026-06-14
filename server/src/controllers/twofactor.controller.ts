import type { Request, Response } from 'express';
import { ok } from '../lib/http';
import { getContext } from '../lib/request-context';
import * as twoFactor from '../services/twofactor.service';

/** GET /api/auth/2fa/status — current user's 2FA state. */
export async function status(req: Request, res: Response): Promise<void> {
  res.json(ok(await twoFactor.getTwoFactorStatus(req.user!.id)));
}

/** POST /api/auth/2fa/setup — generate a pending secret + QR. */
export async function setup(req: Request, res: Response): Promise<void> {
  const result = await twoFactor.setupTwoFactor(req.user!.id);
  res.json(ok(result));
}

/** POST /api/auth/2fa/enable — verify a code and enable 2FA; returns backup codes. */
export async function enable(req: Request, res: Response): Promise<void> {
  const { backupCodes } = await twoFactor.enableTwoFactor(req.user!.id, req.body.code, getContext(req));
  res.json(ok({ enabled: true, backupCodes }));
}

/** POST /api/auth/2fa/disable — verify a code and disable 2FA. */
export async function disable(req: Request, res: Response): Promise<void> {
  await twoFactor.disableTwoFactor(req.user!.id, req.body.code, getContext(req));
  res.json(ok({ enabled: false }));
}

/** POST /api/auth/2fa/backup-codes — regenerate backup codes. */
export async function regenerateBackupCodes(req: Request, res: Response): Promise<void> {
  const { backupCodes } = await twoFactor.regenerateBackupCodes(req.user!.id, req.body.code, getContext(req));
  res.json(ok({ backupCodes }));
}
