import { Search, FolderOpen, Bug, Users, Building2, FileText, Activity, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import SearchProjectCard from './SearchProjectCard';
import SearchFindingCard from './SearchFindingCard';
import SearchReporterCard from './SearchReporterCard';
import SearchUserCard from './SearchUserCard';
import SearchAnalyticsCard from './SearchAnalyticsCard';

interface SearchResultsProps {
  results: any[];
  entity: string;
  analytics: any;
  loading: boolean;
  query: string;
  parsed: any;
  onNavigate: (id: number) => void;
}

const entityConfig: Record<string, { icon: any; label: string; color: string }> = {
  projects: { icon: FolderOpen, label: 'Projects', color: 'text-blue-400' },
  findings: { icon: Bug, label: 'Findings', color: 'text-red-400' },
  true_positive: { icon: Bug, label: 'True Positive Findings', color: 'text-red-400' },
  false_positive: { icon: Bug, label: 'False Positive Findings', color: 'text-purple-400' },
  reporters: { icon: Users, label: 'Reporters', color: 'text-green-400' },
  users: { icon: Users, label: 'Users', color: 'text-green-400' },
  clients: { icon: Building2, label: 'Clients', color: 'text-yellow-400' },
  templates: { icon: FileText, label: 'Templates', color: 'text-primary' },
  workflow: { icon: Activity, label: 'Workflow Status', color: 'text-orange-400' },
};

const SkeletonCard = () => (
  <Card className="p-4 bg-surface rounded-lg border border-outline-variant animate-pulse">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="h-4 bg-surface-variant rounded w-3/5" />
      <div className="h-5 bg-surface-variant rounded w-16" />
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
      <div className="h-3 bg-surface-variant rounded w-24" />
      <div className="h-3 bg-surface-variant rounded w-20" />
      <div className="h-3 bg-surface-variant rounded w-28" />
      <div className="h-3 bg-surface-variant rounded w-16" />
    </div>
    <div className="h-3 bg-surface-variant rounded w-20" />
  </Card>
);

const SearchResults = ({ results, entity, analytics, loading, query, parsed, onNavigate }: SearchResultsProps) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6 bg-surface-high border-outline">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded bg-surface-variant animate-pulse" />
            <div className="h-4 bg-surface-variant rounded w-24 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-3 bg-surface rounded-lg border border-outline-variant">
                <div className="h-8 bg-surface-variant rounded w-12 mb-2 animate-pulse" />
                <div className="h-3 bg-surface-variant rounded w-20 animate-pulse" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4 bg-surface-high border-outline">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 rounded bg-surface-variant animate-pulse" />
            <div className="h-4 bg-surface-variant rounded w-32 animate-pulse" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        </Card>
      </div>
    );
  }

  if (!query) {
    return (
      <Card className="p-12 text-center bg-surface-high border-outline">
        <Search className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">Start Your Search</h3>
        <p className="text-on-surface-variant max-w-md mx-auto">
          Use natural language to search projects, findings, reporters, clients, and more across the entire platform
        </p>
      </Card>
    );
  }

  const resultEntities = new Set(results.map((r: any) => r._entity).filter(Boolean));
  const isMixed = resultEntities.size > 1;
  const config = entityConfig[isMixed ? 'projects' : entity] || entityConfig.findings;

  const renderResult = (item: any, index: number) => {
    const ent = item._entity || entity;
    const uniqueKey = `${ent}-${item.id || index}`;
    switch (ent) {
      case 'projects':
      case 'project':
        return <SearchProjectCard key={uniqueKey} project={item} onNavigate={onNavigate} />;
      case 'findings':
      case 'true_positive':
      case 'false_positive':
      case 'finding':
        return <SearchFindingCard key={uniqueKey} finding={item} onNavigate={onNavigate} />;
      case 'users':
      case 'reporters':
      case 'user':
      case 'reporter':
        return <SearchUserCard key={uniqueKey} user={item} />;
      case 'clients':
      case 'client':
        return (
          <Card key={uniqueKey} className="p-4 bg-surface rounded-lg border border-outline-variant hover:border-primary/30 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-yellow-400" />
              <h4 className="text-sm font-medium text-on-surface">{item.name}</h4>
            </div>
            <div className="flex gap-4 text-xs text-on-surface-variant">
              <span>{item.project_count} projects</span>
              {item.finding_count !== undefined && <span>{item.finding_count} findings</span>}
            </div>
          </Card>
        );
      case 'templates':
      case 'template':
        return (
          <Card key={uniqueKey} className="p-4 bg-surface rounded-lg border border-outline-variant hover:border-primary/30 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-medium text-on-surface">{item.name}</h4>
            </div>
            <p className="text-xs text-on-surface-variant">{item.project_count} projects using this template</p>
          </Card>
        );
      default:
        return <SearchFindingCard key={uniqueKey} finding={item} onNavigate={onNavigate} />;
    }
  };

  return (
    <div className="space-y-6">
      <SearchAnalyticsCard analytics={analytics} entity={entity} />

      {results.length > 0 ? (
        <Card className="p-4 md:p-6 bg-surface-high border-outline">
          <div className="flex items-center gap-2 mb-4">
            <div className={`p-1.5 rounded-lg bg-surface ${config.color}`}>
              <config.icon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-on-surface">
              {isMixed ? `Results (${results.length})` : `${config.label} (${results.length})`}
            </h3>
          </div>

          <div className="space-y-2">
            {results.map((item: any, i: number) => renderResult(item, i))}
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center bg-surface-high border-outline">
          <Search className="w-16 h-16 text-on-surface-variant mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-on-surface mb-2">No Results Found</h3>
          <p className="text-on-surface-variant max-w-md mx-auto">
            Try a different search query or check your spelling
          </p>
        </Card>
      )}
    </div>
  );
};

export default SearchResults;
