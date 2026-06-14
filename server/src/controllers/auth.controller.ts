import type { Request, Response } from 'express';
import { ok } from '../lib/http';
import { isProd } from '../config/env';
import { getContext } from '../lib/request-context';
import { generateToken } from '../lib/tokens';
import {
  COOKIE,
  clearAuthCookies,
  setAccessCookie,
  setCsrfCookie,
  setRefreshCookie,
} from '../lib/cookies';
import * as authService from '../services/auth.service';
import type { IssuedTokens } from '../types/auth';

/** Set access + refresh + a fresh CSRF cookie; return the CSRF token. */
function establishSession(res: Response, tokens: IssuedTokens): string {
  setAccessCookie(res, tokens.accessToken);
  setRefreshCookie(res, tokens.refreshToken);
  const csrf = generateToken(24);
  setCsrfCookie(res, csrf);
  return csrf;
}

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body, getContext(req));
  const csrfToken = establishSession(res, result.tokens);
  res.status(201).json(
    ok({
      user: result.user,
      csrfToken,
      ...(isProd ? {} : { devVerificationToken: result.verificationToken }),
    }),
  );
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body, getContext(req));
  if (result.twoFactorRequired) {
    // No session yet — client must complete the 2FA challenge.
    res.json(ok({ twoFactorRequired: true, challenge: result.challenge }));
    return;
  }
  const csrfToken = establishSession(res, result.tokens);
  res.json(ok({ user: result.user, csrfToken, mustEnable2fa: result.mustEnable2fa }));
}

export async function loginTwoFactor(req: Request, res: Response): Promise<void> {
  const { challenge, code } = req.body;
  const result = await authService.completeTwoFactorLogin(challenge, code, getContext(req));
  const csrfToken = establishSession(res, result.tokens);
  res.json(ok({ user: result.user, csrfToken }));
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.cookies?.[COOKIE.REFRESH], getContext(req));
  clearAuthCookies(res);
  res.json(ok({ loggedOut: true }));
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const result = await authService.refresh(req.cookies?.[COOKIE.REFRESH], getContext(req));
  const csrfToken = establishSession(res, result.tokens);
  res.json(ok({ user: result.user, csrfToken }));
}

export async function me(req: Request, res: Response): Promise<void> {
  res.json(ok({ user: req.user }));
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const token = await authService.forgotPassword(req.body.email, getContext(req));
  res.json(
    ok({
      message: 'If an account with that email exists, a password reset link has been sent.',
      ...(isProd ? {} : { devResetToken: token }),
    }),
  );
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await authService.resetPassword(req.body.token, req.body.password, getContext(req));
  clearAuthCookies(res);
  res.json(ok({ reset: true }));
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  await authService.verifyEmail(req.body.token, getContext(req));
  res.json(ok({ verified: true }));
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  const token = await authService.resendVerification(req.body.email);
  res.json(
    ok({
      message: 'If an unverified account with that email exists, a new verification link has been sent.',
      ...(isProd ? {} : { devVerificationToken: token }),
    }),
  );
}
