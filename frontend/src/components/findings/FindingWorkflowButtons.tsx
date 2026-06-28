import { useState } from 'react';
import { Send, CheckCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { findingApi, Finding } from '@/api/findingApi';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import InlineConfirm from '@/components/ui/inline-confirm';

interface FindingWorkflowButtonsProps {
  finding: Finding;
  currentUserId: number;
  onUpdate: () => void;
  onEditClick?: () => void;
}

const FindingWorkflowButtons = ({
  finding,
  currentUserId,
  onUpdate,
  onEditClick,
}: FindingWorkflowButtonsProps) => {
  const { hasPermission, hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | 'submit' | 'delete'>(null);

  const isCreator = finding.created_by === currentUserId;
  const canManageAll = hasRole('manager') || hasRole('admin') || hasPermission('manage_roles') || hasPermission('approve_findings');
  const canCreateFindings = hasPermission('create_findings');
  const canDeleteFindings = hasPermission('delete_findings');

  const isDraft = finding.status === 'draft';
  const isSubmitted = finding.status === 'submitted';

  const canEdit = (canCreateFindings && isCreator && isDraft) || canManageAll;
  const canDelete = (canDeleteFindings && isCreator && isDraft) || canManageAll;
  const canSubmit = canCreateFindings && isCreator && isDraft;

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await findingApi.submitFinding(finding.id);
      toast.success('Finding submitted successfully');
      setConfirmAction(null);
      onUpdate();
    } catch (error: any) {
      console.error('Failed to submit finding:', error);
      const message = error?.response?.data?.message || 'Failed to submit finding';
      toast.error(message);
    } finally {
      setLoading(false);
      setConfirmAction(null);
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
      {confirmAction === 'submit' || confirmAction === 'delete' ? (
        <InlineConfirm
          danger={confirmAction === 'delete'}
          title={
            confirmAction === 'submit'
              ? 'Submit this finding?'
              : 'Delete this finding?'
          }
          description={
            confirmAction === 'submit'
              ? 'The finding will become final and cannot be edited after submission.'
              : 'This action cannot be undone.'
          }
          confirmText={
            confirmAction === 'submit'
              ? 'Submit'
              : 'Delete'
          }
          busy={loading}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction === 'submit') void handleSubmit();
            if (confirmAction === 'delete') void handleDelete();
          }}
        />
      ) : null}

      <div className="flex items-center gap-2 flex-wrap">
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
            Submit Finding
          </Button>
        )}

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

        {isSubmitted && (
          <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-md text-sm text-green-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Submitted
          </div>
        )}

        {isDraft && !canSubmit && !canManageAll && (
          <div className="px-3 py-2 bg-gray-500/10 border border-gray-500/20 rounded-md text-sm text-gray-400">
            Draft
          </div>
        )}
      </div>
    </div>
  );
};

export default FindingWorkflowButtons;
