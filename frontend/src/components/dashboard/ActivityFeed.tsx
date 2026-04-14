import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { RecentActivity } from '@/api/dashboardApi';

interface ActivityFeedProps {
  activities: RecentActivity[];
}

const getActionColor = (action: string) => {
  if (action.includes('approve') || action.includes('create')) return 'text-primary';
  if (action.includes('delete') || action.includes('reject')) return 'text-error';
  if (action.includes('update') || action.includes('edit')) return 'text-yellow-400';
  return 'text-on-surface-variant';
};

const getActionIcon = (action: string) => {
  if (action.includes('approve')) return '✓';
  if (action.includes('create')) return '+';
  if (action.includes('delete')) return '×';
  if (action.includes('update')) return '↻';
  return '•';
};

const formatTimeAgo = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

const ActivityFeed = ({ activities }: ActivityFeedProps) => {
  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-on-surface">
          Recent Activity
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary/80 text-xs md:text-sm"
        >
          VIEW FULL AUDIT LOG
          <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-3 md:space-y-4 flex-1 overflow-y-auto max-h-[400px] md:max-h-[500px] pr-2 custom-scrollbar">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant text-sm">
            No recent activity
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-surface hover:bg-surface-variant transition-colors"
            >
              <div className={`flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold ${
                getActionColor(activity.action)
              } bg-surface-high border border-outline`}>
                {getActionIcon(activity.action)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs md:text-sm text-on-surface line-clamp-2">
                    <span className="font-semibold">{activity.user_name}</span>{' '}
                    <span className="text-on-surface-variant">
                      {activity.action.replace(/_/g, ' ')}
                    </span>
                  </p>
                  <span className="text-xs text-on-surface-variant whitespace-nowrap flex-shrink-0">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs border-outline-variant">
                    {activity.entity_type}
                  </Badge>
                  {activity.details && (
                    <span className="text-xs text-on-surface-variant truncate">
                      ID: {activity.entity_id}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default ActivityFeed;
