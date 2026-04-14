import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SeverityData {
  severity: string;
  count: number;
  percentage: number;
}

interface SeverityChartProps {
  data: SeverityData[];
}

const severityColors = {
  critical: { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/20' },
  high: { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/20' },
  medium: { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  low: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/20' },
  info: { bg: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500/20' },
};

const SeverityChart = ({ data }: SeverityChartProps) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline h-full">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-on-surface">
          Severity Distribution
        </h3>
        <Badge variant="outline" className="text-xs border-outline-variant">
          ⋯
        </Badge>
      </div>

      {/* Donut Chart Representation */}
      <div className="flex items-center justify-center mb-6 md:mb-8">
        <div className="relative w-32 h-32 md:w-48 md:h-48">
          {/* Simplified donut - in production use a chart library */}
          <div className="absolute inset-0 rounded-full border-8 md:border-[12px] border-surface flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold text-on-surface font-technical">
                {total}
              </div>
              <div className="text-xs md:text-sm text-on-surface-variant">TOTAL</div>
            </div>
          </div>
          {/* Colored segments - simplified */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="#ff7351"
              strokeWidth="16"
              strokeDasharray="30 70"
              className="opacity-80"
            />
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 md:space-y-3">
        {data.map((item) => {
          const colors = severityColors[item.severity.toLowerCase() as keyof typeof severityColors] || severityColors.info;
          return (
            <div key={item.severity} className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${colors.bg} flex-shrink-0`}></div>
                <span className="text-xs md:text-sm text-on-surface-variant uppercase truncate">
                  {item.severity}
                </span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <span className="text-xs md:text-sm font-medium text-on-surface">
                  {item.count}
                </span>
                <span className={`text-xs md:text-sm font-semibold ${colors.text} min-w-[3rem] text-right`}>
                  {item.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default SeverityChart;
