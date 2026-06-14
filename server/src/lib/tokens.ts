import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

/**
 * Opaque secret tokens (refresh tokens, email-verify / password-reset tokens).
 * The plaintext is sent to the client; only a SHA-256 hash (peppered) is stored,
 * so a DB leak does not expose usable tokens.
 */

/** Generate a cryptographically-random URL-safe token (default 48 bytes). */
export function generateToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

/** Deterministic SHA-256 hash of a token (with optional pepper). */
export function hashToken(token: string): string {
  return createHash('sha256')
    .update(token + env.TOKEN_PEPPER)
    .digest('hex');
}

/** Constant-time comparison of two hex hashes. */
export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** SHA-256 hash of an arbitrary value (e.g. IP address) for privacy logging. */
export function sha256(value: string): string {
  return createHash('sha256')
    .update(value + env.TOKEN_PEPPER)
    .digest('hex');
}
