import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password';

describe('password hashing (bcrypt)', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('Str0ngPass');
    expect(hash).not.toBe('Str0ngPass');
    expect(hash.startsWith('$2')).toBe(true);
    expect(await verifyPassword('Str0ngPass', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('Str0ngPass');
    expect(await verifyPassword('WrongPass1', hash)).toBe(false);
  });

  it('produces a different hash each time (random salt)', async () => {
    const a = await hashPassword('Str0ngPass');
    const b = await hashPassword('Str0ngPass');
    expect(a).not.toBe(b);
  });
});
