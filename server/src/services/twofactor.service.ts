import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { ApiError } from '../lib/http';
import { encrypt, decrypt } from '../lib/crypto';
import { buildOtpAuthUri, generateTotpSecret, toQrDataUrl, verifyTotp } from '../lib/totp';
import { generateBackupCodes, hashBackupCode } from '../lib/backup-codes';
import { recordAudit } from '../lib/audit';
import type { RequestContext } from '../types/auth';

type DbUser = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;

async function getUser(userId: string): Promise<DbUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

/** Replace a user's backup codes; returns the plaintext codes (shown once). */
async function issueBackupCodes(userId: string): Promise<string[]> {
  const codes = generateBackupCodes(env.BACKUP_CODES_COUNT);
  await prisma.$transaction([
    prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
    prisma.twoFactorBackupCode.createMany({
      data: codes.map((c) => ({ userId, codeHash: hashBackupCode(c) })),
    }),
  ]);
  return codes;
}

export interface SetupResult {
  secret: string; // base32, for manual entry
  otpauthUri: string;
  qrDataUrl: string;
}

/** Step 1 of enrollment: generate + store (encrypted) a pending secret, return QR. */
export async function setupTwoFactor(userId: string): Promise<SetupResult> {
  const user = await getUser(userId);
  if (user.twoFactorEnabled) throw new ApiError(409, 'Two-factor authentication is already enabled');

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: encrypt(secret), twoFactorPending: true },
  });

  const otpauthUri = buildOtpAuthUri(user.email, secret);
  return { secret, otpauthUri, qrDataUrl: await toQrDataUrl(otpauthUri) };
}

/** Step 2 of enrollment: verify a code against the pending secret, then enable. */
export async function enableTwoFactor(
  userId: string,
  code: string,
  ctx: RequestContext,
): Promise<{ backupCodes: string[] }> {
  const user = await getUser(userId);
  if (user.twoFactorEnabled) throw new ApiError(409, 'Two-factor authentication is already enabled');
  if (!user.twoFactorSecret || !user.twoFactorPending) {
    throw new ApiError(400, 'Start 2FA setup before enabling');
  }
  if (!verifyTotp(code, decrypt(user.twoFactorSecret))) {
    throw new ApiError(400, 'Invalid authentication code');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true, twoFactorPending: false, twoFactorVerifiedAt: new Date() },
  });
  const backupCodes = await issueBackupCodes(userId);
  recordAudit({ userId, event: 'auth.2fa_enabled', module: 'auth', ...ctx });
  return { backupCodes };
}

/** Disable 2FA after verifying a current TOTP or an unused backup code. */
export async function disableTwoFactor(
  userId: string,
  code: string,
  ctx: RequestContext,
): Promise<void> {
  const user = await getUser(userId);
  if (!user.twoFactorEnabled) throw new ApiError(400, 'Two-factor authentication is not enabled');
  if (!(await consumeSecondFactor(user, code))) {
    throw new ApiError(400, 'Invalid authentication code');
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorPending: false, twoFactorSecret: null, twoFactorVerifiedAt: null },
    }),
    prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
  ]);
  recordAudit({ userId, event: 'auth.2fa_disabled', module: 'auth', ...ctx });
}

/** Regenerate backup codes (requires a current TOTP code). */
export async function regenerateBackupCodes(
  userId: string,
  code: string,
  ctx: RequestContext,
): Promise<{ backupCodes: string[] }> {
  const user = await getUser(userId);
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new ApiError(400, 'Two-factor authentication is not enabled');
  }
  if (!verifyTotp(code, decrypt(user.twoFactorSecret))) {
    throw new ApiError(400, 'Invalid authentication code');
  }
  const backupCodes = await issueBackupCodes(userId);
  recordAudit({ userId, event: 'auth.2fa_backup_regenerated', module: 'auth', ...ctx });
  return { backupCodes };
}

/**
 * Verify a second factor (TOTP first, then an unused backup code which is
 * consumed). Returns true on success. Used by login completion + disable.
 */
export async function consumeSecondFactor(user: DbUser, code: string): Promise<boolean> {
  if (user.twoFactorSecret && verifyTotp(code, decrypt(user.twoFactorSecret))) {
    return true;
  }
  const match = await prisma.twoFactorBackupCode.findFirst({
    where: { userId: user.id, codeHash: hashBackupCode(code), usedAt: null },
  });
  if (match) {
    await prisma.twoFactorBackupCode.update({ where: { id: match.id }, data: { usedAt: new Date() } });
    return true;
  }
  return false;
}

/** Count of unused backup codes (for status display). */
export function countUnusedBackupCodes(userId: string): Promise<number> {
  return prisma.twoFactorBackupCode.count({ where: { userId, usedAt: null } });
}

export interface TwoFactorStatus {
  enabled: boolean;
  pending: boolean;
  backupCodesRemaining: number;
}

/** Current 2FA state for a user. */
export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatus> {
  const user = await getUser(userId);
  return {
    enabled: user.twoFactorEnabled,
    pending: user.twoFactorPending,
    backupCodesRemaining: await countUnusedBackupCodes(userId),
  };
}
