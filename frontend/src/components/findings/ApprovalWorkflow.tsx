import { Finding } from '@/api/findingApi';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock } from 'lucide-react';

interface ApprovalWorkflowProps {
  finding: Finding;
}

const ApprovalWorkflow = ({ finding }: ApprovalWorkflowProps) => {
  const getStatusIcon = () => {
    switch (finding.status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'rejected':
        return <CheckCircle className="w-5 h-5 text-error" />;
      case 'pending_review':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-on-surface-variant" />;
    }
  };

  const getStatusColor = () => {
    switch (finding.status) {
      case 'approved':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'pending_review':
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
              finding.status === 'pending_review' || finding.status === 'approved'
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
          {(finding.status === 'pending_review' || finding.status === 'approved') && (
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
