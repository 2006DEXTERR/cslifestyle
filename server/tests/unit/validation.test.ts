import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
} from '../../src/validation/auth.schemas';

describe('auth validation schemas', () => {
  it('accepts a valid registration and normalises the email', () => {
    const parsed = registerSchema.parse({
      name: 'Jane Doe',
      email: '  Jane@Example.COM ',
      password: 'Str0ngPass',
    });
    expect(parsed.email).toBe('jane@example.com');
  });

  it('rejects a weak password (missing uppercase/number)', () => {
    expect(() => registerSchema.parse({ name: 'Jane', email: 'j@e.com', password: 'weakpass' })).toThrow();
  });

  it('rejects a short name', () => {
    expect(() => registerSchema.parse({ name: 'J', email: 'j@e.com', password: 'Str0ngPass' })).toThrow();
  });

  it('login requires a non-empty password', () => {
    expect(() => loginSchema.parse({ email: 'j@e.com', password: '' })).toThrow();
  });

  it('reset-password requires token and a strong password', () => {
    expect(() => resetPasswordSchema.parse({ token: '', password: 'Str0ngPass' })).toThrow();
    expect(resetPasswordSchema.parse({ token: 'abc', password: 'Str0ngPass' })).toBeTruthy();
  });
});
