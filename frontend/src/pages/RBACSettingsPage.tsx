import { useState, useEffect } from 'react';
import { Shield, Users, Key, Lock, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoleRequestsDashboard } from '@/components/manager/RoleRequestsDashboard';
import axios from '@/api/axios';
import { useAuth } from '@/contexts/AuthContext';

interface Permission {
  id: number;
  name: string;
  slug: string;
  description: string;
  module: string;
}

interface Role {
  id: number;
  name: string;
  slug: string;
  description: string;
  user_count: number;
  permissions: Permission[];
}

const moduleColors: Record<string, string> = {
  dashboard: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  users: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  projects: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  findings: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  comments: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  evidence: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  reports: 'text-green-400 bg-green-500/10 border-green-500/20',
  templates: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  clients: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  role_requests: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  rbac: 'text-primary bg-primary/10 border-primary/20',
};

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-400 border-red-500/20',
  manager: 'bg-primary/10 text-primary border-primary/20',
  reporter: 'bg-green-500/10 text-green-400 border-green-500/20',
  client: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const RBACSettingsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<{ all: Permission[]; grouped: Record<string, Permission[]> }>({ all: [], grouped: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        axios.get('/roles'),
        axios.get('/roles/permissions'),
      ]);
      setRoles(rolesRes.data.data);
      setPermissions(permsRes.data.data);
    } catch (error) {
      console.error('Failed to load RBAC data', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasPermission('manage_roles')) {
    return (
      <div className="min-h-screen bg-surface p-6 flex items-center justify-center">
        <Card className="p-8 bg-surface-high border-outline text-center max-w-md">
          <Shield className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-on-surface mb-2">Access Denied</h2>
          <p className="text-on-surface-variant text-sm">
            You do not have permission to manage roles. Only administrators can access this page.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
              RBAC Settings
            </h1>
          </div>
          <p className="text-sm md:text-base text-on-surface-variant">
            Manage roles, permissions, and access control
          </p>
        </div>

        {/* Security Status Banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold text-primary">Security Status: Active</h3>
            <p className="text-sm text-primary/80">All security policies are properly configured and enforced</p>
          </div>
        </div>

        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="bg-surface-high p-1 mb-6">
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Role Requests
            </TabsTrigger>
          </TabsList>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <Card className="p-6 bg-surface-high border-outline">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-on-surface">Role Management</h2>
                  <p className="text-sm text-on-surface-variant mt-1">
                    {roles.length} roles configured
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="border border-outline rounded-lg overflow-hidden hover:border-primary/30 transition-colors"
                  >
                    <button
                      onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                      className="w-full text-left p-4 bg-surface-bright hover:bg-surface-highest transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-on-surface">{role.name}</h3>
                            <Badge className={`text-xs ${roleBadgeColors[role.slug] || roleBadgeColors.client}`}>
                              {role.slug.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-on-surface-variant">{role.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {role.user_count} users
                            </span>
                            <span className="flex items-center gap-1">
                              <Key className="w-4 h-4" />
                              {role.permissions.length} permissions
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {expandedRole === role.id ? (
                            <EyeOff className="w-5 h-5 text-on-surface-variant" />
                          ) : (
                            <Eye className="w-5 h-5 text-on-surface-variant" />
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedRole === role.id && (
                      <div className="p-4 border-t border-outline bg-surface">
                        <h4 className="text-sm font-medium text-on-surface-variant mb-3 uppercase tracking-wider">
                          Assigned Permissions
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {role.permissions.map((perm) => (
                            <Badge
                              key={perm.id}
                              variant="outline"
                              className={`text-xs border ${moduleColors[perm.module] || 'text-on-surface-variant border-outline'}`}
                            >
                              {perm.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <Card className="p-6 bg-surface-high border-outline">
              <h2 className="text-xl font-semibold text-on-surface mb-6">Permission Registry</h2>

              {Object.entries(permissions.grouped).length === 0 ? (
                <p className="text-on-surface-variant text-sm">No permissions found</p>
              ) : (
                <div className="space-y-8">
                  {Object.entries(permissions.grouped).map(([module, perms]) => (
                    <div key={module}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`px-3 py-1 rounded text-xs font-medium border ${moduleColors[module.toLowerCase()] || 'text-on-surface-variant border-outline'}`}>
                          {module.toUpperCase()}
                        </div>
                        <span className="text-xs text-on-surface-variant">
                          {perms.length} permission{perms.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {perms.map((perm: Permission) => (
                          <div
                            key={perm.id}
                            className="border border-outline rounded-lg p-3 bg-surface hover:border-primary/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="text-sm font-medium text-on-surface truncate">{perm.name}</h4>
                                <p className="text-xs text-on-surface-variant mt-1">{perm.description}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-xs shrink-0 border ${moduleColors[perm.module] || 'text-on-surface-variant border-outline'}`}
                              >
                                {roles.filter(r => r.permissions.some(p => p.id === perm.id)).length}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Role Requests Tab */}
          <TabsContent value="requests">
            <RoleRequestsDashboard />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
};

export default RBACSettingsPage;
