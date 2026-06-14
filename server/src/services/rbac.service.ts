import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { AuthUser } from '../types/auth';

/** Include shape used everywhere we need a user + role + flattened permissions. */
export const userWithRoleInclude = {
  role: { include: { permissions: { include: { permission: true } } } },
} satisfies Prisma.UserInclude;

type UserWithRole = Prisma.UserGetPayload<{ include: typeof userWithRoleInclude }>;

/** Load a user with their role + flattened permission names, or null. */
export async function loadAuthUser(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userWithRoleInclude,
  });
  if (!user) return null;
  return toAuthUser(user);
}

/** Map a Prisma user (with role+permissions included) to the AuthUser shape. */
export function toAuthUser(user: UserWithRole): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    role: user.role.name,
    permissions: user.role.permissions.map((rp) => rp.permission.name),
  };
}

/** True if the permission set grants the named permission. */
export function hasPermission(permissions: string[], name: string): boolean {
  return permissions.includes(name);
}

/** True if any of the named permissions is granted. */
export function hasAnyPermission(permissions: string[], names: string[]): boolean {
  return names.some((n) => permissions.includes(n));
}

/** True if the role name is one of the allowed roles. */
export function hasRole(role: string, allowed: string[]): boolean {
  return allowed.includes(role);
}
