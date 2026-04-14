import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Activity, ExternalLink, Search } from 'lucide-react';

interface SearchResultsProps {
  results: {
    findings: any[];
    reports: any[];
    activities: any[];
  };
  loading: boolean;
  query: string;
}

const severityColors = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  info: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const SearchResults = ({ results, loading, query }: SearchResultsProps) => {
  if (loading) {
    return (
      <Card className="p-12 text-center bg-surface-high border-outline">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-on-surface-variant">Searching...</p>
      </Card>
    );
  }

  if (!query) {
    return (
      <Card className="p-12 text-center bg-surface-high border-outline">
        <Search className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">Start Your Search</h3>
        <p className="text-on-surface-variant">
          Use natural language to search across findings, reports, and activity logs
        </p>
      </Card>
    );
  }

  const totalResults = results.findings.length + results.reports.length + results.activities.length;

  if (totalResults === 0) {
    return (
      <Card className="p-12 text-center bg-surface-high border-outline">
        <Search className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">No Results Found</h3>
        <p className="text-on-surface-variant">Try adjusting your search query or filters</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Findings */}
      {results.findings.length > 0 && (
        <Card className="p-4 md:p-6 bg-surface-high border-outline">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-on-surface">
              Findings ({results.findings.length})
            </h3>
          </div>
          <div className="space-y-3">
            {results.findings.map((finding: any) => (
              <div
                key={finding.id}
                className="p-4 bg-surface rounded-lg border border-outline-variant hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-sm font-medium text-on-surface line-clamp-1">
                    {finding.title}
                  </h4>
                  <Badge
                    className={`text-xs flex-shrink-0 ${
                      severityColors[finding.severity as keyof typeof severityColors]
                    }`}
                  >
                    {finding.severity?.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-on-surface-variant line-clamp-2 mb-3">
                  {finding.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-outline-variant">
                      {finding.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-xs text-on-surface-variant">
                      {finding.created_at && new Date(finding.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Reports */}
      {results.reports.length > 0 && (
        <Card className="p-4 md:p-6 bg-surface-high border-outline">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-on-surface">
              Reports ({results.reports.length})
            </h3>
          </div>
          <div className="space-y-3">
            {results.reports.map((report: any, index: number) => (
              <div
                key={index}
                className="p-4 bg-surface rounded-lg border border-outline-variant hover:border-primary/30 transition-all"
              >
                <p className="text-sm text-on-surface">Report {index + 1}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Activity Logs */}
      {results.activities.length > 0 && (
        <Card className="p-4 md:p-6 bg-surface-high border-outline">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-on-surface">
              Activity Logs ({results.activities.length})
            </h3>
          </div>
          <div className="space-y-3">
            {results.activities.map((activity: any, index: number) => (
              <div
                key={index}
                className="p-4 bg-surface rounded-lg border border-outline-variant"
              >
                <p className="text-sm text-on-surface">Activity {index + 1}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default SearchResults;
