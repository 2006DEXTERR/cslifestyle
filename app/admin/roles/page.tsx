'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, X, Edit, Plus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi, AdminApiError, type AdminRole } from '@/lib/api/admin';

const modules = [
  'Products',
  'Categories',
  'Brands',
  'Guides',
  'Comparisons',
  'Authors',
  'Users',
  'Settings',
];

const actions = ['View', 'Create', 'Edit', 'Delete', 'Publish'];

/** Colours preserved from the original design; cycled across live roles. */
const roleColors = ['#E91E8F', '#FF7A00', '#FFC107', '#4CAF50', '#9C27B0'];

const ADMIN_ROLE = 'admin';

function titleCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function hasPermission(permissions: Set<string>, moduleLabel: string, actionLabel: string): boolean {
  return permissions.has(`${moduleLabel.toLowerCase()}.${actionLabel.toLowerCase()}`);
}

/** Group a flat permission-name list into `{ module: names[] }`, preserving order. */
function groupByModule(names: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const name of [...names].sort()) {
    const mod = name.split('.')[0];
    (groups[mod] ??= []).push(name);
  }
  return groups;
}

export default function RolesAdminPage() {
  const [roles, setRoles] = React.useState<AdminRole[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Editor state: `null` closed, `'new'` create, or a role being edited.
  const [editing, setEditing] = React.useState<AdminRole | 'new' | null>(null);
  const [form, setForm] = React.useState<{ name: string; description: string; permissions: Set<string> }>({
    name: '',
    description: '',
    permissions: new Set(),
  });
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    adminApi
      .listRoles()
      .then((r) => { setRoles(r); setLoadError(null); })
      .catch(() => setLoadError('Could not load roles. Check your connection or permissions and retry.'));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // The admin role holds every permission, so it is the source of the full catalog.
  // Fallback to the union of all roles if no admin role is present.
  const allPermissions = React.useMemo(() => {
    const admin = roles.find((r) => r.name === ADMIN_ROLE);
    const names = admin ? admin.permissions : Array.from(new Set(roles.flatMap((r) => r.permissions)));
    return groupByModule(names);
  }, [roles]);

  function openCreate() {
    setForm({ name: '', description: '', permissions: new Set() });
    setFormError(null);
    setEditing('new');
  }

  function openEdit(role: AdminRole) {
    setForm({ name: role.name, description: role.description ?? '', permissions: new Set(role.permissions) });
    setFormError(null);
    setEditing(role);
  }

  function togglePermission(name: string) {
    setForm((f) => {
      const next = new Set(f.permissions);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { ...f, permissions: next };
    });
  }

  function toggleModule(names: string[], allOn: boolean) {
    setForm((f) => {
      const next = new Set(f.permissions);
      for (const n of names) {
        if (allOn) next.delete(n);
        else next.add(n);
      }
      return { ...f, permissions: next };
    });
  }

  const isAdminRole = editing !== null && editing !== 'new' && editing.name === ADMIN_ROLE;

  async function handleSave() {
    setFormError(null);
    const permissions = Array.from(form.permissions);
    try {
      setSaving(true);
      if (editing === 'new') {
        const name = form.name.trim().toLowerCase();
        if (!/^[a-z][a-z0-9_-]*$/.test(name)) {
          setSaving(false);
          return setFormError('Role name must be lowercase letters, numbers, hyphens or underscores.');
        }
        await adminApi.createRole({ name, description: form.description.trim() || undefined, permissions });
      } else if (editing) {
        await adminApi.updateRole(editing.id, {
          description: form.description.trim(),
          ...(editing.name === ADMIN_ROLE ? {} : { permissions }),
        });
      }
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles &amp; Permissions</h1>
          <p className="text-muted-foreground">Manage user roles and their access permissions</p>
        </div>
        <Button className="bg-brand-gradient hover:opacity-90" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Role
        </Button>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">{loadError}</div>
      )}

      {/* Roles Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role, index) => {
          const color = roleColors[index % roleColors.length];
          const admin = role.name === ADMIN_ROLE;
          return (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl border bg-card"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
                  <Shield className="w-5 h-5" style={{ color }} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold">{titleCase(role.name)}</h3>
                  <p className="text-xs text-muted-foreground truncate">{role.description || `${role.userCount} user(s)`}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => openEdit(role)}
                title={admin ? 'The admin role always has full access; only its description is editable' : 'Edit permissions'}
              >
                {admin ? <Lock className="w-3.5 h-3.5 mr-2" /> : <Edit className="w-3.5 h-3.5 mr-2" />}
                {admin ? 'View / Description' : 'Edit Permissions'}
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Permission Matrix */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b bg-muted/50">
          <h2 className="font-semibold">Permission Matrix</h2>
          <p className="text-sm text-muted-foreground">Configure access levels for each role</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Module</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {modules.map((module) => (
                <tr key={module} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{module}</td>
                  <td className="px-4 py-3">
                    <div className="grid grid-cols-4 gap-2">
                      {roles.map((role) => {
                        const permissionSet = new Set(role.permissions);
                        return (
                          <div key={role.id} className="space-y-1">
                            <p className="text-xs text-muted-foreground mb-1">{titleCase(role.name)}</p>
                            <div className="flex gap-0.5">
                              {actions.slice(0, 4).map((action) => (
                                <div
                                  key={action}
                                  className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                                    hasPermission(permissionSet, module, action)
                                      ? 'bg-green-500/10 text-green-600'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                  title={`${titleCase(role.name)} - ${module} - ${action}`}
                                >
                                  {hasPermission(permissionSet, module, action) ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <X className="w-3.5 h-3.5" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Editor */}
      <AnimatePresence>
        {editing !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setEditing(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 h-screen w-full max-w-2xl bg-background border-l overflow-auto flex flex-col"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
                <h2 className="text-lg font-semibold">
                  {editing === 'new' ? 'Add Role' : `Edit ${titleCase(editing.name)}`}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setEditing(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-auto p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role Name</label>
                  <Input
                    value={form.name}
                    disabled={editing !== 'new'}
                    placeholder="e.g. content-manager"
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  {editing === 'new' && (
                    <p className="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens or underscores.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={form.description}
                    placeholder="What this role can do"
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Permissions</label>
                  {isAdminRole ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      The admin role always has full access — its permissions can’t be changed.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(allPermissions).map(([module, names]) => {
                        const allOn = names.every((n) => form.permissions.has(n));
                        return (
                          <div key={module} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold capitalize">{module}</p>
                              <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => toggleModule(names, allOn)}
                              >
                                {allOn ? 'Clear' : 'Select all'}
                              </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {names.map((name) => (
                                <label key={name} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={form.permissions.has(name)}
                                    onChange={() => togglePermission(name)}
                                  />
                                  <span className="truncate" title={name}>{name.split('.').slice(1).join('.')}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {formError && <p className="text-sm text-red-600">{formError}</p>}
              </div>

              <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t bg-background">
                <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button className="bg-brand-gradient" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : editing === 'new' ? 'Create Role' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
