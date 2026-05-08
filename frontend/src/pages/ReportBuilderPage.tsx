import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { projectApi, Project } from '@/api/projectApi';
import { findingApi, Finding } from '@/api/findingApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ReportPreview } from '@/components/reports/ReportPreview';
import { ReportGenerator } from '@/components/reports/ReportGenerator';

const ReportBuilderPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFindings, setSelectedFindings] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreview] = useState(true);

  const severityOrder: Record<string, number> = {
    Critical: 0,
    High: 1,
    Medium: 2,
    Low: 3,
    Informational: 4,
  };

  const approvedFindings = useMemo(
    () =>
      findings
        .filter((finding) => finding.status === 'approved')
        .sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5)),
    [findings]
  );

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projectRes, findingsRes] = await Promise.all([
        projectApi.getProject(parseInt(projectId!)),
        findingApi.getAll({ project_id: parseInt(projectId!) }),
      ]);
      setProject(projectRes.data);
      const findingsData = (findingsRes.data.data || findingsRes.data) as Finding[];
      setFindings(findingsData);
      // Auto-select approved findings
      const approvedIds = findingsData
        .filter((f: Finding) => f.status === 'approved')
        .map((f: Finding) => f.id);
      setSelectedFindings(approvedIds);
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFinding = (findingId: number) => {
    setSelectedFindings((current) =>
      current.includes(findingId)
        ? current.filter((id) => id !== findingId)
        : [...current, findingId]
    );
  };

  const handleSelectAllApproved = () => {
    setSelectedFindings(approvedFindings.map((finding) => finding.id));
  };

  const handleClearSelected = () => {
    setSelectedFindings([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-on-surface-variant">Loading report builder...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <Card className="p-12 text-center bg-surface-high border-outline">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-on-surface mb-2">Project not found</h3>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/projects')}
          className="mb-4 text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <FileText className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
                {project.name}
              </h1>
            </div>
            <p className="text-sm md:text-base text-on-surface-variant">
              Client: {project.client_name || 'N/A'} • {selectedFindings.length} findings selected
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => navigate('/projects')}
              variant="outline"
              className="border-outline text-on-surface-variant hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 md:p-6 bg-surface-high border border-outline rounded-lg shadow">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-on-surface">Select Findings</h2>
                <p className="text-sm text-on-surface-variant mt-1">Choose which approved findings should be included in preview, PDF, and DOCX exports.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleSelectAllApproved} variant="outline" className="border-outline text-on-surface-variant hover:text-primary">
                  Select All Approved
                </Button>
                <Button type="button" onClick={handleClearSelected} variant="outline" className="border-outline text-on-surface-variant hover:text-primary">
                  Clear Selection
                </Button>
              </div>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {approvedFindings.length === 0 ? (
                <div className="rounded-lg border border-dashed border-outline p-6 text-sm text-on-surface-variant">
                  No approved findings available for this project.
                </div>
              ) : (
                approvedFindings.map((finding) => {
                  const isSelected = selectedFindings.includes(finding.id);
                  const sevColors: Record<string, string> = {
                    Critical: 'bg-red-500 text-surface',
                    High: 'bg-orange-500 text-surface',
                    Medium: 'bg-yellow-500 text-surface',
                    Low: 'bg-blue-500 text-surface',
                    Informational: 'bg-gray-500 text-surface',
                  };
                  return (
                    <label
                      key={finding.id}
                      className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${isSelected ? 'border-green-500 bg-green-500/10' : 'border-outline-variant bg-surface hover:bg-surface-variant'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleFinding(finding.id)}
                        className="mt-1 h-4 w-4 rounded border-outline-variant accent-green-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <p className="font-semibold text-on-surface break-words">{finding.title}</p>
                          <span className={`inline-flex w-fit rounded px-2.5 py-1 text-xs font-bold ${sevColors[finding.severity] || 'bg-gray-500 text-surface'}`}>
                            {finding.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-on-surface-variant break-all">{finding.affected_target || 'No affected asset provided'}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </Card>

          {/* Report Preview */}
          {showPreview && (
            <ReportPreview
              projectName={project.name}
              clientName={project.client_name}
              findings={approvedFindings}
              selectedFindingIds={selectedFindings}
              isLoading={loading}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Report Generator */}
          <ReportGenerator
            projectId={parseInt(projectId!)}
            projectName={project.name}
            selectedFindingIds={selectedFindings}
          />

          {/* Quick Stats */}
          <Card className="p-4 md:p-6 bg-surface-high border border-outline rounded-lg shadow">
            <h3 className="text-sm font-semibold text-on-surface mb-4">Report Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">Total Findings</span>
                <span className="text-sm font-semibold text-on-surface">
                  {selectedFindings.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">Critical</span>
                <span className="text-sm font-semibold text-red-400">
                  {findings.filter((f) => f.severity === 'Critical' && selectedFindings.includes(f.id)).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">High</span>
                <span className="text-sm font-semibold text-orange-400">
                  {findings.filter((f) => f.severity === 'High' && selectedFindings.includes(f.id)).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">Medium</span>
                <span className="text-sm font-semibold text-yellow-400">
                  {findings.filter((f) => f.severity === 'Medium' && selectedFindings.includes(f.id)).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">Low</span>
                <span className="text-sm font-semibold text-blue-400">
                  {findings.filter((f) => f.severity === 'Low' && selectedFindings.includes(f.id)).length}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilderPage;
