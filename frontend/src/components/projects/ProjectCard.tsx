import { FolderOpen, Calendar, User, AlertTriangle, ExternalLink } from 'lucide-react';
import { Project } from '@/api/projectApi';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusColors = {
    active: 'bg-primary/10 text-primary border-primary/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
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
              {project.client_name && (
                <p className="text-xs text-on-surface-variant line-clamp-1">
                  {project.client_name}
                </p>
              )}
            </div>
          </div>
          {project.status && (
            <Badge
              className={`text-xs flex-shrink-0 ${
                statusColors[project.status as keyof typeof statusColors] ||
                statusColors.pending
              }`}
            >
              {project.status.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">
            {project.description}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-surface rounded-lg border border-outline-variant">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3 h-3 text-error" />
              <span className="text-xs text-on-surface-variant">Critical</span>
            </div>
            <div className="text-lg font-bold text-error font-technical">
              {project.critical_count || 0}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3 h-3 text-orange-400" />
              <span className="text-xs text-on-surface-variant">High</span>
            </div>
            <div className="text-lg font-bold text-orange-400 font-technical">
              {project.high_count || 0}
            </div>
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
