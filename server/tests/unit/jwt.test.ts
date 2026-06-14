import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../../src/lib/jwt';

const claims = {
  sub: 'user_123',
  email: 'jane@example.com',
  role: 'admin',
  permissions: ['admin.access', 'products.view'],
};

describe('access token (JWT)', () => {
  it('signs and verifies, preserving claims', () => {
    const token = signAccessToken(claims);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(claims.sub);
    expect(decoded.email).toBe(claims.email);
    expect(decoded.role).toBe('admin');
    expect(decoded.permissions).toContain('admin.access');
    expect(decoded.iss).toBe('cslifestyle');
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken(claims);
    const tampered = token.slice(0, -3) + 'abc';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('rejects a malformed token', () => {
    expect(() => verifyAccessToken('not-a-jwt')).toThrow();
  });
});
