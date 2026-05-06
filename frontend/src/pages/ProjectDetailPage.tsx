import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle, ExternalLink, Plus, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authApi } from '@/api/authApi';
import { projectApi } from '@/api/projectApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

type ProjectWithFindings = {
  id: number;
  name: string;
  description?: string;
  client_name?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  findings: Array<{ id: number; title: string; severity: string; status: string; created_at: string }>;
};

const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [project, setProject] = useState<ProjectWithFindings | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    void load();
  }, [projectId]);

  const load = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [projectRes, profileRes] = await Promise.all([
        projectApi.getProjectWithFindings(Number.parseInt(projectId, 10)),
        authApi.getProfile(),
      ]);
      const loadedProject = (projectRes as any)?.data || projectRes;
      const userData = (profileRes.data as any)?.data || (profileRes.data as any)?.user || profileRes.data;
      setCurrentUserRole(userData?.role || '');
      setProject({
        ...(loadedProject as any),
        findings: Array.isArray((loadedProject as any)?.findings) ? (loadedProject as any).findings : [],
      });
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    // No browser dialogs. If we need confirmation, add an explicit in-page confirmation step.
    try {
      setDeleting(true);
      await projectApi.deleteProject(project.id);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const statusColors = {
    active: 'bg-primary/10 text-primary border-primary/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };

  const severityBadge = (severity: string) => {
    if (severity === 'Critical') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (severity === 'High') return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    if (severity === 'Medium') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (severity === 'Low') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const visibleFindings = useMemo(() => {
    if (!project) return [];
    if (currentUserRole === 'client') {
      return project.findings.filter((finding) => finding.status === 'approved');
    }
    return project.findings;
  }, [project, currentUserRole]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          <p className="mt-4 text-on-surface-variant">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
        <Button variant="ghost" onClick={() => navigate('/projects')} className="mb-4 text-on-surface-variant hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <Card className="p-8 bg-surface-high border-outline">
          <h1 className="text-xl font-semibold text-on-surface">Project not found</h1>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      <Button variant="ghost" onClick={() => navigate('/projects')} className="mb-4 text-on-surface-variant hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Projects
      </Button>

      <div className="mb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {project.status ? (
              <Badge className={statusColors[project.status as keyof typeof statusColors] || statusColors.pending}>
                {project.status.toUpperCase()}
              </Badge>
            ) : null}
            {project.client_name ? (
              <Badge variant="outline" className="border-outline text-on-surface-variant">
                {project.client_name}
              </Badge>
            ) : null}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2 truncate">{project.name}</h1>
          <p className="text-sm text-on-surface-variant">
            Created {new Date(project.created_at).toLocaleDateString()} • Updated {new Date(project.updated_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(currentUserRole === 'analyst' || currentUserRole === 'manager') ? (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/projects/${project.id}/findings/new`)}
                className="border-outline text-on-surface-variant hover:text-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Finding
              </Button>
              <Button
                onClick={() => navigate(`/projects/${project.id}/findings/generate`)}
                className="bg-primary text-surface hover:bg-primary/90"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate with AI
              </Button>
            </>
          ) : null}
          {(currentUserRole === 'manager' || currentUserRole === 'client') ? (
            <Button
              onClick={() => navigate(`/projects/${project.id}/report`)}
              className="bg-primary text-surface hover:bg-primary/90"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {currentUserRole === 'client' ? 'Download Report' : 'View Full Report'}
            </Button>
          ) : null}
        </div>
      </div>

      {project.description ? (
        <Card className="mb-6 p-4 bg-surface-high border-outline">
          <h3 className="text-sm font-semibold text-on-surface mb-2">Description</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{project.description}</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-on-surface">Recent Findings</h2>
            <span className="text-xs text-on-surface-variant">{visibleFindings.length} total</span>
          </div>

          {visibleFindings.length > 0 ? (
            <div className="space-y-2">
              {visibleFindings.slice(0, 10).map((finding) => (
                <Card
                  key={finding.id}
                  className="p-3 bg-surface-high border-outline-variant hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/findings/${finding.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-on-surface line-clamp-1">{finding.title}</h4>
                        <Badge className={`text-xs ${severityBadge(finding.severity)}`}>{finding.severity}</Badge>
                      </div>
                      <p className="text-xs text-on-surface-variant">Created {new Date(finding.created_at).toLocaleDateString()}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 text-primary hover:text-primary/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/findings/${finding.id}`);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center bg-surface-high border-outline">
              <CheckCircle className="w-12 h-12 text-on-surface-variant mx-auto mb-3 opacity-50" />
              <p className="text-sm text-on-surface-variant">No findings yet</p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-4 bg-surface-high border-outline">
            <h3 className="text-sm font-semibold text-on-surface mb-3">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-error" />
                  <span className="text-xs text-on-surface-variant">High Priority</span>
                </div>
                <div className="text-lg font-bold text-on-surface font-technical">
                  {project.findings.filter((f) => f.severity === 'Critical' || f.severity === 'High').length}
                </div>
              </div>
              <div className="p-3 bg-surface rounded-lg border border-outline-variant">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-xs text-on-surface-variant">Approved</span>
                </div>
                <div className="text-lg font-bold text-on-surface font-technical">
                  {project.findings.filter((f) => f.status === 'approved').length}
                </div>
              </div>
            </div>
          </Card>

          {currentUserRole === 'manager' ? (
            <Card className="p-4 bg-surface-high border-outline">
              <h3 className="text-sm font-semibold text-on-surface mb-3">Project Actions</h3>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full border-error/30 text-error hover:bg-error/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete Project'}
              </Button>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
