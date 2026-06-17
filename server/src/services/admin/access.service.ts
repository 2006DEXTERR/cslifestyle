import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http';
import type { Pagination } from '../../lib/http';
import type { UserListQuery, UpdateUserBody, UpdateRoleBody } from '../../validation/admin.schemas';

/**
 * Admin access-management service (Phase 13): users + roles + permissions.
 * Read/write over the existing RBAC models. Responses NEVER include
 * `passwordHash` or `twoFactorSecret` (NFR-SEC) — only safe presenter fields.
 */

export interface PresentedUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  roleId: string;
  role: string;
  status: 'active' | 'inactive';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export interface PresentedRole {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

type UserRow = Prisma.UserGetPayload<{ include: { role: true } }>;

function presentUser(u: UserRow, lastLogin: Date | null): PresentedUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    roleId: u.roleId,
    role: u.role.name,
    status: u.isActive ? 'active' : 'inactive',
    emailVerified: u.emailVerified,
    twoFactorEnabled: u.twoFactorEnabled,
    lastLogin: lastLogin ? lastLogin.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  };
}

/** Map of userId → most-recent session createdAt (used as "last login"). */
async function lastLoginMap(userIds: string[]): Promise<Map<string, Date>> {
  if (userIds.length === 0) return new Map();
  const rows = await prisma.session.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds } },
    _max: { createdAt: true },
  });
  const map = new Map<string, Date>();
  for (const r of rows) if (r._max.createdAt) map.set(r.userId, r._max.createdAt);
  return map;
}

export async function listUsers(
  query: UserListQuery,
): Promise<{ items: PresentedUser[]; pagination: Pagination }> {
  const and: Prisma.UserWhereInput[] = [];
  if (query.status === 'active') and.push({ isActive: true });
  if (query.status === 'inactive') and.push({ isActive: false });
  if (query.role) and.push({ role: { name: query.role } });
  if (query.q)
    and.push({
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  const where = and.length ? { AND: and } : {};
  const skip = (query.page - 1) * query.perPage;

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { role: true },
      orderBy: { createdAt: 'asc' },
      skip,
      take: query.perPage,
    }),
    prisma.user.count({ where }),
  ]);

  const logins = await lastLoginMap(rows.map((r) => r.id));

  return {
    items: rows.map((u) => presentUser(u, logins.get(u.id) ?? null)),
    pagination: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.perPage)),
    },
  };
}

export async function getUser(id: string): Promise<PresentedUser> {
  const u = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!u) throw ApiError.notFound('User not found');
  const logins = await lastLoginMap([u.id]);
  return presentUser(u, logins.get(u.id) ?? null);
}

export async function updateUser(id: string, body: UpdateUserBody): Promise<PresentedUser> {
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('User not found');

  if (body.email) {
    const clash = await prisma.user.findFirst({
      where: { email: body.email, NOT: { id } },
      select: { id: true },
    });
    if (clash) throw ApiError.badRequest('Email already in use', { email: ['Email already in use'] });
  }
  if (body.roleId) {
    const role = await prisma.role.findUnique({ where: { id: body.roleId }, select: { id: true } });
    if (!role) throw ApiError.badRequest('Unknown role', { roleId: ['Unknown role'] });
  }

  const data: Prisma.UserUncheckedUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = body.email;
  if (body.roleId !== undefined) data.roleId = body.roleId;

  const u = await prisma.user.update({ where: { id }, data, include: { role: true } });
  const logins = await lastLoginMap([u.id]);
  return presentUser(u, logins.get(u.id) ?? null);
}

export async function setUserStatus(id: string, isActive: boolean): Promise<PresentedUser> {
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('User not found');
  const u = await prisma.user.update({ where: { id }, data: { isActive }, include: { role: true } });
  const logins = await lastLoginMap([u.id]);
  return presentUser(u, logins.get(u.id) ?? null);
}

// ───────────────────────── Roles ─────────────────────────

type RoleRow = Prisma.RoleGetPayload<{
  include: { permissions: { include: { permission: true } }; _count: { select: { users: true } } };
}>;

function presentRole(r: RoleRow): PresentedRole {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    userCount: r._count.users,
    permissions: r.permissions.map((rp) => rp.permission.name).sort(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

const ROLE_INCLUDE = {
  permissions: { include: { permission: true } },
  _count: { select: { users: true } },
} satisfies Prisma.RoleInclude;

export async function listRoles(): Promise<PresentedRole[]> {
  const rows = await prisma.role.findMany({ include: ROLE_INCLUDE, orderBy: { createdAt: 'asc' } });
  return rows.map(presentRole);
}

export async function getRole(id: string): Promise<PresentedRole> {
  const r = await prisma.role.findUnique({ where: { id }, include: ROLE_INCLUDE });
  if (!r) throw ApiError.notFound('Role not found');
  return presentRole(r);
}

export async function updateRole(id: string, body: UpdateRoleBody): Promise<PresentedRole> {
  const existing = await prisma.role.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Role not found');
  const data: Prisma.RoleUncheckedUpdateInput = {};
  if (body.description !== undefined) data.description = body.description;
  await prisma.role.update({ where: { id }, data });
  return getRole(id);
}
