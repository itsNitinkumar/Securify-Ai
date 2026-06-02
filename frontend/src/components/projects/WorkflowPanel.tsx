import { useEffect, useState } from 'react';
import { projectApi } from '@/api/projectApi';
import { commentThreadApi } from '@/api/commentThreadApi';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import InlineConfirm from '@/components/ui/inline-confirm';
import WorkflowHistory from './WorkflowHistory';
import { useAuth } from '@/contexts/AuthContext';
import { Send, MessageSquare, CheckCircle, AlertTriangle } from 'lucide-react';

interface WorkflowPanelProps {
  projectId: number;
  status: string;
  submittedBy?: number;
  submittedAt?: string;
  completedBy?: number;
  completedAt?: string;
  onStatusChange: () => void;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', label: 'Draft' },
  pending_review: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Pending Review' },
  pending_comment_resolution: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'Changes Requested' },
  completed: { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Completed' },
};

const WorkflowPanel = ({ projectId, status, submittedBy, submittedAt, completedBy, completedAt, onStatusChange }: WorkflowPanelProps) => {
  const { hasPermission, hasRole } = useAuth();
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<'submit' | 'complete' | 'changes' | null>(null);
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

  const handleAction = async (action: 'submit' | 'changes' | 'complete') => {
    try {
      setWorkflowLoading(true);
      if (action === 'submit') await projectApi.submitForReview(projectId);
      else if (action === 'changes') await projectApi.requestChanges(projectId);
      else if (action === 'complete') await projectApi.markComplete(projectId);
      setShowConfirm(null);
      onStatusChange();
    } catch (error) {
      console.error('Failed to update project status:', error);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const canSubmit = hasPermission('create_findings') || hasPermission('approve_findings') || hasRole('manager', 'admin');
  const canApprove = hasPermission('approve_findings') || hasRole('manager', 'admin');

  return (
    <Card className="p-4 bg-surface-high border-outline overflow-hidden">
      <h3 className="text-sm font-semibold text-on-surface mb-3">Workflow</h3>

      <div className="mb-3">
        <Badge className={config.color}>{config.label}</Badge>
      </div>

      {(commentCounts.open > 0 || commentCounts.resolved > 0 || commentCounts.findingsWithOpen > 0) && (
        <div className="mb-3 space-y-1">
          <div className="text-xs text-on-surface-variant flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            Project comments: {commentCounts.open} open, {commentCounts.resolved} resolved
          </div>
          {commentCounts.findingsWithOpen > 0 && (
            <div className="text-xs text-orange-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {commentCounts.findingsWithOpen} finding{commentCounts.findingsWithOpen !== 1 ? 's' : ''} with unresolved comments
            </div>
          )}
        </div>
      )}

      {submittedAt && (
        <div className="mb-1 text-xs text-on-surface-variant">
          Submitted {new Date(submittedAt).toLocaleDateString()}{submittedBy ? ` by User #${submittedBy}` : ''}
        </div>
      )}

      {completedAt && (
        <div className="mb-3 text-xs text-green-400 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Completed {new Date(completedAt).toLocaleDateString()}{completedBy ? ` by User #${completedBy}` : ''}
        </div>
      )}

      <div className="space-y-2">
        {status === 'draft' && canSubmit && (
          <>
            {showConfirm === 'submit' ? (
              <InlineConfirm
                title="Submit for review?"
                description="Project will be marked as Pending Review."
                confirmText="Submit"
                busy={workflowLoading}
                onCancel={() => setShowConfirm(null)}
                onConfirm={() => handleAction('submit')}
              />
            ) : (
              <Button
                onClick={() => setShowConfirm('submit')}
                disabled={workflowLoading}
                className="w-full bg-primary text-surface hover:bg-primary/90"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit For Review
              </Button>
            )}
          </>
        )}

        {status === 'pending_review' && canApprove && (
          <>
            {showConfirm === 'changes' ? (
              <InlineConfirm
                title="Request changes?"
                description="Project will move to Changes Requested state."
                confirmText="Request Changes"
                busy={workflowLoading}
                onCancel={() => setShowConfirm(null)}
                onConfirm={() => handleAction('changes')}
              />
            ) : (
              <Button
                onClick={() => setShowConfirm('changes')}
                disabled={workflowLoading}
                variant="outline"
                className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Request Changes
              </Button>
            )}

            {showConfirm === 'complete' ? (
              <InlineConfirm
                title="Mark project complete?"
                description="This will finalize the project."
                confirmText="Mark Complete"
                busy={workflowLoading}
                onCancel={() => setShowConfirm(null)}
                onConfirm={() => handleAction('complete')}
              />
            ) : (
              <Button
                onClick={() => setShowConfirm('complete')}
                disabled={workflowLoading}
                className="w-full bg-green-500 text-surface hover:bg-green-600"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            )}
          </>
        )}

        {status === 'pending_comment_resolution' && canApprove && (
          <>
            {commentCounts.findingsWithOpen > 0 && (
              <div className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-md text-xs text-orange-400 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                {commentCounts.findingsWithOpen} finding{commentCounts.findingsWithOpen !== 1 ? 's' : ''} still {commentCounts.findingsWithOpen !== 1 ? 'have' : 'has'} unresolved comments
              </div>
            )}
            {showConfirm === 'complete' ? (
              <InlineConfirm
                title="Mark project complete?"
                description="All comments have been resolved."
                confirmText="Mark Complete"
                busy={workflowLoading}
                onCancel={() => setShowConfirm(null)}
                onConfirm={() => handleAction('complete')}
              />
            ) : (
              <Button
                onClick={() => setShowConfirm('complete')}
                disabled={workflowLoading}
                className="w-full bg-green-500 text-surface hover:bg-green-600"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            )}
          </>
        )}

        {status === 'completed' && (
          <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-md text-sm text-green-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Project Complete
          </div>
        )}

        {status === 'pending_review' && !canApprove && (
          <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-sm text-yellow-400 flex items-center gap-2">
            Pending Review
          </div>
        )}

        {status === 'pending_comment_resolution' && !canApprove && (
          <div className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-md text-sm text-orange-400">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">Changes Requested</span>
            </div>
            <p className="text-xs text-orange-300 ml-6">
              {commentCounts.findingsWithOpen > 0
                ? `${commentCounts.findingsWithOpen} finding${commentCounts.findingsWithOpen !== 1 ? 's' : ''} ${commentCounts.findingsWithOpen !== 1 ? 'have' : 'has'} unresolved comments. Open each finding and resolve its comment threads to proceed.`
                : 'Resolve project comments to proceed.'}
            </p>
          </div>
        )}
      </div>

      <WorkflowHistory projectId={projectId} />
    </Card>
  );
};

export default WorkflowPanel;
