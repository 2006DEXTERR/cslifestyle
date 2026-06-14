/**
 * Canonical RBAC catalog — single source of truth for roles, permissions, and
 * their mapping. Consumed by the seed (to populate the DB) and by middleware
 * (for permission-name constants). Aligns with blueprint §15.2.
 */

export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  ANALYST: 'analyst',
  AUTHOR: 'author',
  USER: 'user',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  admin: 'Full system access — all modules and settings.',
  editor: 'Content management — products, guides, comparisons, categories, SEO.',
  analyst: 'Read-only access to analytics, affiliate, and SEO data.',
  author: 'Creates and edits guides and comparisons.',
  user: 'Standard authenticated user — no admin panel access.',
};

/** Permission as `<module>.<action>`. `admin.access` gates entry to /admin/*. */
export interface PermissionDef {
  name: string;
  module: string;
  description: string;
}

const MODULES_CRUD = [
  'products',
  'categories',
  'brands',
  'guides',
  'comparisons',
  'authors',
  'users',
  'roles',
  'settings',
  'seo',
  'ai',
  'affiliate',
  'analytics',
  'import',
] as const;

const CRUD = ['view', 'create', 'edit', 'delete'] as const;

function buildPermissions(): PermissionDef[] {
  const perms: PermissionDef[] = [
    { name: 'admin.access', module: 'admin', description: 'Access the admin panel' },
    { name: 'products.publish', module: 'products', description: 'Publish/unpublish products' },
    { name: 'products.import', module: 'products', description: 'Import products' },
    { name: 'guides.publish', module: 'guides', description: 'Publish guides' },
    { name: 'comparisons.publish', module: 'comparisons', description: 'Publish comparisons' },
    { name: 'ai.generate', module: 'ai', description: 'Trigger AI content generation' },
    { name: 'seo.manage', module: 'seo', description: 'Manage sitemaps, robots, redirects' },
  ];
  for (const m of MODULES_CRUD) {
    for (const a of CRUD) {
      perms.push({ name: `${m}.${a}`, module: m, description: `${a} ${m}` });
    }
  }
  return perms;
}

export const PERMISSIONS: PermissionDef[] = buildPermissions();
export const ALL_PERMISSION_NAMES: string[] = PERMISSIONS.map((p) => p.name);

/** Helper: every permission belonging to a module (any action). */
function moduleAll(module: string): string[] {
  return PERMISSIONS.filter((p) => p.module === module).map((p) => p.name);
}

/** Helper: a module's read + write but not delete. */
function moduleNoDelete(module: string): string[] {
  return moduleAll(module).filter((p) => !p.endsWith('.delete'));
}

const EDITOR_PERMS = [
  'admin.access',
  ...moduleNoDelete('products'),
  ...moduleAll('guides'),
  ...moduleAll('comparisons'),
  ...moduleNoDelete('categories'),
  ...moduleNoDelete('brands'),
  'authors.view',
  'authors.edit',
  'seo.view',
  'seo.manage',
  'ai.view',
  'ai.generate',
  'affiliate.view',
  'analytics.view',
  'import.view',
];

const ANALYST_PERMS = [
  'admin.access',
  'products.view',
  'categories.view',
  'brands.view',
  'guides.view',
  'comparisons.view',
  'authors.view',
  'analytics.view',
  'affiliate.view',
  'seo.view',
];

const AUTHOR_PERMS = [
  'admin.access',
  'products.view',
  'categories.view',
  'brands.view',
  'guides.view',
  'guides.create',
  'guides.edit',
  'comparisons.view',
  'comparisons.create',
  'comparisons.edit',
  'authors.view',
  'authors.edit',
];

/** Role → permission names. `admin` gets every permission. `user` gets none. */
export const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  admin: ALL_PERMISSION_NAMES,
  editor: dedupe(EDITOR_PERMS),
  analyst: dedupe(ANALYST_PERMS),
  author: dedupe(AUTHOR_PERMS),
  user: [],
};

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}
