'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Shield, Check, X, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

const rolesData = [
  {
    name: 'Super Admin',
    description: 'Full access to all features and settings',
    color: '#E91E8F',
    permissions: modules.reduce((acc, m) => {
      acc[m] = { View: true, Create: true, Edit: true, Delete: true, Publish: true };
      return acc;
    }, {} as Record<string, Record<string, boolean>>),
  },
  {
    name: 'Editor',
    description: 'Can create, edit and publish content',
    color: '#FF7A00',
    permissions: {
      Products: { View: true, Create: true, Edit: true, Delete: false, Publish: true },
      Categories: { View: true, Create: false, Edit: false, Delete: false, Publish: false },
      Brands: { View: true, Create: false, Edit: false, Delete: false, Publish: false },
      Guides: { View: true, Create: true, Edit: true, Delete: false, Publish: true },
      Comparisons: { View: true, Create: true, Edit: true, Delete: false, Publish: true },
      Authors: { View: true, Create: false, Edit: false, Delete: false, Publish: false },
      Users: { View: false, Create: false, Edit: false, Delete: false, Publish: false },
      Settings: { View: false, Create: false, Edit: false, Delete: false, Publish: false },
    },
  },
  {
    name: 'SEO Manager',
    description: 'Can manage SEO settings for content',
    color: '#FFC107',
    permissions: {
      Products: { View: true, Create: false, Edit: true, Delete: false, Publish: false },
      Categories: { View: true, Create: false, Edit: true, Delete: false, Publish: false },
      Brands: { View: true, Create: false, Edit: true, Delete: false, Publish: false },
      Guides: { View: true, Create: false, Edit: true, Delete: false, Publish: false },
      Comparisons: { View: true, Create: false, Edit: true, Delete: false, Publish: false },
      Authors: { View: true, Create: false, Edit: false, Delete: false, Publish: false },
      Users: { View: false, Create: false, Edit: false, Delete: false, Publish: false },
      Settings: { View: true, Create: false, Edit: true, Delete: false, Publish: false },
    },
  },
  {
    name: 'Analyst',
    description: 'Can view analytics and reports',
    color: '#4CAF50',
    permissions: {
      Products: { View: true, Create: false, Edit: false, Delete: false, Publish: false },
      Categories: { View: true, Create: false, Edit: false, Delete: false, Publish: false },
      Brands: { View: true, Create: false, Edit: false, Delete: false, Publish: false },
      Guides: { View: true, Create: false, Edit: false, Delete: false, Publish: false },
      Comparisons: { View: true, Create: false, Edit: false, Delete: false, Publish: false },
      Authors: { View: true, Create: false, Edit: false, Delete: false, Publish: false },
      Users: { View: false, Create: false, Edit: false, Delete: false, Publish: false },
      Settings: { View: true, Create: false, Edit: false, Delete: false, Publish: false },
    },
  },
];

export default function RolesAdminPage() {
  const [editingRole, setEditingRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState(rolesData);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-muted-foreground">Manage user roles and their access permissions</p>
        </div>
        <Button className="bg-brand-gradient hover:opacity-90">
          Add Role
        </Button>
      </div>

      {/* Roles Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {rolesData.map((role, index) => (
          <motion.div
            key={role.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-xl border bg-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: role.color + '20' }}
              >
                <Shield className="w-5 h-5" style={{ color: role.color }} />
              </div>
              <div>
                <h3 className="font-semibold">{role.name}</h3>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-2">
              <Edit className="w-3.5 h-3.5 mr-2" />
              Edit Permissions
            </Button>
          </motion.div>
        ))}
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
                      {rolesData.map((role) => (
                        <div key={role.name} className="space-y-1">
                          <p className="text-xs text-muted-foreground mb-1">{role.name}</p>
                          <div className="flex gap-0.5">
                            {actions.slice(0, 4).map((action) => (
                              <div
                                key={action}
                                className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                                  role.permissions[module]?.[action]
                                    ? 'bg-green-500/10 text-green-600'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                                title={`${role.name} - ${module} - ${action}`}
                              >
                                {role.permissions[module]?.[action] ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
