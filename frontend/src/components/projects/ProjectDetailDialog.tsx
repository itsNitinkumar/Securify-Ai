import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, ExternalLink, AlertTriangle, CheckCircle, Plus, Sparkles } from 'lucide-react';
import { Project, projectApi } from '@/api/projectApi';
import { authApi } from '@/api/authApi';
import { templateKeyFromProject } from '@/reportTemplates/registry';
import CreateFindingDialog from '@/components/findings/CreateFindingDialog';
import FindingViewer from '@/components/findings/FindingViewer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface ProjectDetailDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const ProjectDetailDialog = ({
  project,
  open,
  onOpenChange,
  onUpdate,
}: ProjectDetailDialogProps) => {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isCreateFindingOpen, setIsCreateFindingOpen] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState<number | null>(null);
  const [isFindingViewerOpen, setIsFindingViewerOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<number>(0);

  useEffect(() => {
    if (open && project.id) {
      loadProjectDetails();
      loadCurrentUser();
    }
  }, [open, project.id]);

  const loadCurrentUser = async () => {
    try {
      const response = await authApi.getProfile();
      const userData = response.data.data || response.data;
      if (userData && typeof userData === 'object') {
        setCurrentUserRole((userData as any).role || '');
        setCurrentUserId((userData as any).id || 0);
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadProjectDetails = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getProjectWithFindings(project.id);
      setProjectDetails(response.data);
    } catch (error) {
      console.error('Failed to load project details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      await projectApi.deleteProject(project.id);
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusColors = {
    active: 'bg-primary/10 text-primary border-primary/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-high border-outline">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {project.status && (
                    <Badge
                      className={
                        statusColors[project.status as keyof typeof statusColors] ||
                        statusColors.pending
                      }
                    >
                      {project.status.toUpperCase()}
                    </Badge>
                  )}
                  {project.client_name && (
                    <Badge variant="outline" className="border-outline text-on-surface-variant">
                      {project.client_name}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-2xl text-on-surface">{project.name}</DialogTitle>
                <DialogDescription>View project details and information.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Project Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-surface rounded-lg border border-outline-variant">
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Created</p>
                <p className="text-sm text-on-surface">{formatDate(project.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Last Updated</p>
                <p className="text-sm text-on-surface">{formatDate(project.updated_at)}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Total Findings</p>
                <p className="text-lg font-semibold text-on-surface font-technical">
                  {project.findings_count || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Critical</p>
                <p className="text-lg font-semibold text-error font-technical">
                  {project.critical_count || 0}
                </p>
              </div>
            </div>

            {/* Description */}
            {project.description && (
              <div>
                <h3 className="text-sm font-semibold text-on-surface mb-2">Description</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {project.description}
                </p>
              </div>
            )}

            {/* Findings Summary */}
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : projectDetails?.findings && projectDetails.findings.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-on-surface">Recent Findings</h3>
                  {/* Only Analysts and Managers can create findings */}
                  {(currentUserRole === 'analyst' || currentUserRole === 'manager') && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsCreateFindingOpen(true)}
                        size="sm"
                        variant="ghost"
                        className="text-on-surface-variant hover:text-on-surface"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Manually
                      </Button>
                      {templateKeyFromProject(project) === 'dast' ? (
                        <>
                          <Button
                            onClick={() => navigate(`/projects/${project.id}/findings/generate?type=true_positive`)}
                            size="sm"
                            className="bg-primary text-surface hover:bg-primary/90"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate True Positive
                          </Button>
                          <Button
                            onClick={() => navigate(`/projects/${project.id}/findings/generate?type=false_positive`)}
                            size="sm"
                            className="bg-purple-500 text-surface hover:bg-purple-500/90"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate False Positive
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => navigate(`/projects/${project.id}/findings/generate`)}
                          size="sm"
                          className="bg-primary text-surface hover:bg-primary/90"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate with AI
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {projectDetails.findings
                    .filter((finding: any) => {
                      // Clients can only see approved findings
                      if (currentUserRole === 'client') {
                        return finding.status === 'approved';
                      }
                      return true;
                    })
                    .slice(0, 5)
                    .map((finding: any) => (
                    <Card
                      key={finding.id}
                      className="p-3 bg-surface border-outline-variant hover:border-primary/30 transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedFindingId(finding.id);
                        setIsFindingViewerOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-on-surface line-clamp-1">
                              {finding.title}
                            </h4>
                            <Badge
                              className={`text-xs ${finding.severity === 'Critical'
                                  ? 'bg-red-500/10 text-red-400'
                                  : finding.severity === 'High'
                                    ? 'bg-orange-500/10 text-orange-400'
                                    : finding.severity === 'Medium'
                                      ? 'bg-yellow-500/10 text-yellow-400'
                                      : finding.severity === 'Low'
                                        ? 'bg-blue-500/10 text-blue-400'
                                        : 'bg-gray-500/10 text-gray-400'
                                }`}
                            >
                              {finding.severity}
                            </Badge>
                            {finding.finding_type === 'false_positive' && (
                              <Badge className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">FP</Badge>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant line-clamp-2">
                            {finding.description && finding.description.trim() !== '' && finding.description !== 'See evidence for details'
                              ? (finding.description.length > 150
                                ? finding.description.substring(0, 150) + '...'
                                : finding.description)
                              : finding.affected_target
                                ? `Target: ${finding.affected_target}`
                                : finding.likelihood
                                  ? `Likelihood: ${finding.likelihood.substring(0, 50)}...`
                                  : 'Click to view details'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-shrink-0 text-primary hover:text-primary/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFindingId(finding.id);
                            setIsFindingViewerOpen(true);
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="p-8 text-center bg-surface border-outline-variant">
                <CheckCircle className="w-12 h-12 text-on-surface-variant mx-auto mb-3 opacity-50" />
                <p className="text-sm text-on-surface-variant mb-4">No findings yet</p>
                {/* Only Analysts and Managers can create findings */}
                {(currentUserRole === 'analyst' || currentUserRole === 'manager') && (
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => setIsCreateFindingOpen(true)}
                      variant="ghost"
                      className="border border-outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Manually
                    </Button>
                    {templateKeyFromProject(project) === 'dast' ? (
                      <>
                        <Button
                          onClick={() => navigate(`/projects/${project.id}/findings/generate?type=true_positive`)}
                          className="bg-primary text-surface hover:bg-primary/90"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate True Positive
                        </Button>
                        <Button
                          onClick={() => navigate(`/projects/${project.id}/findings/generate?type=false_positive`)}
                          className="bg-purple-500 text-surface hover:bg-purple-500/90"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate False Positive
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => navigate(`/projects/${project.id}/findings/generate`)}
                        className="bg-primary text-surface hover:bg-primary/90"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate with AI
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-surface border-outline-variant">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-error/10">
                    <AlertTriangle className="w-5 h-5 text-error" />
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant">High Priority</p>
                    <p className="text-xl font-bold text-on-surface font-technical">
                      {(project.critical_count || 0) + (project.high_count || 0)}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-surface border-outline-variant">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant">Completion</p>
                    <p className="text-xl font-bold text-on-surface font-technical">
                      {project.status === 'completed' ? '100%' : '0%'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-outline-variant mt-6">
            <div className="flex gap-2">
              {/* Only Managers can edit/delete projects */}
              {currentUserRole === 'manager' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-on-surface-variant hover:text-primary"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-error hover:bg-error/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
            {/* Only Managers and Clients can view/download reports */}
            {(currentUserRole === 'manager' || currentUserRole === 'client') && (
              <Button 
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/projects/${project.id}/report`);
                }}
                className="bg-primary text-surface hover:bg-primary/90"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {currentUserRole === 'client' ? 'Download Report' : 'View Full Report'}
              </Button>
            )}
          </div>
        </DialogContent>
        {/* Create Finding Dialog */}
      </Dialog>

      <CreateFindingDialog
        projectId={project.id}
        open={isCreateFindingOpen}
        onOpenChange={setIsCreateFindingOpen}
        onSuccess={loadProjectDetails}
      />

      {/* Finding Viewer Dialog */}
      {selectedFindingId && (
        <FindingViewer
          findingId={selectedFindingId}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          open={isFindingViewerOpen}
          onOpenChange={setIsFindingViewerOpen}
          onUpdate={loadProjectDetails}
        />
      )}
    </>
  );
};

export default ProjectDetailDialog;
