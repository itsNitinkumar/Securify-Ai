import { Card } from '@/components/ui/card';
import { User, Briefcase, Bug } from 'lucide-react';

interface SearchReporterCardProps {
  reporter: {
    id: number;
    name: string;
    email: string;
    project_count: number;
    finding_count: number;
  };
}

const SearchReporterCard = ({ reporter }: SearchReporterCardProps) => (
  <Card className="p-4 bg-surface rounded-lg border border-outline-variant">
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-full bg-primary/10">
        <User className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-medium text-on-surface">{reporter.name}</h4>
        <p className="text-xs text-on-surface-variant truncate">{reporter.email}</p>
        <div className="flex gap-4 mt-2 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> {reporter.project_count} projects
          </span>
          <span className="flex items-center gap-1">
            <Bug className="w-3 h-3" /> {reporter.finding_count} findings
          </span>
        </div>
      </div>
    </div>
  </Card>
);

export default SearchReporterCard;
