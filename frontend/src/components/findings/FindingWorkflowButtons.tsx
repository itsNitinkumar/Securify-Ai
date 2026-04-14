import { useState } from 'react';
import { Send, CheckCircle, XCircle, Edit, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { findingApi, Finding } from '@/api/findingApi';
import { Button } from '@/components/ui/button';

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

  const isCreator = finding.created_by === currentUserId;
  
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

  const handleSubmitForReview = async () => {
    if (!confirm('Submit this finding for review? You will not be able to edit it after submission.')) {
      return;
    }

    try {
      setLoading(true);
      await findingApi.submitForReview(finding.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to submit for review:', error);
      alert('Failed to submit for review');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this finding?')) {
      return;
    }

    try {
      setLoading(true);
      await findingApi.approve(finding.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to approve finding:', error);
      alert('Failed to approve finding');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    const comment = prompt('Please provide feedback for the analyst (optional):');
    
    // Allow empty comment (user can click OK without typing)
    if (comment === null) return; // User clicked Cancel
    
    try {
      setLoading(true);
      await findingApi.requestChanges(finding.id, comment || undefined);
      onUpdate();
    } catch (error) {
      console.error('Failed to request changes:', error);
      alert('Failed to request changes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this finding? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await findingApi.delete(finding.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete finding:', error);
      alert('Failed to delete finding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Submit for Review - Analyst (creator) only, draft or changes_requested status */}
      {canSubmit && (
        <Button
          onClick={handleSubmitForReview}
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
            onClick={handleApprove}
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
            onClick={handleRequestChanges}
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
          onClick={handleDelete}
          disabled={loading}
          variant="outline"
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
      {finding.status === 'pending_review' && !canReview && (
        <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-sm text-yellow-400">
          Pending Review
        </div>
      )}

      {finding.status === 'changes_requested' && !isCreator && (
        <div className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-md text-sm text-orange-400 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Changes Requested
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
  );
};

export default FindingWorkflowButtons;
