import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env';

/**
 * Authenticated symmetric encryption (AES-256-GCM) for secrets at rest
 * (e.g. TOTP secrets). The key is derived from ENCRYPTION_KEY via SHA-256 so
 * any sufficiently-long passphrase yields a valid 32-byte key.
 *
 * Format: base64(iv).base64(authTag).base64(ciphertext)
 */
const KEY = createHash('sha256').update(env.ENCRYPTION_KEY).digest(); // 32 bytes
const ALGO = 'aes-256-gcm';

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join('.');
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed ciphertext');
  const decipher = createDecipheriv(ALGO, KEY, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
