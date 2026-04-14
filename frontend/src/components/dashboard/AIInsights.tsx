import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';

const AIInsights = () => {
  const insights = [
    {
      id: 1,
      type: 'risk',
      title: 'High Risk Asset This Week',
      description: 'PROD-DB-01 (Risk: 94/0)',
      metric: 'Risk increased by +12pts since last quarter due to automated patching',
      icon: AlertTriangle,
      color: 'text-error',
      bgColor: 'bg-error/10',
    },
    {
      id: 2,
      type: 'trend',
      title: 'Suggested Priority Fixes',
      description: 'Patch CVE-2024-0012 on 3 nodes',
      metric: 'Resolving this would improve security posture by 8%',
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      id: 3,
      type: 'insight',
      title: 'Pattern Suggest a Lateral Movement',
      description: 'Auth bypass between the staging DB and production API cluster',
      metric: 'Recommend isolating VLAN 402. Should I generate a remediation plan?',
      icon: Sparkles,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
  ];

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-primary/20">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
          <h3 className="text-base md:text-lg font-semibold text-on-surface">
            Sentinel AI Insights
          </h3>
        </div>
        <Badge className="bg-primary/10 text-primary text-xs">
          READY FOR INSTRUCTION
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {insights.map((insight) => {
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
