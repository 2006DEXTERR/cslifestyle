import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http';
import type { Pagination } from '../../lib/http';
import { hashPassword } from '../../lib/password';
import { ALL_PERMISSION_NAMES, ROLES } from '../../config/permissions';
import type {
  UserListQuery,
  CreateUserBody,
  UpdateUserBody,
  CreateRoleBody,
  UpdateRoleBody,
} from '../../validation/admin.schemas';

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

export async function createUser(body: CreateUserBody): Promise<PresentedUser> {
  const role = await prisma.role.findUnique({ where: { id: body.roleId }, select: { id: true } });
  if (!role) throw ApiError.badRequest('Unknown role', { roleId: ['Unknown role'] });

  const clash = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
  if (clash) throw ApiError.badRequest('Email already in use', { email: ['Email already in use'] });

  const passwordHash = await hashPassword(body.password);
  const u = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash,
      roleId: body.roleId,
      isActive: body.isActive ?? true,
      emailVerified: true, // admin-created accounts are pre-verified (the admin vouches for them)
    },
    include: { role: true },
  });
  return presentUser(u, null);
}

/**
 * Soft-delete a user: deactivate + revoke every session/refresh token (immediate
 * sign-out). We do NOT hard-delete because the User row is referenced by audit
 * logs (attribution), import jobs, campaigns, media, revenue imports and more —
 * a hard delete would either fail on those constraints or destroy history.
 * Deactivation is reversible and preserves the audit trail. Guards: cannot remove
 * your own access, and cannot deactivate the last remaining active admin.
 */
export async function deleteUser(id: string, actingUserId: string | null): Promise<PresentedUser> {
  const target = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!target) throw ApiError.notFound('User not found');
  if (actingUserId && actingUserId === id) throw ApiError.badRequest('You cannot delete your own account');

  if (target.role.name === ROLES.ADMIN && target.isActive) {
    const activeAdmins = await prisma.user.count({ where: { isActive: true, role: { name: ROLES.ADMIN } } });
    if (activeAdmins <= 1) throw ApiError.badRequest('Cannot deactivate the last active admin');
  }

  const [u] = await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { isActive: false }, include: { role: true } }),
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
  ]);
  return presentUser(u, null);
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

/** Validate permission names against the canonical catalog and resolve them to ids. */
async function resolvePermissionIds(names: string[]): Promise<string[]> {
  const unique = [...new Set(names)];
  const invalid = unique.filter((n) => !ALL_PERMISSION_NAMES.includes(n));
  if (invalid.length) {
    throw ApiError.badRequest('Unknown permission(s)', {
      permissions: invalid.map((n) => `Unknown permission: ${n}`),
    });
  }
  if (unique.length === 0) return [];
  const rows = await prisma.permission.findMany({ where: { name: { in: unique } }, select: { id: true } });
  return rows.map((r) => r.id);
}

export async function createRole(body: CreateRoleBody): Promise<PresentedRole> {
  const clash = await prisma.role.findUnique({ where: { name: body.name }, select: { id: true } });
  if (clash) throw ApiError.badRequest('A role with that name already exists', { name: ['Name already in use'] });

  const permissionIds = await resolvePermissionIds(body.permissions ?? []);
  const role = await prisma.role.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
    },
    include: ROLE_INCLUDE,
  });
  return presentRole(role);
}

export async function updateRole(id: string, body: UpdateRoleBody): Promise<PresentedRole> {
  const existing = await prisma.role.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!existing) throw ApiError.notFound('Role not found');
  // The admin role must retain full access — refuse permission edits so an admin
  // can never lock the whole team out of the panel.
  if (body.permissions !== undefined && existing.name === ROLES.ADMIN) {
    throw ApiError.badRequest('The admin role always has full access and its permissions cannot be edited');
  }

  const permissionIds = body.permissions !== undefined ? await resolvePermissionIds(body.permissions) : null;

  await prisma.$transaction(async (tx) => {
    const data: Prisma.RoleUncheckedUpdateInput = {};
    if (body.description !== undefined) data.description = body.description;
    if (Object.keys(data).length) await tx.role.update({ where: { id }, data });
    if (permissionIds !== null) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
    }
  });
  return getRole(id);
}
