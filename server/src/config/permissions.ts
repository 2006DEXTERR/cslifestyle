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
  'reports',
  'marketing',
  'media',
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
    { name: 'ai.manage', module: 'ai', description: 'Manage AI queue (retry/approve), prompts, providers' },
    { name: 'seo.manage', module: 'seo', description: 'Manage sitemaps, robots, redirects' },
    { name: 'import.manage', module: 'import', description: 'Manage import jobs, templates, retries' },
    { name: 'analytics.manage', module: 'analytics', description: 'Manage analytics config + providers' },
    { name: 'reports.manage', module: 'reports', description: 'Generate, manage and delete reports' },
    { name: 'marketing.manage', module: 'marketing', description: 'Manage marketing center, settings' },
    { name: 'newsletter.manage', module: 'marketing', description: 'Manage newsletter subscribers' },
    { name: 'campaign.manage', module: 'marketing', description: 'Create, schedule and send campaigns' },
    { name: 'media.upload', module: 'media', description: 'Upload media assets' },
    { name: 'media.manage', module: 'media', description: 'Manage media (replace, delete, folders, usage)' },
    { name: 'search.manage', module: 'search', description: 'Manage search synonyms + index' },
    { name: 'recommendations.view', module: 'recommendations', description: 'View recommendation rules, internal-link suggestions' },
    { name: 'recommendations.manage', module: 'recommendations', description: 'Manage recommendation rules, internal links' },
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
  'ai.manage',
  'affiliate.view',
  'analytics.view',
  'analytics.manage',
  'reports.view',
  'reports.create',
  'reports.manage',
  'import.view',
  'import.create',
  'marketing.view',
  'marketing.manage',
  'newsletter.manage',
  'campaign.manage',
  'media.view',
  'media.upload',
  'media.manage',
  'search.manage',
  'recommendations.view',
  'recommendations.manage',
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
  'reports.view',
  'affiliate.view',
  'seo.view',
  'marketing.view',
  'media.view',
  'recommendations.view',
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
  'media.view',
  'media.upload',
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
