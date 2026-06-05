import { useState, useEffect } from 'react';
import { Search, Loader2, FileText, ExternalLink } from 'lucide-react';
import { projectApi, Project } from '@/api/projectApi';
import { findingApi, Finding } from '@/api/findingApi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { templateKeyFromProject } from '@/reportTemplates/registry';

interface ImportFindingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: number;
  onImportComplete: () => void;
}

interface ProjectFindings {
  projectId: number;
  projectName: string;
  findings: Finding[];
  selectedFindings: number[];
}

const severityColors: Record<string, string> = {
  Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Informational: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export const ImportFindingsDialog: React.FC<ImportFindingsDialogProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  onImportComplete,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceProjectId, setSelectedSourceProjectId] = useState<number | null>(null);
  const [sourceFindings, setSourceFindings] = useState<Finding[]>([]);
  const [selectedFindings, setSelectedFindings] = useState<number[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingFindings, setIsLoadingFindings] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewFinding, setPreviewFinding] = useState<Finding | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedSourceProjectId) {
      loadFindingsForProject(selectedSourceProjectId);
    }
  }, [selectedSourceProjectId]);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await projectApi.getAllProjects();
      const projectsList = (response.data || response).filter((p: Project) => p.id !== currentProjectId);
      setProjects(projectsList);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const loadFindingsForProject = async (projectId: number) => {
    setIsLoadingFindings(true);
    try {
      const response = await findingApi.getAllFindings({ project_id: projectId, status: 'approved' });
      const findingsList = response.data?.data || response.data || response;
      setSourceFindings(Array.isArray(findingsList) ? findingsList : []);
      setSelectedFindings([]);
    } catch (error) {
      console.error('Failed to load findings:', error);
      setSourceFindings([]);
    } finally {
      setIsLoadingFindings(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.client_name && p.client_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleFinding = (findingId: number) => {
    setSelectedFindings((prev) =>
      prev.includes(findingId) ? prev.filter((id) => id !== findingId) : [...prev, findingId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFindings.length === sourceFindings.length) {
      setSelectedFindings([]);
    } else {
      setSelectedFindings(sourceFindings.map((f) => f.id));
    }
  };

  const handleImportFindings = async () => {
    if (selectedFindings.length === 0) {
      toast.error('Please select at least one finding to import');
      return;
    }

    setIsImporting(true);
    try {
      const targetProject = projects.find((p) => p.id === currentProjectId);
      const isDast = templateKeyFromProject(targetProject) === 'dast';

      const targetFindingsRes = await findingApi.getAllFindings({ project_id: currentProjectId });
      const targetFindings: Finding[] = Array.isArray(targetFindingsRes.data?.data)
        ? targetFindingsRes.data.data
        : Array.isArray(targetFindingsRes.data)
          ? targetFindingsRes.data
          : [];
      const targetTitles = new Set(targetFindings.map((f: Finding) => f.title.toLowerCase().trim()));

      const duplicates: string[] = [];
      for (const finding of sourceFindings) {
        if (selectedFindings.includes(finding.id) && targetTitles.has(finding.title.toLowerCase().trim())) {
          duplicates.push(finding.title);
        }
      }

      if (duplicates.length > 0) {
        const uniqueDupes = [...new Set(duplicates)];
        toast.error(`These findings already exist in this project: ${uniqueDupes.join(', ')}`);
        setIsImporting(false);
        return;
      }

      for (const findingId of selectedFindings) {
        const sourceFinding = sourceFindings.find((f) => f.id === findingId);
        if (!sourceFinding) continue;

        const isSourceFP = sourceFinding.finding_type === 'false_positive';
        const targetIsDast = isDast;
        const useFPStructure = isSourceFP && targetIsDast;

        const basePayload: any = {
          title: sourceFinding.title,
          description: sourceFinding.description || '',
          affected_target: sourceFinding.affected_target || '',
          evidence_items: sourceFinding.evidence_items || [],
          references: sourceFinding.references || [],
          status: 'approved',
          project_id: currentProjectId,
          finding_type: isSourceFP ? 'false_positive' : (sourceFinding.finding_type || 'true_positive'),
        };

        if (useFPStructure) {
          basePayload.severity = 'Informational';
        } else {
          basePayload.severity = sourceFinding.severity;
          basePayload.affected_component = sourceFinding.affected_component || '';
          basePayload.cvss_score = sourceFinding.cvss_score;
          basePayload.cwe_id = sourceFinding.cwe_id || '';
          basePayload.owasp_category = sourceFinding.owasp_category || '';
          basePayload.likelihood = sourceFinding.likelihood ?? undefined;
          basePayload.impact = sourceFinding.impact ?? undefined;
          basePayload.steps_to_reproduce = sourceFinding.steps_to_reproduce || [];
          basePayload.recommendation = sourceFinding.recommendation || [];
          basePayload.remediation = sourceFinding.remediation || '';
          basePayload.proof_of_concept = sourceFinding.proof_of_concept || '';
          basePayload.tags = sourceFinding.tags || [];
        }

        await findingApi.create(basePayload);
      }

      toast.success(`Successfully imported ${selectedFindings.length} finding(s)`);
      handleClose();
      onImportComplete();
    } catch (error: any) {
      console.error('Failed to import findings:', error);
      const errorMsg = error?.response?.data?.message || 'Failed to import findings';
      toast.error(errorMsg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedSourceProjectId(null);
    setSourceFindings([]);
    setSelectedFindings([]);
    setPreviewFinding(null);
    onClose();
  };

  const renderFindingPreview = (finding: Finding) => {
    const steps = Array.isArray(finding.steps_to_reproduce) ? finding.steps_to_reproduce : [];
    const recommendations = Array.isArray(finding.recommendation) ? finding.recommendation : [];
    const refs = Array.isArray(finding.references) ? finding.references : [];

    const getLikelihoodDetail = (likelihood: any) => {
      if (!likelihood) return null;
      if (typeof likelihood === 'string') return likelihood;
      return likelihood.detail || likelihood.severity || '';
    };

    const getImpactDetail = (impact: any) => {
      if (!impact) return null;
      if (typeof impact === 'string') return impact;
      return impact.detail || impact.severity || '';
    };

    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {finding.description && (
          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-2">Description</h4>
            <p className="text-sm text-on-surface-variant whitespace-pre-wrap">{finding.description}</p>
          </div>
        )}

        {getLikelihoodDetail(finding.likelihood) && (
          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-1">Likelihood</h4>
            <p className="text-sm text-on-surface-variant">
              {finding.likelihood && typeof finding.likelihood === 'object' && finding.likelihood.severity && (
                <span className="font-semibold">{finding.likelihood.severity}</span>
              )}
              {finding.likelihood && typeof finding.likelihood === 'object' && finding.likelihood.severity && getLikelihoodDetail(finding.likelihood) ? ' - ' : ''}
              {getLikelihoodDetail(finding.likelihood)}
            </p>
          </div>
        )}

        {getImpactDetail(finding.impact) && (
          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-1">Impact</h4>
            <p className="text-sm text-on-surface-variant">
              {finding.impact && typeof finding.impact === 'object' && finding.impact.severity && (
                <span className="font-semibold">{finding.impact.severity}</span>
              )}
              {finding.impact && typeof finding.impact === 'object' && finding.impact.severity && getImpactDetail(finding.impact) ? ' - ' : ''}
              {getImpactDetail(finding.impact)}
            </p>
          </div>
        )}

        {steps.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-2">Steps to Reproduce</h4>
            <div className="space-y-3">
              {steps.map((step: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="text-sm text-on-surface-variant">
                    <span className="font-semibold text-on-surface">Step {index + 1}: </span>
                    {typeof step === 'string' ? step : step.description || `Step ${index + 1}`}
                  </div>
                  {step.images && Array.isArray(step.images) && step.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {step.images.map((img: any, imgIndex: number) => {
                        // Handle different image formats
                        let imageUrl = '';
                        if (typeof img === 'string') {
                          imageUrl = img;
                        } else if (img.signedUrl) {
                          imageUrl = img.signedUrl;
                        } else if (img.url) {
                          imageUrl = img.url;
                        } else if (img.imageKey) {
                          // If only imageKey is present, skip (backend should have provided signedUrl)
                          console.warn('Image has imageKey but no signedUrl:', img.imageKey);
                          return null;
                        }
                        
                        return imageUrl ? (
                          <img
                            key={imgIndex}
                            src={imageUrl}
                            alt={`Step ${index + 1} screenshot ${imgIndex + 1}`}
                            className="w-full rounded border border-outline hover:scale-105 transition-transform cursor-pointer"
                            onClick={() => window.open(imageUrl, '_blank')}
                            onError={(e) => {
                              console.error('Failed to load image:', imageUrl);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-2">Recommendation</h4>
            <div className="space-y-2">
              {recommendations.map((rec: string, index: number) => {
                const cleanedRec = rec.replace(/\*\*/g, '');
                const colonIndex = cleanedRec.indexOf(':');
                const firstPart = colonIndex > 0 ? cleanedRec.substring(0, colonIndex + 1) : '';
                const restPart = colonIndex > 0 ? cleanedRec.substring(colonIndex + 1) : cleanedRec;
                return (
                  <div key={index} className="text-sm text-on-surface-variant">
                    {firstPart && <span className="font-semibold text-on-surface">{firstPart}</span>}
                    {restPart}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {finding.proof_of_concept && (
          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-2">Proof of Concept</h4>
            <p className="text-sm text-on-surface-variant whitespace-pre-wrap">{finding.proof_of_concept}</p>
          </div>
        )}

        {refs.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-2">References</h4>
            <ul className="list-disc list-inside space-y-1">
              {refs.map((ref: string, index: number) => (
                <li key={index} className="text-sm text-primary">
                  {ref}
                </li>
              ))}
            </ul>
          </div>
        )}

        {finding.cvss_score !== undefined && finding.cvss_score !== null && (
          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-2">CVSS Score</h4>
            <p className="text-sm text-on-surface-variant">{finding.cvss_score}</p>
          </div>
        )}

        {finding.cwe_id && (
          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-2">CWE ID</h4>
            <p className="text-sm text-on-surface-variant">{finding.cwe_id}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Findings</DialogTitle>
            <DialogDescription>
              Select a project and choose findings to import into this project.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">Select Source Project</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-10 pr-4 py-2 bg-surface border border-outline rounded-lg text-on-surface"
                />
              </div>
              <select
                value={selectedSourceProjectId || ''}
                onChange={(e) => setSelectedSourceProjectId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full mt-2 px-3 py-2 bg-surface border border-outline rounded-lg text-on-surface"
              >
                <option value="">Select a project</option>
                {filteredProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.client_name ? `(${project.client_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedSourceProjectId && (
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-on-surface">
                    Available Findings ({sourceFindings.length})
                  </label>
                  {sourceFindings.length > 0 && (
                    <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFindings.length === sourceFindings.length && sourceFindings.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                      Select All
                    </label>
                  )}
                </div>

                {isLoadingFindings ? (
                  <div className="flex items-center gap-2 p-4 text-on-surface-variant">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading findings...
                  </div>
                ) : sourceFindings.length > 0 ? (
                  <div className="flex-1 overflow-y-auto space-y-2 max-h-64 border border-outline rounded-lg p-2">
                    {sourceFindings.map((finding) => (
                      <div
                        key={finding.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface border border-transparent hover:border-outline"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFindings.includes(finding.id)}
                          onChange={() => toggleFinding(finding.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-on-surface font-medium truncate">{finding.title}</div>
                          <div className="text-xs text-on-surface-variant">
                            {finding.affected_target || 'No target'}
                          </div>
                        </div>
                        {finding.finding_type === 'false_positive' && (
                          <span className="px-2 py-1 text-xs rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            FP
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded ${severityColors[finding.severity] || ''}`}>
                          {finding.severity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewFinding(finding)}
                          className="border-outline text-on-surface-variant"
                        >
                          Preview
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-center py-4">No approved findings in this project</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} className="border-outline text-on-surface-variant">
              Cancel
            </Button>
            <Button
              onClick={handleImportFindings}
              disabled={selectedFindings.length === 0 || isImporting}
              className="bg-primary text-surface hover:bg-primary/90 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Import {selectedFindings.length > 0 ? `(${selectedFindings.length})` : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewFinding} onOpenChange={() => setPreviewFinding(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{previewFinding?.title}</DialogTitle>
              <span
                className={`px-2 py-1 text-xs rounded ${severityColors[previewFinding?.severity || ''] || ''}`}
              >
                {previewFinding?.severity}
              </span>
            </div>
            <DialogDescription>
              {previewFinding?.affected_target || 'Preview finding details'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">{previewFinding && renderFindingPreview(previewFinding)}</div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewFinding(null)} className="border-outline text-on-surface-variant">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImportFindingsDialog;