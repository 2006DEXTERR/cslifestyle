import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { ApiError } from '../lib/http';
import { hashPassword, verifyPassword } from '../lib/password';
import { signAccessToken, signTwoFactorChallenge, verifyTwoFactorChallenge } from '../lib/jwt';
import { generateToken, hashToken } from '../lib/tokens';
import { sendPasswordResetEmail, sendVerificationEmail } from '../lib/mailer';
import { recordAudit } from '../lib/audit';
import { loadAuthUser } from './rbac.service';
import { consumeSecondFactor } from './twofactor.service';
import { getEnforced2faRoles } from './settings.service';
import { ROLES } from '../config/permissions';
import type { AuthResult, AuthUser, IssuedTokens, RequestContext } from '../types/auth';

/** Login may complete immediately, or require a second factor (TOTP). */
export type LoginResult =
  | { twoFactorRequired: true; challenge: string }
  | { twoFactorRequired?: false; user: AuthUser; tokens: IssuedTokens; mustEnable2fa: boolean };

const REFRESH_MS = () => env.REFRESH_TOKEN_TTL_DAYS * 86_400_000;
const EMAIL_MS = () => env.EMAIL_TOKEN_TTL_HOURS * 3_600_000;
const RESET_MS = () => env.RESET_TOKEN_TTL_MINUTES * 60_000;

// ───────────────────────── helpers ─────────────────────────

/** Create a Session + RefreshToken row and mint an access token for a user. */
async function issueSession(user: AuthUser, ctx: RequestContext): Promise<IssuedTokens> {
  const expiresAt = new Date(Date.now() + REFRESH_MS());
  const session = await prisma.session.create({
    data: { userId: user.id, userAgent: ctx.userAgent?.slice(0, 500), ipAddress: ctx.ipHash, expiresAt },
  });

  const refreshPlain = generateToken();
  await prisma.refreshToken.create({
    data: { userId: user.id, sessionId: session.id, tokenHash: hashToken(refreshPlain), expiresAt },
  });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  });

  return { accessToken, refreshToken: refreshPlain, sessionId: session.id };
}

async function createVerificationToken(
  userId: string,
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
  ttlMs: number,
): Promise<string> {
  const plain = generateToken();
  await prisma.verificationToken.create({
    data: { userId, type, tokenHash: hashToken(plain), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return plain;
}

async function issueEmailVerification(userId: string, email: string): Promise<string> {
  const token = await createVerificationToken(userId, 'EMAIL_VERIFICATION', EMAIL_MS());
  sendVerificationEmail(email, `${env.APP_URL}/verify-email?token=${token}`);
  return token;
}

// ───────────────────────── public API ─────────────────────────

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export async function register(
  input: RegisterInput,
  ctx: RequestContext,
): Promise<AuthResult & { verificationToken: string }> {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, 'Email is already registered');

  const role = await prisma.role.findUnique({ where: { name: ROLES.USER } });
  if (!role) throw new ApiError(500, 'Default role not configured (run the seed)');

  const passwordHash = await hashPassword(input.password);
  const created = await prisma.user.create({
    data: { name: input.name, email, passwordHash, roleId: role.id },
  });

  const verificationToken = await issueEmailVerification(created.id, email);
  const authUser = (await loadAuthUser(created.id))!;
  const tokens = await issueSession(authUser, ctx);
  recordAudit({ userId: created.id, event: 'auth.register', module: 'auth', ...ctx });

  return { user: authUser, tokens, verificationToken };
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput, ctx: RequestContext): Promise<LoginResult> {
  const email = input.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    recordAudit({ userId: user?.id ?? null, event: 'auth.login_failed', module: 'auth', metadata: { email }, ...ctx });
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) {
    recordAudit({ userId: user.id, event: 'auth.login_disabled', module: 'auth', ...ctx });
    throw new ApiError(403, 'Account is disabled');
  }

  // Step 1 complete. If 2FA is enabled, issue a short-lived challenge instead of a session.
  if (user.twoFactorEnabled) {
    recordAudit({ userId: user.id, event: 'auth.login_2fa_challenge', module: 'auth', ...ctx });
    return { twoFactorRequired: true, challenge: signTwoFactorChallenge(user.id) };
  }

  const authUser = (await loadAuthUser(user.id))!;
  const tokens = await issueSession(authUser, ctx);
  recordAudit({ userId: user.id, event: 'auth.login', module: 'auth', ...ctx });

  // Enforcement: if this role must use 2FA but hasn't enabled it, flag setup.
  const enforcedRoles = await getEnforced2faRoles();
  const mustEnable2fa = enforcedRoles.includes(authUser.role);
  return { user: authUser, tokens, mustEnable2fa };
}

/** Step 2 of a 2FA login: exchange a valid challenge + code for a session. */
export async function completeTwoFactorLogin(
  challenge: string | undefined,
  code: string,
  ctx: RequestContext,
): Promise<AuthResult> {
  if (!challenge) throw new ApiError(401, 'Missing 2FA challenge');
  let userId: string;
  try {
    userId = verifyTwoFactorChallenge(challenge);
  } catch {
    throw new ApiError(401, 'Invalid or expired 2FA challenge');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive || !user.twoFactorEnabled) {
    throw new ApiError(401, 'Two-factor authentication is not available for this account');
  }
  if (!(await consumeSecondFactor(user, code))) {
    recordAudit({ userId: user.id, event: 'auth.2fa_failed', module: 'auth', ...ctx });
    throw new ApiError(401, 'Invalid authentication code');
  }

  const authUser = (await loadAuthUser(user.id))!;
  const tokens = await issueSession(authUser, ctx);
  recordAudit({ userId: user.id, event: 'auth.login', module: 'auth', metadata: { via: '2fa' }, ...ctx });
  return { user: authUser, tokens };
}

export async function logout(refreshPlain: string | undefined, ctx: RequestContext): Promise<void> {
  if (!refreshPlain) return;
  const token = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshPlain) } });
  if (!token) return;
  await prisma.refreshToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
  if (token.sessionId) {
    await prisma.session.delete({ where: { id: token.sessionId } }).catch(() => undefined);
  }
  recordAudit({ userId: token.userId, event: 'auth.logout', module: 'auth', ...ctx });
}

/** Rotate a refresh token. Detects reuse of a revoked token (token theft). */
export async function refresh(refreshPlain: string | undefined, ctx: RequestContext): Promise<AuthResult> {
  if (!refreshPlain) throw new ApiError(401, 'Missing refresh token');
  const tokenHash = hashToken(refreshPlain);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing) throw new ApiError(401, 'Invalid refresh token');

  if (existing.revokedAt) {
    // Reuse of an already-rotated token → assume compromise; revoke everything.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await prisma.session.deleteMany({ where: { userId: existing.userId } });
    recordAudit({ userId: existing.userId, event: 'auth.refresh_reuse_detected', module: 'auth', ...ctx });
    throw new ApiError(401, 'Refresh token reuse detected. Please log in again.');
  }

  if (existing.expiresAt < new Date()) throw new ApiError(401, 'Refresh token expired');

  const authUser = await loadAuthUser(existing.userId);
  if (!authUser || !authUser.isActive) throw new ApiError(401, 'Account unavailable');

  const newPlain = generateToken();
  const newHash = hashToken(newPlain);
  const expiresAt = new Date(Date.now() + REFRESH_MS());

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedByTokenHash: newHash },
    }),
    prisma.refreshToken.create({
      data: { userId: existing.userId, sessionId: existing.sessionId, tokenHash: newHash, expiresAt },
    }),
  ]);

  const accessToken = signAccessToken({
    sub: authUser.id,
    email: authUser.email,
    role: authUser.role,
    permissions: authUser.permissions,
  });
  recordAudit({ userId: authUser.id, event: 'auth.refresh', module: 'auth', ...ctx });

  return {
    user: authUser,
    tokens: { accessToken, refreshToken: newPlain, sessionId: existing.sessionId ?? '' },
  };
}

export async function me(userId: string): Promise<AuthUser> {
  const user = await loadAuthUser(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

/** Always succeeds (no account enumeration). Returns the token only for dev use. */
export async function forgotPassword(email: string, ctx: RequestContext): Promise<string | undefined> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return undefined;
  const token = await createVerificationToken(user.id, 'PASSWORD_RESET', RESET_MS());
  sendPasswordResetEmail(user.email, `${env.APP_URL}/reset-password?token=${token}`);
  recordAudit({ userId: user.id, event: 'auth.password_reset_requested', module: 'auth', ...ctx });
  return token;
}

export async function resetPassword(token: string, newPassword: string, ctx: RequestContext): Promise<void> {
  const vt = await prisma.verificationToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!vt || vt.type !== 'PASSWORD_RESET' || vt.usedAt || vt.expiresAt < new Date()) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: vt.userId }, data: { passwordHash } }),
    prisma.verificationToken.update({ where: { id: vt.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({ where: { userId: vt.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: vt.userId } }),
  ]);
  recordAudit({ userId: vt.userId, event: 'auth.password_reset', module: 'auth', ...ctx });
}

export async function verifyEmail(token: string, ctx: RequestContext): Promise<void> {
  const vt = await prisma.verificationToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!vt || vt.type !== 'EMAIL_VERIFICATION' || vt.usedAt || vt.expiresAt < new Date()) {
    throw new ApiError(400, 'Invalid or expired verification token');
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: vt.userId }, data: { emailVerified: true } }),
    prisma.verificationToken.update({ where: { id: vt.id }, data: { usedAt: new Date() } }),
  ]);
  recordAudit({ userId: vt.userId, event: 'auth.email_verified', module: 'auth', ...ctx });
}

/** Always succeeds (no enumeration). Returns the token only for dev use. */
export async function resendVerification(email: string): Promise<string | undefined> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.emailVerified) return undefined;
  return issueEmailVerification(user.id, user.email);
}
