import { describe, it, expect } from 'vitest';
import { generateToken, hashToken, safeEqualHex, sha256 } from '../../src/lib/tokens';

describe('opaque tokens', () => {
  it('generates unique random tokens', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it('hashes deterministically and differs per input', () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken('a')).not.toBe(hashToken('b'));
    // Stored hash never equals the plaintext.
    expect(hashToken(t)).not.toBe(t);
  });

  it('compares hex hashes in constant time', () => {
    const h = sha256('1.2.3.4');
    expect(safeEqualHex(h, h)).toBe(true);
    expect(safeEqualHex(h, sha256('5.6.7.8'))).toBe(false);
    expect(safeEqualHex('aa', 'aabb')).toBe(false);
  });
});
