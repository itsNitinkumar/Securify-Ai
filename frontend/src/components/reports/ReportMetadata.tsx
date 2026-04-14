import { Card } from '@/components/ui/card';
import { Calendar, User, FolderOpen, AlertTriangle } from 'lucide-react';
import { Project } from '@/api/projectApi';

interface ReportMetadataProps {
  project: Project;
  findingsCount: number;
}

const ReportMetadata = ({ project, findingsCount }: ReportMetadataProps) => {
  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <h3 className="text-sm font-semibold text-on-surface mb-4">Report Metadata</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <FolderOpen className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-on-surface-variant mb-1">Project</p>
            <p className="text-sm font-medium text-on-surface">{project.name}</p>
          </div>
        </div>

        {project.client_name && (
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-on-surface-variant flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-on-surface-variant mb-1">Client</p>
              <p className="text-sm font-medium text-on-surface">{project.client_name}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-on-surface-variant flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-on-surface-variant mb-1">Report Date</p>
            <p className="text-sm font-medium text-on-surface">
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-on-surface-variant mb-1">Total Findings</p>
            <p className="text-sm font-medium text-on-surface">{findingsCount}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ReportMetadata;
