import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

const QuickStats = () => {
  return (
    <Card className="p-4 bg-surface-high border-outline">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-on-surface">Quick Stats</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-on-surface-variant">Scan Coverage</span>
          <span className="text-sm font-semibold text-primary">88%</span>
        </div>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: '88%' }}></div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-on-surface-variant">Threat Mitigation</span>
          <span className="text-sm font-semibold text-primary">62%</span>
        </div>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: '62%' }}></div>
        </div>
      </div>
    </Card>
  );
};

export default QuickStats;
