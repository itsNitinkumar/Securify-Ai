import { Finding } from '@/api/findingApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Send } from 'lucide-react';

interface ApprovalWorkflowProps {
  finding: Finding;
  onApprove: () => void;
  onUpdate: () => void;
}

const ApprovalWorkflow = ({ finding, onApprove, onUpdate }: ApprovalWorkflowProps) => {
  const getStatusIcon = () => {
    switch (finding.status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-error" />;
      case 'in_review':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <Send className="w-5 h-5 text-on-surface-variant" />;
    }
  };

  const getStatusColor = () => {
    switch (finding.status) {
      case 'approved':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'in_review':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <h3 className="text-sm font-semibold text-on-surface mb-4">Approval Workflow</h3>

      {/* Current Status */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-surface rounded-lg border border-outline-variant">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="text-xs text-on-surface-variant mb-1">Current Status</p>
          <Badge className={getStatusColor()}>
            {finding.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              finding.status !== 'draft'
                ? 'bg-primary/20 text-primary'
                : 'bg-surface-variant text-on-surface-variant'
            }`}
          >
            1
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-on-surface">Draft</p>
            <p className="text-xs text-on-surface-variant">Initial creation</p>
          </div>
          {finding.status !== 'draft' && (
            <CheckCircle className="w-4 h-4 text-primary" />
          )}
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              finding.status === 'in_review' || finding.status === 'approved'
                ? 'bg-primary/20 text-primary'
                : 'bg-surface-variant text-on-surface-variant'
            }`}
          >
            2
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-on-surface">In Review</p>
            <p className="text-xs text-on-surface-variant">Pending approval</p>
          </div>
          {(finding.status === 'in_review' || finding.status === 'approved') && (
            <CheckCircle className="w-4 h-4 text-primary" />
          )}
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              finding.status === 'approved'
                ? 'bg-primary/20 text-primary'
                : 'bg-surface-variant text-on-surface-variant'
            }`}
          >
            3
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-on-surface">Approved</p>
            <p className="text-xs text-on-surface-variant">Ready for report</p>
          </div>
          {finding.status === 'approved' && (
            <CheckCircle className="w-4 h-4 text-primary" />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {finding.status === 'draft' && (
          <Button
            onClick={onUpdate}
            className="w-full bg-primary text-surface hover:bg-primary/90"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit for Review
          </Button>
        )}

        {finding.status === 'in_review' && (
          <>
            <Button
              onClick={onApprove}
              className="w-full bg-primary text-surface hover:bg-primary/90"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Finding
            </Button>
            <Button
              variant="outline"
              className="w-full border-error/30 text-error hover:bg-error/10"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </>
        )}

        {finding.status === 'approved' && (
          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <p className="text-sm text-green-400 text-center">
              ✓ Finding approved and ready for inclusion in reports
            </p>
          </div>
        )}
      </div>

      {/* Reviewer Info */}
      {finding.approved_by && (
        <div className="mt-4 pt-4 border-t border-outline-variant">
          <p className="text-xs text-on-surface-variant">
            Approved by User #{finding.approved_by}
          </p>
        </div>
      )}
    </Card>
  );
};

export default ApprovalWorkflow;
