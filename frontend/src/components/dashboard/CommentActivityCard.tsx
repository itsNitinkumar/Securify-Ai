import { Card } from '@/components/ui/card';
import { CommentActivity } from '@/api/dashboardApi';
import { MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';

interface CommentActivityCardProps {
  data: CommentActivity;
}

const CommentActivityCard = ({ data }: CommentActivityCardProps) => {
  const totalThreads = data.open_threads + data.resolved_threads;
  const totalComments = data.unresolved_comments + data.resolved_comments;
  const resolutionRate = totalThreads > 0 ? Math.round((data.resolved_threads / totalThreads) * 100) : 0;

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline h-full">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-on-surface">
          Review Activity
        </h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-outline-variant">
          <div className="p-2 rounded-lg bg-yellow-500/10 flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-on-surface-variant">Open Threads</p>
            <p className="text-lg font-bold text-on-surface font-technical">{data.open_threads}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-outline-variant">
          <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-on-surface-variant">Resolved Threads</p>
            <p className="text-lg font-bold text-on-surface font-technical">{data.resolved_threads}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-outline-variant">
          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-on-surface-variant">Total Comments</p>
            <p className="text-lg font-bold text-on-surface font-technical">{totalComments}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-outline-variant text-center">
          <p className="text-2xl font-bold text-primary font-technical">{resolutionRate}%</p>
          <p className="text-xs text-on-surface-variant">Thread Resolution Rate</p>
        </div>
      </div>
    </Card>
  );
};

export default CommentActivityCard;
