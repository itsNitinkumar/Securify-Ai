import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Share2,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { projectApi, Project } from '@/api/projectApi';
import { findingApi, Finding } from '@/api/findingApi';
import { reportApi } from '@/api/reportApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReportMetadata from '@/components/reports/ReportMetadata';
import ExecutiveSummary from '@/components/reports/ExecutiveSummary';
import FindingsSection from '@/components/reports/FindingsSection';
import ExportControls from '@/components/reports/ExportControls';
import WorkflowStages from '@/components/reports/WorkflowStages';

type ReportStage = 'drafting' | 'peer_review' | 'manager_approval' | 'published';

const ReportBuilderPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFindings, setSelectedFindings] = useState<number[]>([]);
  const [currentStage, setCurrentStage] = useState<ReportStage>('drafting');
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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
      setFindings(findingsRes.data.data || findingsRes.data);
      // Auto-select approved findings
      const findingsData = findingsRes.data.data || findingsRes.data;
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

  const handleGenerateReport = async (format: 'docx' | 'pdf', options: any) => {
    try {
      setGenerating(true);
      const response = await reportApi.generateReport({
        project_id: parseInt(projectId!),
        format,
        ...options,
      });
      
      // Use the reportId to download the file via axios
      if (response.data?.reportId) {
        const reportId = response.data.reportId;
        
        // Download the file using axios with blob response
        const blob = await reportApi.downloadReport(reportId);
        
        // Create a blob URL and trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${project?.name || 'report'}_${new Date().getTime()}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        alert(`Report downloaded successfully as ${format.toUpperCase()}`);
      } else {
        alert(`Report generated successfully as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleStageChange = (stage: ReportStage) => {
    setCurrentStage(stage);
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
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
                Report Builder
              </h1>
            </div>
            <p className="text-sm md:text-base text-on-surface-variant">
              {project.name} • {selectedFindings.length} findings selected
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => navigate('/projects')}
              variant="secondary"
              className="border-outline text-on-surface-variant"
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
          {/* Report Metadata */}
          <ReportMetadata project={project} findingsCount={selectedFindings.length} />

          {/* Executive Summary */}
          <ExecutiveSummary
            value={executiveSummary}
            onChange={setExecutiveSummary}
            isEditable={true}
          />

          {/* Findings Section */}
          <FindingsSection
            findings={findings}
            selectedFindings={selectedFindings}
            onSelectionChange={setSelectedFindings}
            isEditable={true}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Export Controls */}
          <ExportControls
            onGenerate={handleGenerateReport}
            generating={generating}
            disabled={selectedFindings.length === 0}
          />

          {/* Quick Stats */}
          <Card className="p-4 md:p-6 bg-surface-high border-outline">
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
                <span className="text-sm font-semibold text-error">
                  {findings.filter((f) => f.severity === 'critical' && selectedFindings.includes(f.id)).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">High</span>
                <span className="text-sm font-semibold text-orange-400">
                  {findings.filter((f) => f.severity === 'high' && selectedFindings.includes(f.id)).length}
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
