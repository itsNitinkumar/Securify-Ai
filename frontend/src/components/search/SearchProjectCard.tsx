import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar, User, Building2, FileText, Bug, FolderOpen, Shield } from 'lucide-react';

interface ProjectFinding {
  id: number;
  title: string;
  severity: string;
  created_at: string;
}

interface SearchProjectCardProps {
  project: {
    id: number;
    name: string;
    client_name?: string;
    status: string;
    reporter_name?: string;
    template_name?: string;
    created_at: string;
    start_date?: string;
    end_date?: string;
    findings_count?: number;
    findings?: ProjectFinding[];
  };
  onNavigate: (id: number) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  pending_review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  pending_comment_resolution: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
};

const severityColors: Record<string, string> = {
  Critical: 'text-red-400 bg-red-500/10',
  High: 'text-orange-400 bg-orange-500/10',
  Medium: 'text-yellow-400 bg-yellow-500/10',
  Low: 'text-blue-400 bg-blue-500/10',
  Informational: 'text-gray-400 bg-gray-500/10',
};

const formatDate = (d?: string) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' } as any);
  } catch {
    return d;
  }
};

const SearchProjectCard = ({ project, onNavigate }: SearchProjectCardProps) => {
  const findings = project.findings as ProjectFinding[] | undefined;
  return (
    <Card className="p-4 bg-surface rounded-lg border border-outline-variant hover:border-primary/30 transition-all group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />
          <h4 className="text-sm font-medium text-on-surface truncate">{project.name}</h4>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {project.findings_count !== undefined && (
            <Badge variant="outline" className="text-xs border-outline-variant">
              <Bug className="w-3 h-3 mr-1" />{project.findings_count}
            </Badge>
          )}
          <Badge className={`text-xs flex-shrink-0 ${statusColors[project.status] || statusColors.draft}`}>
            {project.status?.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-xs text-on-surface-variant mb-3">
        {project.client_name && (
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{project.client_name}</span>
          </span>
        )}
        {project.reporter_name && (
          <span className="flex items-center gap-1.5">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{project.reporter_name}</span>
          </span>
        )}
        {project.template_name && (
          <span className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{project.template_name}</span>
          </span>
        )}
        {formatDate(project.start_date) && (
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{formatDate(project.start_date)}</span>
          </span>
        )}
        {formatDate(project.created_at) && (
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>Created {formatDate(project.created_at)}</span>
          </span>
        )}
      </div>

      {findings && findings.length > 0 && (
        <div className="border-t border-outline/30 pt-2 space-y-1.5">
          {findings.map((f) => (
            <div key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface/50 border border-outline/20 text-xs">
              <Shield className={`w-3 h-3 flex-shrink-0 ${severityColors[f.severity]?.split(' ')[0] || 'text-gray-400'}`} />
              <span className="flex-1 truncate text-on-surface font-medium">{f.title}</span>
              <Badge className={`text-[10px] px-1.5 py-0 h-4 ${severityColors[f.severity] || ''}`}>
                {f.severity?.toUpperCase()}
              </Badge>
              <span className="text-on-surface-variant whitespace-nowrap">{formatDate(f.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={() => onNavigate(project.id)}
        className="h-7 px-2 text-primary hover:text-primary/80 text-xs opacity-0 group-hover:opacity-100 transition-opacity mt-2">
        <ExternalLink className="w-3 h-3 mr-1" /> View Project
      </Button>
    </Card>
  );
};

export default SearchProjectCard;
