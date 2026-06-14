import { describe, it, expect } from 'vitest';
import { ALL_PERMISSION_NAMES, ROLE_PERMISSIONS, ROLES } from '../../src/config/permissions';

describe('RBAC catalog', () => {
  it('admin holds every permission', () => {
    expect(ROLE_PERMISSIONS[ROLES.ADMIN].length).toBe(ALL_PERMISSION_NAMES.length);
    expect(ROLE_PERMISSIONS[ROLES.ADMIN]).toContain('admin.access');
    expect(ROLE_PERMISSIONS[ROLES.ADMIN]).toContain('users.delete');
  });

  it('plain user holds no permissions and no admin access', () => {
    expect(ROLE_PERMISSIONS[ROLES.USER]).toHaveLength(0);
    expect(ROLE_PERMISSIONS[ROLES.USER]).not.toContain('admin.access');
  });

  it('editor can manage content but not delete products or manage users', () => {
    const editor = ROLE_PERMISSIONS[ROLES.EDITOR];
    expect(editor).toContain('admin.access');
    expect(editor).toContain('guides.create');
    expect(editor).toContain('guides.delete');
    expect(editor).not.toContain('products.delete');
    expect(editor).not.toContain('users.view');
    expect(editor).not.toContain('settings.edit');
  });

  it('analyst is read-only with admin access', () => {
    const analyst = ROLE_PERMISSIONS[ROLES.ANALYST];
    expect(analyst).toContain('admin.access');
    expect(analyst).toContain('analytics.view');
    expect(analyst.some((p) => p.endsWith('.create') || p.endsWith('.edit') || p.endsWith('.delete'))).toBe(false);
  });

  it('author can create guides/comparisons but not access users', () => {
    const author = ROLE_PERMISSIONS[ROLES.AUTHOR];
    expect(author).toContain('admin.access');
    expect(author).toContain('guides.create');
    expect(author).toContain('comparisons.create');
    expect(author).not.toContain('users.view');
    expect(author).not.toContain('products.delete');
  });

  it('every role permission references a real permission', () => {
    const known = new Set(ALL_PERMISSION_NAMES);
    for (const perms of Object.values(ROLE_PERMISSIONS)) {
      for (const p of perms) expect(known.has(p)).toBe(true);
    }
  });
});
