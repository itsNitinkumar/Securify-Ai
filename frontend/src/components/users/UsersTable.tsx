import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Mail, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete?: (userId: number) => void;
  onApprove?: (userId: number) => void;
}

const roleColors = {
  analyst: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  reviewer: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  manager: 'bg-primary/10 text-primary border-primary/20',
  client: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const statusColors = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const statusIcons = {
  active: CheckCircle,
  pending: Clock,
  suspended: XCircle,
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const UsersTable = ({ users, onEdit, onDelete, onApprove }: UsersTableProps) => {
  const StatusIcon = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || Clock;
    return <Icon className="w-3 h-3" />;
  };

  return (
    <>
      {/* Desktop Table View */}
      <Card className="hidden md:block bg-surface-high border-outline overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface">
                <th className="text-left py-3 px-4 text-xs font-medium text-on-surface-variant uppercase">
                  User
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-on-surface-variant uppercase">
                  Email
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-on-surface-variant uppercase">
                  Role
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-on-surface-variant uppercase">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-on-surface-variant uppercase">
                  Created
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-on-surface-variant uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-outline-variant hover:bg-surface transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-on-surface">{user.name}</p>
                        <p className="text-xs text-on-surface-variant">ID: {user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-on-surface-variant" />
                      <span className="text-sm text-on-surface">{user.email}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      className={`text-xs ${
                        roleColors[user.role as keyof typeof roleColors] || roleColors.client
                      }`}
                    >
                      {user.role?.toUpperCase() || 'USER'}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      className={`text-xs flex items-center gap-1 ${
                        statusColors[user.status as keyof typeof statusColors] || statusColors.active
                      }`}
                    >
                      {StatusIcon(user.status || 'active')}
                      {user.status?.toUpperCase() || 'ACTIVE'}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-on-surface-variant" />
                      <span className="text-sm text-on-surface-variant">
                        {formatDate(user.created_at)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {user.status === 'pending' && onApprove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onApprove(user.id)}
                          className="text-green-400 hover:text-green-300"
                          title="Approve User"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(user)}
                          className="text-primary hover:text-primary/80"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(user.id)}
                          className="text-error hover:text-error/80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {users.map((user) => (
          <Card key={user.id} className="p-4 bg-surface-high border-outline">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-primary">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface mb-1">{user.name}</p>
                  <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Badge
                  className={`text-xs flex-shrink-0 ${
                    roleColors[user.role as keyof typeof roleColors] || roleColors.client
                  }`}
                >
                  {user.role?.toUpperCase() || 'USER'}
                </Badge>
                <Badge
                  className={`text-xs flex items-center gap-1 flex-shrink-0 ${
                    statusColors[user.status as keyof typeof statusColors] || statusColors.active
                  }`}
                >
                  {StatusIcon(user.status || 'active')}
                  {user.status?.toUpperCase() || 'ACTIVE'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
              <span className="text-xs text-on-surface-variant">
                Created {formatDate(user.created_at)}
              </span>
              <div className="flex gap-2">
                {user.status === 'pending' && onApprove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onApprove(user.id)}
                    className="text-green-400 hover:text-green-300"
                    title="Approve User"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(user)}
                    className="text-primary hover:text-primary/80"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(user.id)}
                    className="text-error hover:text-error/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
};

export default UsersTable;
