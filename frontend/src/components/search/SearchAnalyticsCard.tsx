import { Card } from '@/components/ui/card';
import { TrendingUp, Bug, FolderOpen, AlertTriangle, CheckCircle, Users, Building2, FileText, Shield, BarChart3 } from 'lucide-react';

interface SearchAnalyticsCardProps {
  analytics: any;
  entity: string;
}

interface StatCardProps {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  bgColor: string;
  iconColor: string;
}

const StatCard = ({ icon: Icon, label, value, color, bgColor, iconColor }: StatCardProps) => (
  <Card className={`p-4 ${bgColor} border ${color} transition-all hover:shadow-md`}>
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold font-technical">{value}</div>
        <div className="text-xs mt-0.5 opacity-80">{label}</div>
      </div>
    </div>
  </Card>
);

const SearchAnalyticsCard = ({ analytics, entity }: SearchAnalyticsCardProps) => {
  if (!analytics || Object.keys(analytics).length === 0) return null;

  // Single count stat
  if ('count' in analytics && (!analytics.templates || Object.keys(analytics).length === 1)) {
    const configs: Record<string, { icon: any; label: string; color: string; bgColor: string; iconColor: string }> = {
      projects: { icon: FolderOpen, label: 'Projects', color: 'border-blue-500/20', bgColor: 'bg-blue-500/5', iconColor: 'text-blue-400 bg-blue-500/10' },
      findings: { icon: Bug, label: 'Findings', color: 'border-red-500/20', bgColor: 'bg-red-500/5', iconColor: 'text-red-400 bg-red-500/10' },
      true_positive: { icon: Shield, label: 'True Positive Findings', color: 'border-red-500/20', bgColor: 'bg-red-500/5', iconColor: 'text-red-400 bg-red-500/10' },
      false_positive: { icon: AlertTriangle, label: 'False Positive Findings', color: 'border-purple-500/20', bgColor: 'bg-purple-500/5', iconColor: 'text-purple-400 bg-purple-500/10' },
      reporters: { icon: Users, label: 'Reporters', color: 'border-green-500/20', bgColor: 'bg-green-500/5', iconColor: 'text-green-400 bg-green-500/10' },
      users: { icon: Users, label: 'Users', color: 'border-green-500/20', bgColor: 'bg-green-500/5', iconColor: 'text-green-400 bg-green-500/10' },
      clients: { icon: Building2, label: 'Clients', color: 'border-yellow-500/20', bgColor: 'bg-yellow-500/5', iconColor: 'text-yellow-400 bg-yellow-500/10' },
      templates: { icon: FileText, label: 'Templates', color: 'border-primary/20', bgColor: 'bg-primary/5', iconColor: 'text-primary bg-primary/10' },
    };
    const config = configs[entity] || configs.findings;
    return (
      <Card className="p-4 md:p-6 bg-surface-high border-outline">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-on-surface">Analytics</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={config.icon}
            label={config.label}
            value={analytics.count}
            color={config.color}
            bgColor={config.bgColor}
            iconColor={config.iconColor}
          />
        </div>
      </Card>
    );
  }

  // Count + templates list (e.g. "how many report templates are there")
  if ('count' in analytics && Array.isArray(analytics.templates)) {
    return (
      <Card className="p-4 md:p-6 bg-surface-high border-outline">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-on-surface">Report Templates</h3>
          <span className="text-xs text-on-surface-variant ml-auto">Total: {analytics.count}</span>
        </div>
        <div className="space-y-2">
          {analytics.templates.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-surface/50 border border-outline/30">
              <span className="text-sm font-medium text-on-surface">{t.name}</span>
              <span className="text-xs text-on-surface-variant font-mono">{t.project_count} project{t.project_count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Count + reporters list (e.g. "how many reporters are there")
  if ('count' in analytics && Array.isArray(analytics.reporters)) {
    return (
      <Card className="p-4 md:p-6 bg-surface-high border-outline">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-on-surface">Reporters</h3>
          <span className="text-xs text-on-surface-variant ml-auto">Total: {analytics.count}</span>
        </div>
        <div className="space-y-2">
          {analytics.reporters.map((u: any) => (
            <div key={u.id} className="p-2 rounded-lg bg-surface/50 border border-outline/30">
              <span className="text-sm font-medium text-on-surface">{u.name}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Group analytics with bar chart
  if ('groups' in analytics && Array.isArray(analytics.groups)) {
    return (
      <Card className="p-4 md:p-6 bg-surface-high border-outline">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-on-surface">Distribution</h3>
        </div>
        <div className="space-y-2">
          {analytics.groups.map((group: any, i: number) => {
            const label = Object.values(group).find((v: any) => typeof v === 'string') as string || `Group ${i + 1}`;
            const count = Object.values(group).find((v: any) => typeof v === 'number') as number || 0;
            const maxCount = Math.max(...analytics.groups.map((g: any) =>
              Object.values(g).find((v: any) => typeof v === 'number') as number || 0
            ));
            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-on-surface capitalize font-medium">{String(label).replace(/_/g, ' ')}</span>
                  <span className="text-on-surface-variant font-mono">{count}</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  // Highest/lowest reporter/client
  if ('name' in analytics && 'finding_count' in analytics) {
    return (
      <Card className="p-4 md:p-6 bg-surface-high border-outline">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-on-surface">Top Result</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Users}
            label={analytics.name}
            value={`${analytics.finding_count} findings`}
            color="border-green-500/20"
            bgColor="bg-green-500/5"
            iconColor="text-green-400 bg-green-500/10"
          />
        </div>
      </Card>
    );
  }

  // Most common finding
  if ('title' in analytics && 'count' in analytics) {
    return (
      <Card className="p-4 md:p-6 bg-surface-high border-outline">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-on-surface">Most Common</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Bug}
            label={analytics.title}
            value={`${analytics.count} occurrences`}
            color="border-red-500/20"
            bgColor="bg-red-500/5"
            iconColor="text-red-400 bg-red-500/10"
          />
        </div>
      </Card>
    );
  }

  // Average
  if ('avg_per_project' in analytics) {
    return (
      <Card className="p-4 md:p-6 bg-surface-high border-outline">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-on-surface">Averages</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon={Bug} label="Total Findings" value={analytics.total} color="border-red-500/20" bgColor="bg-red-500/5" iconColor="text-red-400 bg-red-500/10" />
          <StatCard icon={FolderOpen} label="Projects" value={analytics.projects} color="border-blue-500/20" bgColor="bg-blue-500/5" iconColor="text-blue-400 bg-blue-500/10" />
          <StatCard icon={BarChart3} label="Avg per Project" value={analytics.avg_per_project} color="border-primary/20" bgColor="bg-primary/5" iconColor="text-primary bg-primary/10" />
        </div>
      </Card>
    );
  }

  // Fallback: show whatever we have
  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-on-surface">Analytics</h3>
      </div>
      <pre className="text-xs text-on-surface-variant overflow-auto">
        {JSON.stringify(analytics, null, 2)}
      </pre>
    </Card>
  );
};

export default SearchAnalyticsCard;
