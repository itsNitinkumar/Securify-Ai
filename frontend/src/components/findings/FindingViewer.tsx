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

  const severityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
      High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      Informational: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };
    return colors[severity] || colors.Low;
  };

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
      console.log('📥 Finding data received:', response.data.data);
      console.log('  - likelihood:', response.data.data?.likelihood, 'type:', typeof response.data.data?.likelihood);
      console.log('  - impact:', response.data.data?.impact, 'type:', typeof response.data.data?.impact);
      console.log('  - recommendation:', response.data.data?.recommendation, 'type:', typeof response.data.data?.recommendation);
      console.log('  - references:', response.data.data?.references, 'type:', typeof response.data.data?.references);
      console.log('  - steps_to_reproduce:', response.data.data?.steps_to_reproduce, 'type:', typeof response.data.data?.steps_to_reproduce);
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

  const isFalsePositive = (f: Finding) => (f as any).finding_type === 'false_positive';

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
                  {isFalsePositive(finding) ? (
                    <Badge className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">False Positive</Badge>
                  ) : (
                    <Badge className={severityColors[finding.severity]}>
                      {finding.severity}
                    </Badge>
                  )}
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

            {/* Likelihood & Impact - Combined Section */}
            {!isFalsePositive(finding) && (finding.likelihood || finding.impact) && (
              <Card className="p-4 bg-surface border-outline-variant">
                <h3 className="text-sm font-semibold text-on-surface mb-3">Impact & Likelihood</h3>
                <div className="space-y-4">
                  {finding.impact && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-on-surface" />
                        <span className="text-sm font-semibold text-on-surface">Impact:</span>
                        {typeof finding.impact === 'object' && finding.impact.severity && (
                          <Badge className={severityBadge(finding.impact.severity) + " ml-1"}>{finding.impact.severity}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-on-surface-variant">
                        {typeof finding.impact === 'object' ? finding.impact.detail : finding.impact}
                      </p>
                    </div>
                  )}
                  {finding.likelihood && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-on-surface">Likelihood:</span>
                        {typeof finding.likelihood === 'object' && finding.likelihood.severity && (
                          <Badge className={severityBadge(finding.likelihood.severity) + " ml-1"}>{finding.likelihood.severity}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-on-surface-variant">
                        {typeof finding.likelihood === 'object' ? finding.likelihood.detail : finding.likelihood}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Steps to Reproduce */}
            {!isFalsePositive(finding) && finding.steps_to_reproduce && finding.steps_to_reproduce.length > 0 && (
              <Card className="p-4 bg-surface border-outline-variant">
                <h3 className="text-sm font-semibold text-on-surface mb-3">Steps to Reproduce</h3>
                <div className="space-y-4">
                  {(() => {
                    console.log('📸 Steps data:', JSON.stringify(finding.steps_to_reproduce.slice(0, 2), null, 2));
                    return finding.steps_to_reproduce.map((step: any, index: number) => {
                    // Support both new format (object) and legacy format (string)
                    const isNewFormat = typeof step === 'object' && step !== null && 'stepNumber' in step;
                    const stepNumber = isNewFormat ? step.stepNumber : index + 1;
                    const description = isNewFormat ? (step.description || '') : (step || '');
                    const caption = isNewFormat ? step.caption : null;
                    
                    // Use signedUrl for display (backend provides this), fallback to imageKey
                    const imageUrl = isNewFormat ? (step.signedUrl || step.imageKey || '') : '';
                    
                    return (
                      <div key={index} className="bg-surface-low p-3 rounded-lg border border-outline-variant">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                            Step {stepNumber}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface-variant mb-2">
                          {description}
                        </p>
                        {imageUrl && (
                          <div className="mt-3">
                            <img 
                              src={imageUrl} 
                              alt={`Step ${stepNumber}`} 
                              className="max-h-64 rounded border border-outline-variant" 
                              onError={(e) => {
                                console.error('Image failed to load:', {
                                  url: imageUrl,
                                  isS3: imageUrl.includes('amazonaws.com'),
                                  isSigned: imageUrl.includes('X-Amz'),
                                  length: imageUrl.length
                                });
                                e.currentTarget.style.display = 'none';
                              }}
                              onLoad={() => {
                                console.log('Image loaded successfully:', imageUrl.substring(0, 100));
                              }}
                            />
                            {caption && (
                              <p className="text-xs text-on-surface-variant mt-2 italic">{caption}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })})()}
                </div>
              </Card>
            )}

            {/* Evidence Items (False Positive) */}
            {isFalsePositive(finding) && (finding as any).evidence_items?.length > 0 && (
              <Card className="p-4 bg-surface border-outline-variant">
                <h3 className="text-sm font-semibold text-on-surface mb-3">Evidence Items</h3>
                <div className="space-y-4">
                  {((finding as any).evidence_items || []).map((item: any, index: number) => (
                    <div key={index} className="bg-surface-low p-3 rounded-lg border border-outline-variant">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                          Evidence #{index + 1}
                        </span>
                      </div>
                      {(item.signedUrl || item.imageKey) && (
                        <div className="mt-3">
                          <img
                            src={item.signedUrl || item.imageKey}
                            alt={`Evidence ${index + 1}`}
                            className="max-h-64 rounded border border-outline-variant"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          {item.caption && (
                            <p className="text-xs text-on-surface-variant mt-2 italic">{item.caption}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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

            {/* Recommendation (array from AI) */}
            {!isFalsePositive(finding) && finding.recommendation && finding.recommendation.length > 0 && (
              <Card className="p-4 bg-surface border-outline-variant">
                <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Recommendations
                </h3>
                <ul className="list-disc list-outside ml-5 space-y-3">
                  {finding.recommendation.map((rec, index) => {
                    // Parse bold category headers (e.g., "**Category:** description")
                    const match = rec.match(/^\*\*(.+?)\*\*:?\s*(.+)$/s);
                    if (match) {
                      return (
                        <li key={index} className="text-sm text-on-surface-variant">
                          <span className="font-semibold text-on-surface">{match[1]}:</span> {match[2]}
                        </li>
                      );
                    }
                    return (
                      <li key={index} className="text-sm text-on-surface-variant">
                        {rec}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            {/* Remediation (string - legacy) */}
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
                    <a
                      key={item.id}
                      href={`http://localhost:3000${item.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-surface-low border border-outline-variant rounded-md hover:border-primary/50 transition-colors cursor-pointer group"
                    >
                      <p className="text-sm text-on-surface font-medium truncate group-hover:text-primary">
                        {item.file_name}
                      </p>
                      {item.caption && (
                        <p className="text-xs text-on-surface-variant mt-1 italic">"{item.caption}"</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-on-surface-variant">
                          {(item.file_size / 1024).toFixed(1)} KB
                        </p>
                        <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to view →
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </Card>
            )}

            {/* References */}
            {!isFalsePositive(finding) && finding.references && finding.references.length > 0 && (
              <Card className="p-4 bg-surface border-outline-variant">
                <h3 className="text-sm font-semibold text-on-surface mb-2">References</h3>
                <ul className="list-disc list-inside space-y-1">
                  {finding.references.map((ref, index) => (
                    <li key={index} className="text-sm text-on-surface-variant break-all">
                      <a href={ref} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {ref}
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Comments */}
            <FindingComments
              findingId={findingId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
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
