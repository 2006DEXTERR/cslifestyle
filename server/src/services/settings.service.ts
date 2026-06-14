import { prisma } from '../lib/prisma';

/** Key for the admin-configurable list of roles that must use 2FA. */
export const ENFORCE_2FA_ROLES_KEY = 'auth.enforce_2fa_roles';
const DEFAULT_ENFORCED_ROLES = ['admin'];

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(
  key: string,
  value: string,
  opts: { type?: string; group?: string } = {},
): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value, type: opts.type, group: opts.group },
    create: { key, value, type: opts.type ?? 'string', group: opts.group },
  });
}

async function getJsonSetting<T>(key: string, fallback: T): Promise<T> {
  const raw = await getSetting(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Roles for which 2FA is enforced (admin-configurable). */
export function getEnforced2faRoles(): Promise<string[]> {
  return getJsonSetting<string[]>(ENFORCE_2FA_ROLES_KEY, DEFAULT_ENFORCED_ROLES);
}

export async function setEnforced2faRoles(roles: string[]): Promise<string[]> {
  const clean = [...new Set(roles.map((r) => r.trim().toLowerCase()).filter(Boolean))];
  await setSetting(ENFORCE_2FA_ROLES_KEY, JSON.stringify(clean), { type: 'json', group: 'security' });
  return clean;
}
