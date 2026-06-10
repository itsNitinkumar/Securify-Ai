import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { SeverityItem } from '@/api/dashboardApi';

interface SeverityChartProps {
  data: SeverityItem[];
}

const COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#3b82f6',
  Informational: '#6b7280',
  None: '#9ca3af',
};

const SeverityChart = ({ data }: SeverityChartProps) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  const severityLabels: Record<string, string> = {
    None: 'None (FP)',
  };

  const chartData = data.map((item) => ({
    name: severityLabels[item.severity] || item.severity,
    value: item.count,
    color: COLORS[item.severity] || '#9ca3af',
  }));

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-on-surface">
          Severity Distribution
        </h3>
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center h-48 text-on-surface-variant text-sm">
          No severity data available
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
          <div className="relative w-40 h-40 md:w-48 md:h-48 flex-shrink-0">
            <PieChart width={192} height={192}>
              <Pie
                data={chartData}
                cx={96}
                cy={96}
                innerRadius={52}
                outerRadius={82}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: any) => [value, String(name)]}
              />
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl md:text-3xl font-bold text-on-surface font-technical">
                {total}
              </span>
              <span className="text-xs text-on-surface-variant">TOTAL</span>
            </div>
          </div>

          <div className="flex-1 space-y-2 md:space-y-3 w-full">
            {data.map((item) => (
              <div key={item.severity} className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 md:w-4 md:h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[item.severity] || '#9ca3af' }}
                  />
                  <span className="text-xs md:text-sm text-on-surface-variant uppercase truncate">
                    {severityLabels[item.severity] || item.severity}
                  </span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                  <span className="text-xs md:text-sm font-medium text-on-surface">
                    {item.count}
                  </span>
                  <span className="text-xs md:text-sm font-semibold text-on-surface-variant min-w-[3rem] text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default SeverityChart;
