import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

/** Claims carried in the short-lived access token. */
export interface AccessTokenClaims {
  sub: string; // user id
  email: string;
  role: string; // role name
  permissions: string[]; // permission names
}

const ALGORITHM = 'HS256' as const;
const ISSUER = 'cslifestyle';

/** Sign an access token (HS256, expiry from ACCESS_TOKEN_TTL). */
export function signAccessToken(claims: AccessTokenClaims): string {
  const options: SignOptions = {
    algorithm: ALGORITHM,
    issuer: ISSUER,
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  };
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, options);
}

/** Verify + decode an access token. Throws on invalid/expired tokens. */
export function verifyAccessToken(token: string): AccessTokenClaims & jwt.JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
  }) as AccessTokenClaims & jwt.JwtPayload;
}

const CHALLENGE_TYP = '2fa';

/**
 * Short-lived token issued after step-1 (password) of a 2FA login. The holder
 * must present a valid TOTP/backup code to exchange it for a real session.
 */
export function signTwoFactorChallenge(userId: string): string {
  return jwt.sign({ sub: userId, typ: CHALLENGE_TYP }, env.JWT_ACCESS_SECRET, {
    algorithm: ALGORITHM,
    issuer: ISSUER,
    expiresIn: env.TWO_FACTOR_CHALLENGE_TTL as SignOptions['expiresIn'],
  });
}

/** Verify a 2FA challenge token and return the user id. Throws if invalid. */
export function verifyTwoFactorChallenge(token: string): string {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
  }) as jwt.JwtPayload & { typ?: string };
  if (payload.typ !== CHALLENGE_TYP || !payload.sub) {
    throw new Error('Not a 2FA challenge token');
  }
  return payload.sub;
}
