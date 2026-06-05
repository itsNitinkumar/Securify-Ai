import { useEffect, useState } from 'react';
import { commentThreadApi } from '@/api/commentThreadApi';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import WorkflowHistory from './WorkflowHistory';
import { MessageSquare, AlertTriangle, CheckCircle } from 'lucide-react';

interface WorkflowPanelProps {
  projectId: number;
  status: string;
  onStatusChange: () => void;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', label: 'Draft' },
  pending_review: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Pending Review' },
  pending_comment_resolution: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'Changes Requested' },
  completed: { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Completed' },
};

const WorkflowPanel = ({ projectId, status }: WorkflowPanelProps) => {
  const [commentCounts, setCommentCounts] = useState({ open: 0, resolved: 0, findingsWithOpen: 0 });

  const config = statusConfig[status] || statusConfig.draft;

  useEffect(() => {
    const loadThreadData = async () => {
      try {
        const res = await commentThreadApi.getThreads({ projectId });
        const data = (res.data as any)?.data || res.data || [];
        const threads = Array.isArray(data) ? data : [];
        const projectThreads = threads.filter((t: any) => !t.finding_id);
        const findingThreads = threads.filter((t: any) => t.finding_id);
        setCommentCounts({
          open: projectThreads.filter((t: any) => t.status === 'OPEN').length,
          resolved: projectThreads.filter((t: any) => t.status === 'RESOLVED').length,
          findingsWithOpen: new Set(findingThreads.filter((t: any) => t.status === 'OPEN').map((t: any) => t.finding_id)).size,
        });
      } catch {
        // silent
      }
    };
    loadThreadData();
  }, [projectId]);

  return (
    <Card className="p-4 bg-surface-high border-outline overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-on-surface">Workflow</h3>
        <Badge className={config.color}>{config.label}</Badge>
      </div>

      {status === 'pending_comment_resolution' && commentCounts.findingsWithOpen > 0 && (
        <div className="mb-3 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-md text-xs text-orange-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            {commentCounts.findingsWithOpen} finding{commentCounts.findingsWithOpen !== 1 ? 's have' : ' has'} unresolved comments.
            Open each finding and resolve its comment threads to proceed.
          </div>
        </div>
      )}

      {commentCounts.open + commentCounts.resolved > 0 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-on-surface-variant">
          <MessageSquare className="w-3 h-3" />
          <span>
            {commentCounts.open} open · {commentCounts.resolved} resolved
          </span>
        </div>
      )}

      {status === 'completed' && (
        <div className="mb-3 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-md text-sm text-green-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Project Complete
        </div>
      )}

      <WorkflowHistory projectId={projectId} />
    </Card>
  );
};

export default WorkflowPanel;
