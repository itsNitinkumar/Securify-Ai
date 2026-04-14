import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, FileText } from 'lucide-react';
import { findingApi, Finding } from '@/api/findingApi';
import { evidenceApi, Evidence } from '@/api/evidenceApi';
import FindingWorkflowButtons from './FindingWorkflowButtons';
import EditFindingDialog from './EditFindingDialog';
import FindingComments from './FindingComments';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface FindingViewerProps {
  findingId: number;
  currentUserRole: string;
  currentUserId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const FindingViewer = ({
  findingId,
  currentUserRole,
  currentUserId,
  open,
  onOpenChange,
  onUpdate,
}: FindingViewerProps) => {
  const [finding, setFinding] = useState<Finding | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (open && findingId) {
      loadFinding();
      loadEvidence();
    }
  }, [open, findingId]);

  const loadFinding = async () => {
    try {
      setLoading(true);
      const response = await findingApi.getById(findingId);
      setFinding(response.data.data || null);
    } catch (error) {
      console.error('Failed to load finding:', error);
      alert('Failed to load finding');
    } finally {
      setLoading(false);
    }
  };

  const loadEvidence = async () => {
    try {
      const response = await evidenceApi.getByFinding(findingId);
      setEvidence(response.data.data || []);
    } catch (error) {
      console.error('Failed to load evidence:', error);
    }
  };

  const handleUpdate = () => {
    loadFinding();
    loadEvidence();
    onUpdate();
  };

  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    handleUpdate();
    setEditDialogOpen(false);
  };

  const severityColors = {
    Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Informational: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  const statusColors = {
    draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    pending_review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    changes_requested: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  if (loading || !finding) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-surface-high border-outline">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-on-surface-variant">Loading finding...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-surface-high border-outline">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={severityColors[finding.severity]}>
                    {finding.severity}
                  </Badge>
                  <Badge className={statusColors[finding.status]}>
                    {finding.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl text-on-surface">{finding.title}</DialogTitle>
                <DialogDescription>
                  {finding.affected_target && `Target: ${finding.affected_target}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Workflow Buttons */}
            <FindingWorkflowButtons
              finding={finding}
              currentUserRole={currentUserRole}
              currentUserId={currentUserId}
              onUpdate={handleUpdate}
              onEditClick={handleEditClick}
            />

            {/* Description */}
            {finding.description && (
              <Card className="p-4 bg-surface border-outline-variant">
                <h3 className="text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </h3>
                <p className="text-sm text-on-surface-variant whitespace-pre-wrap">
                  {finding.description}
                </p>
              </Card>
            )}

            {/* Likelihood & Impact */}
            {(finding.likelihood || finding.impact) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {finding.likelihood && (
                  <Card className="p-4 bg-surface border-outline-variant">
                    <h3 className="text-sm font-semibold text-on-surface mb-2">Likelihood</h3>
                    <p className="text-sm text-on-surface-variant">{finding.likelihood}</p>
                  </Card>
                )}
                {finding.impact && (
                  <Card className="p-4 bg-surface border-outline-variant">
                    <h3 className="text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Impact
                    </h3>
                    <p className="text-sm text-on-surface-variant">{finding.impact}</p>
                  </Card>
                )}
              </div>
            )}

            {/* Steps to Reproduce */}
            {finding.steps_to_reproduce && finding.steps_to_reproduce.length > 0 && (
              <Card className="p-4 bg-surface border-outline-variant">
                <h3 className="text-sm font-semibold text-on-surface mb-3">Steps to Reproduce</h3>
                <ol className="list-decimal list-inside space-y-2">
                  {finding.steps_to_reproduce.map((step, index) => (
                    <li key={index} className="text-sm text-on-surface-variant">
                      {step}
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {/* Proof of Concept */}
            {finding.proof_of_concept && (
              <Card className="p-4 bg-surface border-outline-variant">
                <h3 className="text-sm font-semibold text-on-surface mb-2">Proof of Concept</h3>
                <pre className="text-sm text-on-surface-variant whitespace-pre-wrap font-mono bg-surface-low p-3 rounded border border-outline-variant overflow-x-auto">
                  {finding.proof_of_concept}
                </pre>
              </Card>
            )}

            {/* Remediation */}
            {finding.remediation && (
              <Card className="p-4 bg-surface border-outline-variant">
                <h3 className="text-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Remediation
                </h3>
                <p className="text-sm text-on-surface-variant whitespace-pre-wrap">
                  {finding.remediation}
                </p>
              </Card>
            )}

            {/* Evidence */}
            {evidence.length > 0 && (
              <Card className="p-4 bg-surface border-outline-variant">
                <h3 className="text-sm font-semibold text-on-surface mb-3">Evidence ({evidence.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {evidence.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-surface-low border border-outline-variant rounded-md"
                    >
                      <p className="text-sm text-on-surface font-medium truncate">{item.file_name}</p>
                      {item.caption && (
                        <p className="text-xs text-on-surface-variant mt-1 italic">"{item.caption}"</p>
                      )}
                      <p className="text-xs text-on-surface-variant mt-1">
                        {(item.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Comments */}
            <FindingComments
              findingId={findingId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />

            {/* References */}
            {finding.references && finding.references.length > 0 && (
              <Card className="p-4 bg-surface border-outline-variant">
                <h3 className="text-sm font-semibold text-on-surface mb-2">References</h3>
                <ul className="list-disc list-inside space-y-1">
                  {finding.references.map((ref, index) => (
                    <li key={index} className="text-sm text-on-surface-variant">
                      {ref}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <EditFindingDialog
        findingId={findingId}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};

export default FindingViewer;
