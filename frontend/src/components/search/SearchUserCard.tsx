import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, User } from 'lucide-react';

interface SearchUserCardProps {
  user: {
    id: number;
    name: string;
    role_name?: string;
    role_slug?: string;
    status?: string;
  };
}

const roleConfig: Record<string, { color: string; icon: any }> = {
  admin: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: Shield },
  manager: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Shield },
  reporter: { color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: User },
  client: { color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: User },
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const iconBg: Record<string, string> = {
  admin: 'bg-red-500/10',
  manager: 'bg-blue-500/10',
  reporter: 'bg-green-500/10',
  client: 'bg-purple-500/10',
};

const iconColor: Record<string, string> = {
  admin: 'text-red-400',
  manager: 'text-blue-400',
  reporter: 'text-green-400',
  client: 'text-purple-400',
};

const SearchUserCard = ({ user }: SearchUserCardProps) => {
  const config = roleConfig[user.role_slug || ''] || roleConfig.reporter;
  const RoleIcon = config.icon;
  return (
    <Card className="p-4 bg-surface rounded-lg border border-outline-variant">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full flex-shrink-0 ${iconBg[user.role_slug || ''] || 'bg-green-500/10'}`}>
          <RoleIcon className={`w-5 h-5 ${iconColor[user.role_slug || ''] || 'text-green-400'}`} />
        </div>
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <h4 className="text-sm font-medium text-on-surface truncate">{user.name}</h4>
          {user.role_slug && (
            <Badge className={`text-xs flex-shrink-0 ${config.color}`}>
              {user.role_name || user.role_slug}
            </Badge>
          )}
          {user.status && (
            <Badge className={`text-xs flex-shrink-0 ${statusColors[user.status] || ''}`}>
              {user.status}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SearchUserCard;
