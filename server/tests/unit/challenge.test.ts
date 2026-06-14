import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  signTwoFactorChallenge,
  verifyTwoFactorChallenge,
} from '../../src/lib/jwt';

describe('2FA challenge token', () => {
  it('round-trips the user id', () => {
    const token = signTwoFactorChallenge('user_42');
    expect(verifyTwoFactorChallenge(token)).toBe('user_42');
  });

  it('rejects a normal access token (wrong type)', () => {
    const access = signAccessToken({ sub: 'u1', email: 'a@b.c', role: 'user', permissions: [] });
    expect(() => verifyTwoFactorChallenge(access)).toThrow();
  });

  it('rejects garbage', () => {
    expect(() => verifyTwoFactorChallenge('nope')).toThrow();
  });
});
