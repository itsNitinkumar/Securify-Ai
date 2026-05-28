import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { projectApi, Project } from '@/api/projectApi';
import { findingApi, Finding } from '@/api/findingApi';
import { Button } from '@/components/ui/button';
import { ReportPreview } from '@/components/reports/ReportPreview';
import { ReportGenerator } from '@/components/reports/ReportGenerator';

const ReportBuilderPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFindings, setSelectedFindings] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const severityOrder: Record<string, number> = {
    Critical: 0,
    High: 1,
    Medium: 2,
    Low: 3,
    Informational: 4,
  };

  const allFindingsSorted = useMemo(
    () =>
      [...findings]
        .sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5)),
    [findings]
  );

  const findingsBySeverity = useMemo(() => {
    const groups: Record<string, Finding[]> = {
      Critical: [],
      High: [],
      Medium: [],
      Low: [],
      Informational: [],
      None: [],
    };
    allFindingsSorted.forEach(f => {
      if (groups[f.severity]) {
        groups[f.severity].push(f);
      }
    });
    return groups;
  }, [allFindingsSorted]);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId, refreshKey]);

  useEffect(() => {
    if (location.state?.refresh) {
      setRefreshKey(k => k + 1);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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
      const approvedIds = findingsData.filter((f: Finding) => f.status === 'approved').map((f: Finding) => f.id);
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

  const handleSelectAll = () => {
    const approvedIds = allFindingsSorted.filter(f => f.status === 'approved').map(f => f.id);
    setSelectedFindings(approvedIds);
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
        <div className="text-center">
          <p className="text-on-surface-variant">Project not found</p>
        </div>
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
              type="button"
              onClick={handleSelectAll}
              variant="outline"
              className="border-outline text-on-surface-variant hover:text-primary"
            >
              Select All
            </Button>
            <Button
              type="button"
              onClick={handleClearSelected}
              variant="outline"
              className="border-outline text-on-surface-variant hover:text-primary"
            >
              Clear Selection
            </Button>
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

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Report Preview */}
        <div className="lg:col-span-1">
          <div className="h-full overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            <ReportPreview
              projectName={project.name}
              clientName={project.client_name}
              findings={allFindingsSorted.filter(f => selectedFindings.includes(f.id))}
              selectedFindingIds={selectedFindings}
              isLoading={loading}
              projectId={parseInt(projectId!)}
              projectTemplateId={project.template_id}
            />
          </div>
        </div>

        {/* Right Side - Finding Selector & Report Generator */}
        <div className="lg:col-span-1 space-y-4">
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {allFindingsSorted.length === 0 ? (
              <div className="rounded-lg border border-dashed border-outline p-6 text-sm text-on-surface-variant">
                No findings available for this project.
              </div>
            ) : (
              Object.entries(findingsBySeverity).map(([severity, severityFindings]) => {
                if (severityFindings.length === 0) return null;
                const sevColors: Record<string, string> = {
                  Critical: 'bg-red-500 text-surface',
                  High: 'bg-orange-500 text-surface',
                  Medium: 'bg-yellow-500 text-surface',
                  Low: 'bg-blue-500 text-surface',
                  Informational: 'bg-gray-500 text-surface',
                  None: 'bg-purple-500 text-surface',
                };
                const sevLabels: Record<string, string> = {
                  None: 'False Positive',
                };
                return (
                  <div key={severity}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex rounded px-2.5 py-1 text-xs font-bold ${sevColors[severity]}`}>
                        {sevLabels[severity] || severity}
                      </span>
                      <span className="text-sm text-on-surface-variant">{severityFindings.length} finding(s)</span>
                    </div>
                    <div className="space-y-2">
                      {severityFindings.map((finding) => {
                        const isSelected = selectedFindings.includes(finding.id);
                        const statusBadge = finding.status === 'draft' 
                          ? <span className="ml-2 px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">Draft</span>
                          : finding.status === 'pending_review'
                          ? <span className="ml-2 px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">Pending</span>
                          : finding.status === 'approved'
                          ? <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">Approved</span>
                          : null;
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
                              <p className="font-semibold text-on-surface break-words">{finding.title}{statusBadge}</p>
                              <p className="mt-1 text-sm text-on-surface-variant break-all">{finding.affected_target || 'No affected asset provided'}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Report Generator */}
          <ReportGenerator
            projectId={parseInt(projectId!)}
            projectName={project.name}
            selectedFindingIds={selectedFindings}
            projectTemplateId={project.template_id}
          />
        </div>
      </div>
    </div>
  );
};

export default ReportBuilderPage;