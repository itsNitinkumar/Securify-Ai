import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Eye } from 'lucide-react';
import { Finding } from '@/api/findingApi';

interface FindingsSectionProps {
  findings: Finding[];
  selectedFindings: number[];
  onSelectionChange: (ids: number[]) => void;
  isEditable: boolean;
}

const severityColors = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  info: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const FindingsSection = ({
  findings,
  selectedFindings,
  onSelectionChange,
  isEditable,
}: FindingsSectionProps) => {
  const toggleFinding = (id: number) => {
    if (selectedFindings.includes(id)) {
      onSelectionChange(selectedFindings.filter((fid) => fid !== id));
    } else {
      onSelectionChange([...selectedFindings, id]);
    }
  };

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface">
          Detailed Findings ({selectedFindings.length})
        </h3>
        {isEditable && (
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            <Plus className="w-4 h-4 mr-2" />
            Add Finding
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {findings.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant text-sm">
            No findings available for this project
          </div>
        ) : (
          findings.map((finding) => {
            const isSelected = selectedFindings.includes(finding.id);
            return (
              <div
                key={finding.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-outline-variant hover:border-outline'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isEditable && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFinding(finding.id)}
                      className="mt-1 w-4 h-4 rounded border-outline bg-surface text-primary focus:ring-2 focus:ring-primary flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-sm font-medium text-on-surface line-clamp-2">
                        {finding.title}
                      </h4>
                      <Badge className={`text-xs flex-shrink-0 ${severityColors[finding.severity]}`}>
                        {finding.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mb-2">
                      {finding.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-xs border-outline-variant"
                      >
                        {finding.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-primary hover:text-primary/80"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default FindingsSection;
