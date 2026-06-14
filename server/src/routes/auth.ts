import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { requireCsrf } from '../middleware/csrf';
import { authLimiter, loginLimiter, twoFactorLimiter } from '../middleware/rateLimit';
import { auditLogger } from '../middleware/audit';
import * as auth from '../controllers/auth.controller';
import * as twoFactor from '../controllers/twofactor.controller';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validation/auth.schemas';
import { loginTwoFactorSchema, twoFactorCodeSchema } from '../validation/twofactor.schemas';

/**
 * Auth router, mounted at `/api/auth`.
 *
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication & session management
 * components:
 *   schemas:
 *     AuthUser:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         email: { type: string }
 *         avatar: { type: string, nullable: true }
 *         isActive: { type: boolean }
 *         emailVerified: { type: boolean }
 *         role: { type: string, example: user }
 *         permissions: { type: array, items: { type: string } }
 */
export const authRouter = Router();

// A general limiter guards the whole auth surface; login adds brute-force protection.
authRouter.use(authLimiter);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new account (role "user") and start a session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Jane Doe }
 *               email: { type: string, example: jane@example.com }
 *               password: { type: string, example: Str0ngPass }
 *     responses:
 *       201: { description: Registered; sets auth cookies }
 *       400: { description: Validation failed }
 *       409: { description: Email already registered }
 */
authRouter.post(
  '/register',
  validateBody(registerSchema),
  auditLogger('auth.register', 'auth'),
  asyncHandler(auth.register),
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate and start a session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: "Logged in (sets cookies), or { twoFactorRequired, challenge } when 2FA is enabled" }
 *       401: { description: Invalid credentials }
 *       403: { description: Account disabled }
 *       429: { description: Too many failed attempts }
 */
authRouter.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(auth.login),
);

/**
 * @openapi
 * /api/auth/login/2fa:
 *   post:
 *     tags: [Auth]
 *     summary: Complete a two-factor login (exchange challenge + code for a session)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [challenge, code]
 *             properties:
 *               challenge: { type: string, description: token from the login response }
 *               code: { type: string, description: 6-digit TOTP or a backup code }
 *     responses:
 *       200: { description: Logged in; sets auth cookies }
 *       401: { description: Invalid/expired challenge or invalid code }
 *       429: { description: Too many attempts }
 */
authRouter.post(
  '/login/2fa',
  twoFactorLimiter,
  validateBody(loginTwoFactorSchema),
  asyncHandler(auth.loginTwoFactor),
);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke the current refresh token and clear cookies
 *     responses:
 *       200: { description: Logged out }
 *       403: { description: Missing/invalid CSRF token }
 */
authRouter.post('/logout', requireCsrf, asyncHandler(auth.logout));

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate the refresh token and issue a new access token
 *     responses:
 *       200: { description: New tokens issued }
 *       401: { description: Missing/invalid/expired or reused refresh token }
 *       403: { description: Missing/invalid CSRF token }
 */
authRouter.post('/refresh', requireCsrf, asyncHandler(auth.refresh));

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current authenticated user (with role + permissions)
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Not authenticated }
 */
authRouter.get('/me', authenticate, asyncHandler(auth.me));

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset link (always 200 — no account enumeration)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties: { email: { type: string } }
 *     responses:
 *       200: { description: Reset link sent if the account exists }
 */
authRouter.post(
  '/forgot-password',
  validateBody(forgotPasswordSchema),
  asyncHandler(auth.forgotPassword),
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset the password using a valid reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Password reset; all sessions revoked }
 *       400: { description: Invalid or expired token }
 */
authRouter.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  asyncHandler(auth.resetPassword),
);

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify an email address using a verification token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties: { token: { type: string } }
 *     responses:
 *       200: { description: Email verified }
 *       400: { description: Invalid or expired token }
 */
authRouter.post(
  '/verify-email',
  validateBody(verifyEmailSchema),
  asyncHandler(auth.verifyEmail),
);

/**
 * @openapi
 * /api/auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend the email verification link (always 200 — no enumeration)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties: { email: { type: string } }
 *     responses:
 *       200: { description: Verification link sent if applicable }
 */
authRouter.post(
  '/resend-verification',
  validateBody(resendVerificationSchema),
  asyncHandler(auth.resendVerification),
);

// ───────────────────────── Two-factor management (authenticated) ─────────────────────────

/**
 * @openapi
 * /api/auth/2fa/status:
 *   get:
 *     tags: [Auth]
 *     summary: Current user's 2FA status (enabled/pending + backup codes remaining)
 *     responses:
 *       200: { description: 2FA status }
 *       401: { description: Not authenticated }
 */
authRouter.get('/2fa/status', authenticate, asyncHandler(twoFactor.status));

/**
 * @openapi
 * /api/auth/2fa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Begin 2FA enrollment — returns a secret + otpauth URI + QR data URL
 *     responses:
 *       200: { description: Pending secret created }
 *       401: { description: Not authenticated }
 *       409: { description: 2FA already enabled }
 */
authRouter.post(
  '/2fa/setup',
  authenticate,
  requireCsrf,
  auditLogger('auth.2fa_setup', 'auth'),
  asyncHandler(twoFactor.setup),
);

/**
 * @openapi
 * /api/auth/2fa/enable:
 *   post:
 *     tags: [Auth]
 *     summary: Verify a code and enable 2FA — returns one-time backup codes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties: { code: { type: string } }
 *     responses:
 *       200: { description: 2FA enabled; backup codes returned once }
 *       400: { description: Invalid code or setup not started }
 *       401: { description: Not authenticated }
 */
authRouter.post(
  '/2fa/enable',
  authenticate,
  requireCsrf,
  validateBody(twoFactorCodeSchema),
  auditLogger('auth.2fa_enable', 'auth'),
  asyncHandler(twoFactor.enable),
);

/**
 * @openapi
 * /api/auth/2fa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: Verify a code (TOTP or backup) and disable 2FA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties: { code: { type: string } }
 *     responses:
 *       200: { description: 2FA disabled }
 *       400: { description: Invalid code or 2FA not enabled }
 *       401: { description: Not authenticated }
 */
authRouter.post(
  '/2fa/disable',
  authenticate,
  requireCsrf,
  twoFactorLimiter,
  validateBody(twoFactorCodeSchema),
  auditLogger('auth.2fa_disable', 'auth'),
  asyncHandler(twoFactor.disable),
);

/**
 * @openapi
 * /api/auth/2fa/backup-codes:
 *   post:
 *     tags: [Auth]
 *     summary: Regenerate backup codes (requires a current TOTP code)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties: { code: { type: string } }
 *     responses:
 *       200: { description: New backup codes returned once }
 *       400: { description: Invalid code or 2FA not enabled }
 *       401: { description: Not authenticated }
 */
authRouter.post(
  '/2fa/backup-codes',
  authenticate,
  requireCsrf,
  validateBody(twoFactorCodeSchema),
  auditLogger('auth.2fa_backup_regenerate', 'auth'),
  asyncHandler(twoFactor.regenerateBackupCodes),
);
