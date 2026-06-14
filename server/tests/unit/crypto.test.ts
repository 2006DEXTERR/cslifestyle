import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../src/lib/crypto';

describe('AES-256-GCM crypto', () => {
  it('round-trips plaintext', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it('produces different ciphertext each time (random IV)', () => {
    expect(encrypt('same')).not.toBe(encrypt('same'));
  });

  it('ciphertext does not contain the plaintext', () => {
    expect(encrypt('TOPSECRET')).not.toContain('TOPSECRET');
  });

  it('rejects tampered ciphertext', () => {
    const enc = encrypt('value');
    const parts = enc.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${Buffer.from('different').toString('base64')}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it('rejects malformed input', () => {
    expect(() => decrypt('not-valid')).toThrow();
  });
});
