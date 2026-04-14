import { RecentActivity } from '@/api/dashboardApi';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

interface ActivityLogTableProps {
  activities: RecentActivity[];
}

const getActionColor = (action: string) => {
  if (action.includes('create')) return 'bg-primary/10 text-primary border-primary/20';
  if (action.includes('update') || action.includes('edit')) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  if (action.includes('delete')) return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (action.includes('approve')) return 'bg-green-500/10 text-green-400 border-green-500/20';
  return 'bg-surface-variant text-on-surface-variant border-outline-variant';
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const ActivityLogTable = ({ activities }: ActivityLogTableProps) => {
  return (
    <>
      {/* Desktop Table View */}
      <Card className="hidden md:block bg-surface-high border-outline overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface">
                <th className="text-left py-3 px-4 text-xs font-medium text-on-surface-variant uppercase">
                  Timestamp
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-on-surface-variant uppercase">
                  User
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-on-surface-variant uppercase">
                  Action
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-on-surface-variant uppercase">
                  Entity
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-on-surface-variant uppercase">
                  IP Address
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-on-surface-variant uppercase">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr
                  key={activity.id}
                  className="border-b border-outline-variant hover:bg-surface transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className="text-sm text-on-surface-variant font-mono">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        {activity.user_name}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        ID: {activity.user_id}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className={`text-xs ${getActionColor(activity.action)}`}>
                      {activity.action.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-sm text-on-surface">{activity.entity_type}</p>
                      {activity.entity_id && (
                        <p className="text-xs text-on-surface-variant">
                          ID: {activity.entity_id}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-on-surface-variant font-mono">
                      {activity.ip_address || 'N/A'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {activity.details && (
                      <button className="text-primary hover:text-primary/80 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {activities.map((activity) => (
          <Card
            key={activity.id}
            className="p-4 bg-surface-high border-outline"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface mb-1">
                  {activity.user_name}
                </p>
                <p className="text-xs text-on-surface-variant font-mono">
                  {formatTimestamp(activity.timestamp)}
                </p>
              </div>
              <Badge className={`text-xs flex-shrink-0 ${getActionColor(activity.action)}`}>
                {activity.action.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface-variant">Entity:</span>
                <span className="text-on-surface">{activity.entity_type}</span>
              </div>
              {activity.entity_id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant">Entity ID:</span>
                  <span className="text-on-surface font-mono">{activity.entity_id}</span>
                </div>
              )}
              {activity.ip_address && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant">IP:</span>
                  <span className="text-on-surface font-mono">{activity.ip_address}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
};

export default ActivityLogTable;
