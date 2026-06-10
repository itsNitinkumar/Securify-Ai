import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { dashboardApi, TopReporter } from '@/api/dashboardApi';
import { User } from 'lucide-react';

const TopReporters = () => {
  const [reporters, setReporters] = useState<TopReporter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await dashboardApi.getTopReporters(5);
        setReporters(res.data || []);
      } catch {
        setReporters([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Card className="p-4 md:p-6 bg-surface-high border-outline h-full">
        <h3 className="text-base md:text-lg font-semibold text-on-surface mb-4">Top Reporters</h3>
        <div className="flex items-center justify-center h-32 text-on-surface-variant text-sm">Loading...</div>
      </Card>
    );
  }

  if (reporters.length === 0) {
    return (
      <Card className="p-4 md:p-6 bg-surface-high border-outline h-full">
        <h3 className="text-base md:text-lg font-semibold text-on-surface mb-4">Top Reporters</h3>
        <div className="flex items-center justify-center h-32 text-on-surface-variant text-sm">No reporter data</div>
      </Card>
    );
  }

  const maxCount = Math.max(...reporters.map((r) => r.findings_count));

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline h-full">
      <h3 className="text-base md:text-lg font-semibold text-on-surface mb-4">Top Reporters</h3>

      <div className="space-y-3">
        {reporters.map((r, i) => (
          <div key={r.id} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-on-surface truncate">{r.name}</span>
                <span className="text-sm font-medium text-on-surface ml-2">{r.findings_count}</span>
              </div>
              <div className="h-2 bg-surface rounded overflow-hidden">
                <div
                  className="h-full bg-primary rounded transition-all duration-500"
                  style={{ width: `${(r.findings_count / maxCount) * 100}%` }}
                />
              </div>
              <div className="flex gap-3 mt-1">
                <span className="text-xs text-green-400">{r.approved_count} approved</span>
                <span className="text-xs text-red-400">{r.critical_high_count} critical/high</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TopReporters;
