import { FileText, Eye, Plus } from 'lucide-react';
import { FindingTemplate } from '@/api/findingLibraryApi';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TemplateCardProps {
  template: FindingTemplate;
  onClick: () => void;
}

const severityColors = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  info: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const TemplateCard = ({ template, onClick }: TemplateCardProps) => {
  return (
    <Card
      className="bg-surface-high border-outline hover:border-primary/50 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <Badge
              className={`text-xs font-medium ${
                severityColors[template.severity]
              }`}
            >
              {template.severity.toUpperCase()}
            </Badge>
          </div>
          {template.is_public && (
            <Badge variant="outline" className="text-xs border-outline-variant">
              PUBLIC
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-on-surface mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {template.title}
        </h3>

        {/* Category */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-xs border-outline text-on-surface-variant">
            {template.category}
          </Badge>
          {template.owasp_category && (
            <Badge variant="outline" className="text-xs border-outline text-on-surface-variant">
              {template.owasp_category}
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-on-surface-variant line-clamp-3 mb-4">
          {template.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
          <div className="flex items-center gap-2">
            {template.cvss_score && (
              <span className="text-xs text-on-surface-variant">
                CVSS: <span className="text-primary font-medium">{template.cvss_score}</span>
              </span>
            )}
            {template.cwe_id && (
              <span className="text-xs text-on-surface-variant">
                {template.cwe_id}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-on-surface-variant hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              className="h-8 px-3 bg-primary/10 text-primary hover:bg-primary hover:text-surface"
              onClick={(e) => {
                e.stopPropagation();
                // Handle insert into report
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Insert
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TemplateCard;
