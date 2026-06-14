import { z } from 'zod';

/** A TOTP code (6 digits) or a backup code (XXXXX-XXXXX). */
const code = z.string().trim().min(6, 'Enter your authentication or backup code').max(20);

export const twoFactorCodeSchema = z.object({ code });

export const loginTwoFactorSchema = z.object({
  challenge: z.string().min(1, 'Missing challenge'),
  code,
});

export const twoFactorPolicySchema = z.object({
  roles: z.array(z.string().min(1)).max(20),
});
