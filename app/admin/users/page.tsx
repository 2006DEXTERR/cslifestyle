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

const mockUsers = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@cslifestyle.in',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=100',
    role: 'Super Admin',
    status: 'active',
    lastLogin: '2024-01-22 10:30',
  },
  {
    id: '2',
    name: 'Priya Sharma',
    email: 'priya@cslifestyle.in',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=100',
    role: 'Editor',
    status: 'active',
    lastLogin: '2024-01-21 14:20',
  },
  {
    id: '3',
    name: 'Rahul Verma',
    email: 'rahul@cslifestyle.in',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?w=100',
    role: 'Editor',
    status: 'active',
    lastLogin: '2024-01-20 09:15',
  },
  {
    id: '4',
    name: 'Amit Kumar',
    email: 'amit@cslifestyle.in',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=100',
    role: 'SEO Manager',
    status: 'active',
    lastLogin: '2024-01-19 16:45',
  },
  {
    id: '5',
    name: 'Sneha Patel',
    email: 'sneha@cslifestyle.in',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=100',
    role: 'Analyst',
    status: 'inactive',
    lastLogin: '2023-12-15 11:00',
  },
];

export default function UsersAdminPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [rolFilter, setRoleFilter] = React.useState('');
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<typeof mockUsers[0] | null>(null);

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !rolFilter || user.role === rolFilter;
    return matchesSearch && matchesRole;
  });

  const roles = ['Super Admin', 'Editor', 'SEO Manager', 'Analyst'];

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
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
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
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active'
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-gray-500/10 text-gray-600'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {user.lastLogin}
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
                  <Input defaultValue={editingUser?.name} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" defaultValue={editingUser?.email} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <select className="w-full h-10 rounded-lg border bg-background px-3" defaultValue={editingUser?.role}>
                    {roles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select className="w-full h-10 rounded-lg border bg-background px-3" defaultValue={editingUser?.status}>
                    <option>active</option>
                    <option>inactive</option>
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
                <Button className="bg-brand-gradient">Save User</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
