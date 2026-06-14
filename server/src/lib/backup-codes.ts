import { randomBytes } from 'node:crypto';
import { hashToken } from './tokens';

// Crockford-ish base32 (no ambiguous chars) for readable, typeable codes.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generate `count` single-use backup codes formatted as XXXXX-XXXXX. */
export function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = Array.from(randomBytes(10), (b) => ALPHABET[b % ALPHABET.length]).join('');
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}

/** Normalise user input (strip spaces/dashes, uppercase) for comparison. */
export function normalizeBackupCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

/** Hash a backup code for storage / comparison (SHA-256 + pepper). */
export function hashBackupCode(code: string): string {
  return hashToken(normalizeBackupCode(code));
}
