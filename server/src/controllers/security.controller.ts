import type { Request, Response } from 'express';
import { ok } from '../lib/http';
import { recordAudit } from '../lib/audit';
import { getContext } from '../lib/request-context';
import { getEnforced2faRoles, setEnforced2faRoles } from '../services/settings.service';

/** GET /api/v1/admin/security/2fa-policy — roles required to use 2FA. */
export async function getTwoFactorPolicy(_req: Request, res: Response): Promise<void> {
  res.json(ok({ enforcedRoles: await getEnforced2faRoles() }));
}

/** PUT /api/v1/admin/security/2fa-policy — set the enforced roles (admin option). */
export async function updateTwoFactorPolicy(req: Request, res: Response): Promise<void> {
  const enforcedRoles = await setEnforced2faRoles(req.body.roles);
  recordAudit({
    userId: req.user?.id ?? null,
    event: 'security.2fa_policy_updated',
    module: 'security',
    metadata: { enforcedRoles },
    ...getContext(req),
  });
  res.json(ok({ enforcedRoles }));
}
