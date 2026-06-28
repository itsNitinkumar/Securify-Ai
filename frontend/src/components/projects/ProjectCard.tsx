import { FolderOpen, Calendar, User, Building2, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { Project } from '@/api/projectApi';
import { projectApi } from '@/api/projectApi';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  canDelete?: boolean;
  onDeleted?: () => void;
}

const ProjectCard = ({ project, onClick, canDelete, onDeleted }: ProjectCardProps) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const count = project.findings_count || 0;
    const msg = count > 0
      ? `This project has ${count} finding${count !== 1 ? 's' : ''}. Deleting the project will also permanently delete all ${count} finding${count !== 1 ? 's' : ''}. Are you sure?`
      : 'Are you sure you want to delete this project?';
    if (!window.confirm(msg)) return;
    setDeleting(true);
    try {
      await projectApi.deleteProject(project.id);
      toast.success('Project deleted');
      onDeleted?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      case 'pending_review':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'pending_comment_resolution':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending_review': return 'Pending Review';
      case 'pending_comment_resolution': return 'Changes Requested';
      case 'completed': return 'Completed';
      default: return 'Draft';
    }
  };

  return (
    <Card
      className="bg-surface-high border-outline hover:border-primary/50 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-on-surface mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                {project.name}
              </h3>
            </div>
          </div>
          <Badge className={`text-xs flex-shrink-0 ${getStatusColor(project.status)}`}>
            {getStatusLabel(project.status)}
          </Badge>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">
            {project.description}
          </p>
        )}

        {/* Info Rows */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{project.client_name || 'No client'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {project.assigned_reporter_name || (project.assigned_reporter_id ? `Reporter #${project.assigned_reporter_id}` : 'Not assigned')}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
          <div className="flex items-center gap-4 text-xs text-on-surface-variant">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(project.created_at)}</span>
            </div>
            {project.findings_count !== undefined && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-on-surface">
                  {project.findings_count}
                </span>
                <span>findings</span>
              </div>
            )}
          </div>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-error hover:text-error/80"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-primary hover:text-primary/80"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProjectCard;
