import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RemediationVelocityProps {
  data: any[];
}

const RemediationVelocity = ({ data }: RemediationVelocityProps) => {
  // Simplified bar chart data - last 5 periods
  const chartData = [
    { period: '1', value: 65, status: 'CLOSED' },
    { period: '2', value: 78, status: 'CLOSED' },
    { period: '3', value: 82, status: 'CLOSED' },
    { period: '4', value: 88, status: 'CLOSED' },
    { period: '5', value: 92, status: 'CLOSED' },
  ];

  const maxValue = Math.max(...chartData.map(d => d.value));

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline h-full">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-on-surface">
          Remediation Velocity
        </h3>
        <Badge className="bg-primary/10 text-primary text-xs">
          ● CLOSED
        </Badge>
      </div>

      {/* Bar Chart */}
      <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
        {chartData.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span>{item.period}</span>
              <span className="font-medium text-on-surface">{item.value}</span>
            </div>
            <div className="h-8 md:h-10 bg-surface rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 rounded"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="pt-4 border-t border-outline-variant">
        <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
          <div>
            <div className="text-lg md:text-xl font-bold text-primary font-technical">92%</div>
            <div className="text-xs text-on-surface-variant">Closed</div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold text-on-surface font-technical">4.2d</div>
            <div className="text-xs text-on-surface-variant">Avg Time</div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold text-on-surface font-technical">+18%</div>
            <div className="text-xs text-on-surface-variant">Velocity</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RemediationVelocity;
