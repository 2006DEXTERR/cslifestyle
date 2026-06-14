import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  PERMISSIONS,
  ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  type RoleName,
} from '../src/config/permissions';
import { ENFORCE_2FA_ROLES_KEY } from '../src/services/settings.service';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@cslifestyle.in';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'CSLifestyle Admin';

async function main(): Promise<void> {
  console.log('🌱 Seeding RBAC catalog…');

  // 1. Permissions (idempotent upserts).
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { module: p.module, description: p.description },
      create: { name: p.name, module: p.module, description: p.description },
    });
  }
  console.log(`   ✓ ${PERMISSIONS.length} permissions`);

  // 2. Roles + role→permission mapping.
  for (const roleName of Object.values(ROLES) as RoleName[]) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { description: ROLE_DESCRIPTIONS[roleName] },
      create: { name: roleName, description: ROLE_DESCRIPTIONS[roleName] },
    });

    const permNames = ROLE_PERMISSIONS[roleName];
    const perms = await prisma.permission.findMany({
      where: { name: { in: permNames } },
      select: { id: true },
    });

    // Reset and re-map (keeps role permissions in sync with the catalog).
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (perms.length > 0) {
      await prisma.rolePermission.createMany({
        data: perms.map((perm) => ({ roleId: role.id, permissionId: perm.id })),
        skipDuplicates: true,
      });
    }
    console.log(`   ✓ role "${roleName}" → ${perms.length} permissions`);
  }

  // 3. Default admin user.
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: ROLES.ADMIN } });
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { roleId: adminRole.id, isActive: true, emailVerified: true },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`   ✓ admin user: ${ADMIN_EMAIL}`);

  // 4. Default settings — 2FA enforcement policy (admin-configurable).
  await prisma.setting.upsert({
    where: { key: ENFORCE_2FA_ROLES_KEY },
    update: {}, // preserve any admin-set value
    create: {
      key: ENFORCE_2FA_ROLES_KEY,
      value: JSON.stringify(['admin']),
      type: 'json',
      group: 'security',
    },
  });
  console.log('   ✓ default 2FA enforcement policy');

  console.log('✅ Seed complete.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
