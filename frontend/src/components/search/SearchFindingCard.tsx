import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar, User, Building2, FileText, Shield } from 'lucide-react';

interface SearchFindingCardProps {
  finding: {
    id: number;
    title: string;
    severity: string;
    status: string;
    finding_type?: string;
    project_name?: string;
    client_name?: string;
    reporter_name?: string;
    created_at: string;
    template_name?: string;
  };
  onNavigate: (id: number) => void;
}

const severityColors: Record<string, string> = {
  Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Informational: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const severityIcons: Record<string, any> = {
  Critical: Shield,
  High: Shield,
  Medium: Shield,
  Low: Shield,
  Informational: Shield,
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  pending_review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  changes_requested: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
};

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', yyyy: 'numeric' } as any);
  } catch {
    return d;
  }
};

const SearchFindingCard = ({ finding, onNavigate }: SearchFindingCardProps) => {
  const SevIcon = severityIcons[finding.severity] || Shield;
  return (
    <Card className="p-4 bg-surface rounded-lg border border-outline-variant hover:border-primary/30 transition-all group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <SevIcon className={`w-4 h-4 flex-shrink-0 ${finding.severity === 'Critical' ? 'text-red-400' : finding.severity === 'High' ? 'text-orange-400' : finding.severity === 'Medium' ? 'text-yellow-400' : finding.severity === 'Low' ? 'text-blue-400' : 'text-gray-400'}`} />
          <h4 className="text-sm font-medium text-on-surface truncate">{finding.title}</h4>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {finding.finding_type === 'false_positive' && (
            <Badge className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">FP</Badge>
          )}
          <Badge className={`text-xs ${severityColors[finding.severity] || ''}`}>
            {finding.severity?.toUpperCase()}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-xs text-on-surface-variant mb-3">
        {finding.project_name && (
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{finding.project_name}</span>
          </span>
        )}
        {finding.client_name && (
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{finding.client_name}</span>
          </span>
        )}
        {finding.reporter_name && (
          <span className="flex items-center gap-1.5">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{finding.reporter_name}</span>
          </span>
        )}
        {finding.template_name && (
          <span className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{finding.template_name}</span>
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span>{formatDate(finding.created_at)}</span>
        </span>
        <Badge variant="outline" className="text-xs border-outline-variant justify-self-start">
          {finding.status?.replace(/_/g, ' ').toUpperCase()}
        </Badge>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onNavigate(finding.id)}
        className="h-7 px-2 text-primary hover:text-primary/80 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="w-3 h-3 mr-1" /> View Finding
      </Button>
    </Card>
  );
};

export default SearchFindingCard;
