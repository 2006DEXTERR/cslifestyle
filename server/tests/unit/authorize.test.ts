import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { requireRole, requirePermission } from '../../src/middleware/authorize';
import { ApiError } from '../../src/lib/http';
import type { AuthUser } from '../../src/types/auth';

function makeUser(role: string, permissions: string[]): AuthUser {
  return {
    id: 'u1',
    name: 'Test',
    email: 't@example.com',
    avatar: null,
    isActive: true,
    emailVerified: true,
    role,
    permissions,
  };
}

function invoke(mw: ReturnType<typeof requireRole>, user?: AuthUser): unknown {
  const req = { user } as unknown as Request;
  const res = {} as Response;
  const next = vi.fn();
  mw(req, res, next);
  return next.mock.calls[0]?.[0];
}

describe('requireRole', () => {
  it('allows a matching role', () => {
    expect(invoke(requireRole('admin'), makeUser('admin', []))).toBeUndefined();
  });
  it('denies a non-matching role with 403', () => {
    const err = invoke(requireRole('admin'), makeUser('user', []));
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).statusCode).toBe(403);
  });
  it('rejects an unauthenticated request with 401', () => {
    const err = invoke(requireRole('admin'), undefined);
    expect((err as ApiError).statusCode).toBe(401);
  });
});

describe('requirePermission', () => {
  it('allows when all permissions are present', () => {
    const user = makeUser('editor', ['products.view', 'products.edit']);
    expect(invoke(requirePermission('products.view', 'products.edit'), user)).toBeUndefined();
  });
  it('denies with 403 + missing list when a permission is absent', () => {
    const user = makeUser('editor', ['products.view']);
    const err = invoke(requirePermission('products.view', 'products.delete'), user);
    expect((err as ApiError).statusCode).toBe(403);
    expect((err as ApiError).errors).toMatchObject({ missing: ['products.delete'] });
  });
  it('rejects an unauthenticated request with 401', () => {
    const err = invoke(requirePermission('admin.access'), undefined);
    expect((err as ApiError).statusCode).toBe(401);
  });
});
