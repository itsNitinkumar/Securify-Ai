import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { VelocityPoint } from '@/api/dashboardApi';

interface RemediationVelocityProps {
  data: VelocityPoint[];
}

const RemediationVelocity = ({ data }: RemediationVelocityProps) => {
  const chartData = data.map((item) => ({
    week: item.week_label,
    Created: parseInt(String(item.created_count)),
    Closed: parseInt(String(item.closed_count)),
  }));

  const totalCreated = chartData.reduce((s, d) => s + d.Created, 0);
  const totalClosed = chartData.reduce((s, d) => s + d.Closed, 0);
  const closeRate = totalCreated > 0 ? Math.round((totalClosed / totalCreated) * 100) : 0;

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-on-surface">
          Remediation Velocity
        </h3>
      </div>

      <div className="mb-4" style={{ width: '100%', height: 260 }}>
        {chartData.length > 0 ? (
          <BarChart width={600} height={260} data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Created" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Closed" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <div className="flex items-center justify-center h-full text-on-surface-variant text-sm">
            No trend data available
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-outline-variant">
        <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
          <div>
            <div className="text-lg md:text-xl font-bold text-green-400 font-technical">{closeRate}%</div>
            <div className="text-xs text-on-surface-variant">Closed</div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold text-on-surface font-technical">{totalCreated}</div>
            <div className="text-xs text-on-surface-variant">Created</div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold text-on-surface font-technical">{totalClosed}</div>
            <div className="text-xs text-on-surface-variant">Remediated</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RemediationVelocity;
