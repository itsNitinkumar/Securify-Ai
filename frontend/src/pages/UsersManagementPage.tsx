import { useState, useEffect } from 'react';
import { Users, Search, Plus, UserPlus, Shield } from 'lucide-react';
import { userApi } from '@/api/userApi';
import { authApi } from '@/api/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UsersTable from '@/components/users/UsersTable';
import CreateUserDialog from '@/components/users/CreateUserDialog';
import EditUserDialog from '@/components/users/EditUserDialog';
import ApproveUserDialog from '@/components/users/ApproveUserDialog';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'analyst' | 'reviewer' | 'manager' | 'client';
  status?: 'pending' | 'active' | 'suspended';
  created_at: string;
  updated_at: string;
}

const UsersManagementPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToApprove, setUserToApprove] = useState<User | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserRole) {
      loadUsers();
    }
  }, [currentUserRole]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  const loadCurrentUser = async () => {
    try {
      const response = await authApi.getProfile();
      setCurrentUserRole(response.data.data?.role || '');
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadUsers = async () => {
    // Only managers can view users
    if (currentUserRole !== 'manager') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await userApi.getAll();
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.role?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await userApi.delete(userId);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const handleApproveUser = async (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setUserToApprove(user);
      setIsApproveOpen(true);
    }
  };

  const stats = {
    total: users.length,
    pending: users.filter((u) => u.status === 'pending').length,
    analysts: users.filter((u) => u.role === 'analyst').length,
    reviewers: users.filter((u) => u.role === 'reviewer').length,
    managers: users.filter((u) => u.role === 'manager').length,
    clients: users.filter((u) => u.role === 'client').length,
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
                Users Management
              </h1>
            </div>
            <p className="text-sm md:text-base text-on-surface-variant">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          {currentUserRole === 'manager' && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary text-surface hover:bg-primary/90 w-full md:w-auto"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
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
            <Badge variant="outline" className="text-xs border-yellow-500/20 text-yellow-400">
              {stats.pending}
            </Badge>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-yellow-400 font-technical">
            {stats.pending}
          </div>
        </Card>

        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant uppercase">Analysts</span>
            <Badge variant="outline" className="text-xs border-outline-variant">
              {stats.analysts}
            </Badge>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-on-surface font-technical">
            {stats.analysts}
          </div>
        </Card>

        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant uppercase">Reviewers</span>
            <Badge variant="outline" className="text-xs border-outline-variant">
              {stats.reviewers}
            </Badge>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-on-surface font-technical">
            {stats.reviewers}
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

        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant uppercase">Clients</span>
            <Badge variant="outline" className="text-xs border-outline-variant">
              {stats.clients}
            </Badge>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-on-surface font-technical">
            {stats.clients}
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4 md:p-6 bg-surface-high border-outline mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
            <Input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface border-outline text-on-surface"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {['all', 'analyst', 'reviewer', 'manager', 'client'].map((role) => (
              <Badge
                key={role}
                variant={roleFilter === role ? 'default' : 'outline'}
                className={`cursor-pointer whitespace-nowrap ${
                  roleFilter === role
                    ? 'bg-primary text-surface'
                    : 'border-outline text-on-surface-variant hover:border-primary'
                }`}
                onClick={() => setRoleFilter(role)}
              >
                {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Users Table */}
      {loading ? (
        <Card className="p-12 text-center bg-surface-high border-outline">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-on-surface-variant">Loading users...</p>
        </Card>
      ) : currentUserRole !== 'manager' ? (
        <Card className="p-12 text-center bg-surface-high border-outline">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-error" />
          </div>
          <h3 className="text-lg font-semibold text-on-surface mb-2">Access Restricted</h3>
          <p className="text-on-surface-variant mb-4">
            Only managers can access user management features.
          </p>
          <p className="text-sm text-on-surface-variant">
            Your current role: <span className="font-medium text-primary">{currentUserRole || 'Unknown'}</span>
          </p>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card className="p-12 text-center bg-surface-high border-outline">
          <Users className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-on-surface mb-2">No users found</h3>
          <p className="text-on-surface-variant mb-4">
            {searchQuery || roleFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first user'}
          </p>
          {!searchQuery && roleFilter === 'all' && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary text-surface hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          )}
        </Card>
      ) : (
        <UsersTable
          users={filteredUsers}
          onEdit={currentUserRole === 'manager' ? handleEditUser : undefined}
          onDelete={currentUserRole === 'manager' ? handleDeleteUser : undefined}
          onApprove={currentUserRole === 'manager' ? handleApproveUser : undefined}
        />
      )}

      {/* Dialogs */}
      <CreateUserDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={loadUsers}
      />

      {selectedUser && (
        <EditUserDialog
          user={selectedUser}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSuccess={loadUsers}
        />
      )}

      {userToApprove && (
        <ApproveUserDialog
          user={userToApprove}
          open={isApproveOpen}
          onOpenChange={setIsApproveOpen}
          onSuccess={loadUsers}
        />
      )}
    </div>
  );
};

export default UsersManagementPage;
