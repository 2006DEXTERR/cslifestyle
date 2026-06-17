'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Mail,
  Shield,
  MoreHorizontal,
  X,
  Clock,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi, type AdminUser, type AdminRole } from '@/lib/api/admin';

function formatLastLogin(value: string | null): string {
  if (!value) return 'Never';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Never' : d.toLocaleString();
}

export default function UsersAdminPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [rolFilter, setRoleFilter] = React.useState('');
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AdminUser | null>(null);

  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [roleList, setRoleList] = React.useState<AdminRole[]>([]);
  const [form, setForm] = React.useState({ name: '', email: '', roleId: '', status: 'active' });
  const [saving, setSaving] = React.useState(false);

  const loadUsers = React.useCallback(() => {
    adminApi
      .listUsers({ perPage: 100 })
      .then((r) => setUsers(r.items))
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    loadUsers();
    adminApi.listRoles().then(setRoleList).catch(() => undefined);
  }, [loadUsers]);

  React.useEffect(() => {
    if (!isEditorOpen) return;
    setForm({
      name: editingUser?.name ?? '',
      email: editingUser?.email ?? '',
      roleId: editingUser?.roleId ?? roleList[0]?.id ?? '',
      status: editingUser?.status ?? 'active',
    });
  }, [isEditorOpen, editingUser, roleList]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !rolFilter || user.role === rolFilter;
    return matchesSearch && matchesRole;
  });

  const roles = roleList.map((r) => r.name);

  async function handleSave() {
    if (!editingUser) {
      setIsEditorOpen(false);
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateUser(editingUser.id, {
        name: form.name,
        email: form.email,
        roleId: form.roleId,
      });
      const nextActive = form.status === 'active';
      if (nextActive !== (editingUser.status === 'active')) {
        await adminApi.setUserStatus(editingUser.id, nextActive);
      }
      loadUsers();
      setIsEditorOpen(false);
    } catch {
      // keep the drawer open on failure
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: AdminUser) {
    try {
      await adminApi.setUserStatus(user.id, user.status !== 'active');
      loadUsers();
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage admin users and permissions</p>
        </div>
        <Button
          className="bg-brand-gradient hover:opacity-90"
          onClick={() => {
            setEditingUser(null);
            setIsEditorOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-lg border bg-background px-3"
          value={rolFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {roles.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border bg-card">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Last Login</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                        {user.name[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{user.role}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleStatus(user)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active'
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-gray-500/10 text-gray-600'
                    }`}
                  >
                    {user.status}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatLastLogin(user.lastLogin)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingUser(user);
                        setIsEditorOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Editor */}
      <AnimatePresence>
        {isEditorOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setIsEditorOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 h-screen w-full max-w-lg bg-background border-l overflow-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
                <h2 className="text-lg font-semibold">
                  {editingUser ? 'Edit User' : 'Add User'}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsEditorOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <select
                    className="w-full h-10 rounded-lg border bg-background px-3"
                    value={form.roleId}
                    onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
                  >
                    {roleList.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="w-full h-10 rounded-lg border bg-background px-3"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input type="password" placeholder="Enter new password" />
                  <p className="text-xs text-muted-foreground">Leave empty to keep current password</p>
                </div>
              </div>

              <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t bg-background">
                <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-brand-gradient" onClick={handleSave} disabled={saving}>
                  Save User
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
