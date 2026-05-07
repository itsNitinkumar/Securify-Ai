import React, { useState } from 'react';
import InlineConfirm from '@/components/ui/inline-confirm';
import { Shield, Users, Lock, Key, AlertTriangle, CheckCircle, Plus, Edit2, Trash2, Save, X, UserCog } from 'lucide-react';
import { RoleRequestsDashboard } from '@/components/manager/RoleRequestsDashboard';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
  isSystem: boolean;
}

const RBACSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'audit' | 'requests'>('roles');
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [confirmDeleteRoleId, setConfirmDeleteRoleId] = useState<string | null>(null);

  // Mock data
  const permissions: Permission[] = [
    { id: 'p1', name: 'view_projects', description: 'View all projects', category: 'Projects' },
    { id: 'p2', name: 'create_projects', description: 'Create new projects', category: 'Projects' },
    { id: 'p3', name: 'edit_projects', description: 'Edit project details', category: 'Projects' },
    { id: 'p4', name: 'delete_projects', description: 'Delete projects', category: 'Projects' },
    { id: 'p5', name: 'view_findings', description: 'View findings', category: 'Findings' },
    { id: 'p6', name: 'create_findings', description: 'Create findings', category: 'Findings' },
    { id: 'p7', name: 'edit_findings', description: 'Edit findings', category: 'Findings' },
    { id: 'p8', name: 'delete_findings', description: 'Delete findings', category: 'Findings' },
    { id: 'p9', name: 'manage_users', description: 'Manage user accounts', category: 'Users' },
    { id: 'p10', name: 'manage_roles', description: 'Manage roles and permissions', category: 'Users' },
    { id: 'p11', name: 'view_reports', description: 'View reports', category: 'Reports' },
    { id: 'p12', name: 'generate_reports', description: 'Generate reports', category: 'Reports' },
  ];

  const [roles, setRoles] = useState<Role[]>([
    {
      id: 'r1',
      name: 'Admin',
      description: 'Full system access',
      userCount: 3,
      permissions: permissions.map(p => p.id),
      isSystem: true,
    },
    {
      id: 'r2',
      name: 'Security Analyst',
      description: 'Can manage projects and findings',
      userCount: 12,
      permissions: ['p1', 'p2', 'p3', 'p5', 'p6', 'p7', 'p11', 'p12'],
      isSystem: false,
    },
    {
      id: 'r3',
      name: 'Viewer',
      description: 'Read-only access',
      userCount: 25,
      permissions: ['p1', 'p5', 'p11'],
      isSystem: false,
    },
  ]);

  const auditLogs = [
    { id: 1, action: 'Role Created', user: 'admin@securify.ai', role: 'Security Analyst', timestamp: '2024-01-15 10:30:00' },
    { id: 2, action: 'Permission Added', user: 'admin@securify.ai', role: 'Viewer', timestamp: '2024-01-15 09:15:00' },
    { id: 3, action: 'Role Deleted', user: 'admin@securify.ai', role: 'Guest', timestamp: '2024-01-14 16:45:00' },
    { id: 4, action: 'Permission Removed', user: 'admin@securify.ai', role: 'Security Analyst', timestamp: '2024-01-14 14:20:00' },
  ];

  const handleDeleteRole = (roleId: string) => {
    setRoles(roles.filter(r => r.id !== roleId));
    setConfirmDeleteRoleId((current) => (current === roleId ? null : current));
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">RBAC Settings</h1>
          </div>
          <p className="text-gray-600">Manage roles, permissions, and access control</p>
        </div>

        {/* Security Status Banner */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">Security Status: Active</h3>
            <p className="text-sm text-green-700">All security policies are properly configured and enforced</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === 'roles'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Users className="w-4 h-4" />
              Roles
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === 'permissions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Key className="w-4 h-4" />
              Permissions
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === 'audit'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Lock className="w-4 h-4" />
              Audit Log
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === 'requests'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <UserCog className="w-4 h-4" />
              Role Requests
            </button>
          </div>

          {/* Roles Tab */}
          {activeTab === 'roles' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Role Management</h2>
                <button
                  onClick={() => setShowAddRole(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Role
                </button>
              </div>

              <div className="space-y-4">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                          {role.isSystem && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                              System Role
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {role.userCount} users
                          </span>
                          <span className="flex items-center gap-1">
                            <Key className="w-4 h-4" />
                            {role.permissions.length} permissions
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingRole(role.id)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!role.isSystem && (
                          <button
                            onClick={() => setConfirmDeleteRoleId(role.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {confirmDeleteRoleId === role.id ? (
                      <div className="mt-3">
                        <InlineConfirm
                          danger
                          title={`Delete role "${role.name}"?`}
                          description="This is mock data in the UI today, but treat it as destructive."
                          confirmText="Delete"
                          onCancel={() => setConfirmDeleteRoleId(null)}
                          onConfirm={() => handleDeleteRole(role.id)}
                        />
                      </div>
                    ) : null}

                    {/* Permission Pills */}
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.slice(0, 6).map((permId) => {
                        const perm = permissions.find(p => p.id === permId);
                        return perm ? (
                          <span
                            key={permId}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {perm.name}
                          </span>
                        ) : null;
                      })}
                      {role.permissions.length > 6 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          +{role.permissions.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Permission Registry</h2>

              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-blue-600" />
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map((perm) => (
                        <div
                          key={perm.id}
                          className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-1">{perm.name}</h4>
                              <p className="text-sm text-gray-600">{perm.description}</p>
                            </div>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              {roles.filter(r => r.permissions.includes(perm.id)).length} roles
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Log Tab */}
          {activeTab === 'audit' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Audit Log</h2>

              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Shield className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{log.action}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Role: <span className="font-medium">{log.role}</span>
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            By {log.user}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">{log.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role Requests Tab */}
          {activeTab === 'requests' && (
            <div className="p-6">
              <RoleRequestsDashboard />
            </div>
          )}
        </div>

        {/* Security Recommendations */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">Security Recommendations</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Review role permissions quarterly to ensure least privilege access</li>
                <li>• Enable multi-factor authentication for all admin accounts</li>
                <li>• Monitor audit logs regularly for suspicious activity</li>
                <li>• Implement session timeout policies for inactive users</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RBACSettingsPage;
