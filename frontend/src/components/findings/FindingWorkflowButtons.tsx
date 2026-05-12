import { useState } from 'react';
import { Send, CheckCircle, XCircle, Edit, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { findingApi, Finding } from '@/api/findingApi';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import InlineConfirm from '@/components/ui/inline-confirm';

interface FindingWorkflowButtonsProps {
  finding: Finding;
  currentUserRole: string;
  currentUserId: number;
  onUpdate: () => void;
  onEditClick?: () => void;
}

const FindingWorkflowButtons = ({
  finding,
  currentUserRole,
  currentUserId,
  onUpdate,
  onEditClick,
}: FindingWorkflowButtonsProps) => {
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | 'submit' | 'approve' | 'delete'>(null);
  const [requestChangesOpen, setRequestChangesOpen] = useState(false);
  const [requestChangesComment, setRequestChangesComment] = useState('');

  const isCreator = finding.created_by === currentUserId;
  
  // Debug logging
  console.log('FindingWorkflowButtons Debug:', {
    findingId: finding.id,
    status: finding.status,
    created_by: finding.created_by,
    currentUserId,
    currentUserRole,
    isCreator,
  });
  
  // Analysts can edit their own findings if status is draft or changes_requested
  const canEdit = (currentUserRole === 'analyst' && isCreator && 
                   (finding.status === 'draft' || finding.status === 'changes_requested')) ||
                  (currentUserRole === 'manager');
  
  // Analysts can only delete their own DRAFT findings, Managers can delete any finding
  const canDelete = (currentUserRole === 'analyst' && isCreator && finding.status === 'draft') ||
                    (currentUserRole === 'manager');
  
  // Can submit if creator and status is draft OR changes_requested (resubmit after fixes)
  const canSubmit = isCreator && (finding.status === 'draft' || finding.status === 'changes_requested');
  
  // Can approve/request changes if reviewer/manager and status is pending_review
  const canReview = (currentUserRole === 'reviewer' || currentUserRole === 'manager') &&
                    finding.status === 'pending_review';

  console.log('Button Visibility:', { canEdit, canDelete, canSubmit, canReview });

  const handleSubmitForReview = async () => {
    try {
      setLoading(true);
      await findingApi.submitForReview(finding.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to submit for review:', error);
      toast.error('Failed to submit for review');
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      await findingApi.approve(finding.id);
      toast.success('Finding approved successfully');
      setConfirmAction(null);
      // Wait a moment before updating to ensure backend has processed
      await new Promise(resolve => setTimeout(resolve, 100));
      onUpdate();
    } catch (error: any) {
      console.error('Failed to approve finding:', error);
      const message = error?.response?.data?.message || 'Failed to approve finding';
      toast.error(message);
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const handleRequestChanges = async () => {
    try {
      setLoading(true);
      await findingApi.requestChanges(finding.id, requestChangesComment.trim() || undefined);
      onUpdate();
    } catch (error) {
      console.error('Failed to request changes:', error);
      toast.error('Failed to request changes');
    } finally {
      setLoading(false);
      setRequestChangesOpen(false);
      setRequestChangesComment('');
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await findingApi.delete(finding.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete finding:', error);
      toast.error('Failed to delete finding');
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-3">
      {(confirmAction === 'submit' || confirmAction === 'approve' || confirmAction === 'delete') ? (
        <InlineConfirm
          danger={confirmAction === 'delete'}
          title={
            confirmAction === 'submit'
              ? 'Submit for review?'
              : confirmAction === 'approve'
              ? 'Approve this finding?'
              : 'Delete this finding?'
          }
          description={
            confirmAction === 'submit'
              ? 'You will not be able to edit it after submission.'
              : confirmAction === 'delete'
              ? 'This action cannot be undone.'
              : undefined
          }
          confirmText={
            confirmAction === 'submit'
              ? 'Submit'
              : confirmAction === 'approve'
              ? 'Approve'
              : 'Delete'
          }
          busy={loading}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction === 'submit') void handleSubmitForReview();
            if (confirmAction === 'approve') void handleApprove();
            if (confirmAction === 'delete') void handleDelete();
          }}
        />
      ) : null}

      {requestChangesOpen ? (
        <div className="rounded-lg border border-outline-variant bg-surface-low p-3">
          <div className="text-sm font-semibold text-on-surface">Request changes</div>
          <div className="mt-1 text-xs text-on-surface-variant">Optional feedback for the analyst.</div>
          <textarea
            value={requestChangesComment}
            onChange={(e) => setRequestChangesComment(e.target.value)}
            rows={3}
            className="mt-2 w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., Add reproduction steps and evidence for the impact statement"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => {
                setRequestChangesOpen(false);
                setRequestChangesComment('');
              }}
              className="border-outline text-on-surface-variant"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => void handleRequestChanges()}
              className="bg-orange-500 text-surface hover:bg-orange-500/90"
            >
              {loading ? 'Working…' : 'Send'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 flex-wrap">
      {/* Submit for Review - Analyst (creator) only, draft or changes_requested status */}
      {canSubmit && (
        <Button
          onClick={() => setConfirmAction('submit')}
          disabled={loading}
          className="bg-primary text-surface hover:bg-primary/90"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {finding.status === 'changes_requested' ? 'Resubmit for Review' : 'Submit for Review'}
        </Button>
      )}

      {/* Approve - Reviewer/Manager only, pending_review status */}
      {canReview && (
        <>
          <Button
            onClick={() => setConfirmAction('approve')}
            disabled={loading}
            className="bg-green-500 text-white hover:bg-green-600"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Approve
          </Button>
          <Button
            onClick={() => setRequestChangesOpen((v) => !v)}
            disabled={loading}
            variant="ghost"
            className="text-orange-400 hover:bg-orange-500/10"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4 mr-2" />
            )}
            Request Changes
          </Button>
        </>
      )}

      {/* Edit - Analyst (creator, draft) or Manager */}
      {canEdit && onEditClick && (
        <Button
          onClick={onEditClick}
          variant="ghost"
          className="text-on-surface"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      )}

      {/* Delete - Analyst (creator) or Manager */}
      {canDelete && (
        <Button
          onClick={() => setConfirmAction('delete')}
          disabled={loading}
          variant="ghost"
          className="border-error text-error hover:bg-error/10"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 mr-2" />
          )}
          Delete
        </Button>
      )}

      {/* Status indicator for read-only states */}
      {finding.status === 'draft' && !canSubmit && (
        <div className="px-3 py-2 bg-gray-500/10 border border-gray-500/20 rounded-md text-sm text-gray-400">
          Draft - Waiting for analyst to submit for review
        </div>
      )}

      {finding.status === 'pending_review' && !canReview && (
        <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-sm text-yellow-400">
          Pending Review
        </div>
      )}

      {finding.status === 'changes_requested' && !isCreator && (
        <div className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-md text-sm text-orange-400 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Changes Requested - Waiting for analyst to resubmit
        </div>
      )}

      {finding.status === 'approved' && (
        <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-md text-sm text-green-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Approved
        </div>
      )}

      {finding.status === 'rejected' && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md text-sm text-red-400 flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          Rejected
        </div>
      )}
      </div>
    </div>
  );
};

export default FindingWorkflowButtons;
