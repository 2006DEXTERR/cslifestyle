import bcrypt from 'bcrypt';
import { env } from '../config/env';

/** Hash a plaintext password with bcrypt (cost from BCRYPT_ROUNDS). */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

/** Constant-time compare of a plaintext password against a bcrypt hash. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
