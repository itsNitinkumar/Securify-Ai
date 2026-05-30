import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Shield } from 'lucide-react';
import { userApi } from '@/api/userApi';
import { authApi } from '@/api/authApi';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import UsersTable from '@/components/users/UsersTable';
import { toast } from 'react-hot-toast';
import InlineConfirm from '@/components/ui/inline-confirm';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

const UsersManagementPage = () => {
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userApi.getAll();
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (userId: number) => {
    navigate(`/users/${userId}/approve`);
  };

  const handleEdit = (user: User) => {
    navigate(`/users/${user.id}/edit`);
  };

  const handleDelete = async (userId: number) => {
    try {
      setDeletingUserId(userId);
      await userApi.delete(userId);
      toast.success('User deleted');
      loadUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
      setConfirmDeleteUserId((current) => (current === userId ? null : current));
    }
  };

  const stats = {
    total: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    active: users.filter(u => u.status === 'active').length,
    managers: users.filter(u => u.role === 'manager').length,
  };

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
                User Management
              </h1>
            </div>
            <p className="text-sm md:text-base text-on-surface-variant">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          {(hasPermission('manage_roles') || hasRole('admin')) && (
            <Button
              onClick={() => navigate('/users/create-manager')}
              className="bg-primary text-surface hover:bg-primary/90 w-full md:w-auto"
            >
              <Shield className="w-4 h-4 mr-2" />
              Create Manager
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant uppercase">Total Users</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-on-surface font-technical">
            {stats.total}
          </div>
        </Card>

        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant uppercase">Pending</span>
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-yellow-400 font-technical">
            {stats.pending}
          </div>
        </Card>

        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant uppercase">Active</span>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-on-surface font-technical">
            {stats.active}
          </div>
        </Card>

        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant uppercase">Managers</span>
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-primary font-technical">
            {stats.managers}
          </div>
        </Card>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-on-surface-variant">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <Card className="p-12 text-center bg-surface-high border-outline">
          <Users className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-on-surface mb-2">No users found</h3>
          <p className="text-on-surface-variant mb-4">
            Users will appear here once they sign up
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {confirmDeleteUserId !== null ? (
            <InlineConfirm
              danger
              title="Delete user?"
              description="This action cannot be undone."
              confirmText="Delete"
              busy={deletingUserId === confirmDeleteUserId}
              onCancel={() => setConfirmDeleteUserId(null)}
              onConfirm={() => void handleDelete(confirmDeleteUserId)}
            />
          ) : null}
          <UsersTable
            users={users}
            onEdit={handleEdit}
            onDelete={
              hasPermission('delete_users') || hasRole('admin')
                ? (userId) => setConfirmDeleteUserId(userId)
                : undefined
            }
            onApprove={handleApprove}
          />
        </div>
      )}
    </div>
  );
};

export default UsersManagementPage;
