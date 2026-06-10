import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Globe, Shield } from 'lucide-react';
import { dashboardApi, DashboardStats, ClientRiskItem, DomainItem } from '@/api/dashboardApi';

const AIInsights = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<ClientRiskItem[]>([]);
  const [domains, setDomains] = useState<DomainItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, clientRes, domainRes] = await Promise.all([
          dashboardApi.getOverallStats(),
          dashboardApi.getClientRisk(),
          dashboardApi.getFindingsByDomain(),
        ]);
        setStats(statsRes.data);
        setClients(clientRes.data || []);
        setDomains(domainRes.data || []);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const insights: Array<{
    id: number;
    type: string;
    title: string;
    description: string;
    metric: string;
    icon: typeof AlertTriangle;
    color: string;
    bgColor: string;
  }> = [];

  if (stats) {
    const total = stats.total_findings || 1;
    const critPct = Math.round(((stats.critical_findings || 0) / total) * 100);
    if (critPct > 10) {
      insights.push({
        id: 1,
        type: 'risk',
        title: 'High Critical Ratio',
        description: `${stats.critical_findings} critical findings (${critPct}% of total)`,
        metric: `${stats.critical_findings} critical / ${stats.high_findings} high severity issues need immediate attention`,
        icon: AlertTriangle,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
      });
    }

    if (stats.unresolved_comments > 0) {
      insights.push({
        id: 2,
        type: 'review',
        title: 'Pending Reviews',
        description: `${stats.open_findings} findings awaiting review`,
        metric: `${stats.unresolved_comments} open comment threads need resolution`,
        icon: TrendingUp,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      });
    }

    if (stats.total_projects > 0) {
      const completedPct = Math.round(((stats.completed_projects || 0) / stats.total_projects) * 100);
      insights.push({
        id: 3,
        type: 'project',
        title: 'Project Completion',
        description: `${stats.completed_projects} of ${stats.total_projects} projects completed`,
        metric: `${completedPct}% completion rate across all assessments`,
        icon: Shield,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
      });
    }
  }

  if (clients.length > 0) {
    const topClient = clients[0];
    insights.push({
      id: 4,
      type: 'client',
      title: 'Highest Risk Client',
      description: topClient.client_name,
      metric: `${topClient.critical_count} critical + ${topClient.high_count} high findings across their projects`,
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    });
  }

  if (domains.length > 0) {
    const topDomain = domains[0];
    insights.push({
      id: 5,
      type: 'asset',
      title: 'Most Targeted Domain',
      description: topDomain.domain,
      metric: `${topDomain.count} findings, ${topDomain.critical_high_count} critical/high severity`,
      icon: Globe,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    });
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-primary/20">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
          <h3 className="text-base md:text-lg font-semibold text-on-surface">
            Security Insights
          </h3>
        </div>
        <Badge className="bg-primary/10 text-primary text-xs">AUTO-GENERATED</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {insights.slice(0, 6).map((insight) => {
          const Icon = insight.icon;
          return (
            <div
              key={insight.id}
              className="p-4 rounded-lg bg-surface border border-outline-variant hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg ${insight.bgColor} flex-shrink-0`}>
                  <Icon className={`w-4 h-4 md:w-5 md:h-5 ${insight.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-on-surface mb-1 line-clamp-1">
                    {insight.title}
                  </h4>
                  <p className="text-xs text-on-surface-variant line-clamp-2">
                    {insight.description}
                  </p>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">
                {insight.metric}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default AIInsights;
