import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield } from 'lucide-react';
import { userApi } from '@/api/userApi';
import { authApi } from '@/api/authApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import UsersTable from '@/components/users/UsersTable';
import ApproveUserDialog from '@/components/users/ApproveUserDialog';
import CreateManagerDialog from '@/components/users/CreateManagerDialog';

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isCreateManagerOpen, setIsCreateManagerOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await authApi.getProfile();
      setCurrentUserRole(response.data.data?.role || '');
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

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
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setIsApproveDialogOpen(true);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsApproveDialogOpen(true);
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await userApi.delete(userId);
      alert('User deleted successfully');
      loadUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      alert(error.response?.data?.message || 'Failed to delete user');
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
          {/* Admin only: Create Manager button */}
          {currentUserRole === 'admin' && (
            <Button
              onClick={() => setIsCreateManagerOpen(true)}
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
        <UsersTable
          users={users}
          onEdit={handleEdit}
          onDelete={currentUserRole === 'admin' ? handleDelete : undefined}
          onApprove={handleApprove}
        />
      )}

      {/* Dialogs */}
      {selectedUser && (
        <ApproveUserDialog
          user={selectedUser}
          currentUserRole={currentUserRole}
          open={isApproveDialogOpen}
          onOpenChange={setIsApproveDialogOpen}
          onSuccess={loadUsers}
        />
      )}

      <CreateManagerDialog
        open={isCreateManagerOpen}
        onOpenChange={setIsCreateManagerOpen}
        onSuccess={loadUsers}
      />
    </div>
  );
};

export default UsersManagementPage;
