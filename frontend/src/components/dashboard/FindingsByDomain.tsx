import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DomainItem } from '@/api/dashboardApi';

interface FindingsByDomainProps {
  data: DomainItem[];
}

const FindingsByDomain = ({ data }: FindingsByDomainProps) => {
  const chartData = data.map((item) => ({
    name: item.domain.length > 20 ? item.domain.slice(0, 18) + '...' : item.domain,
    fullName: item.domain,
    total: item.count,
    critical_high: item.critical_high_count,
  }));

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-on-surface">
          Findings by Domain
        </h3>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        {chartData.length > 0 ? (
          <BarChart width={400} height={260} data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 110, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis
              dataKey="name"
              type="category"
              width={105}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: any, name: any, props: any) => {
                if (String(name) === 'critical_high') return [value, 'Critical + High'];
                return [value, String(props?.payload?.fullName || '')];
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            <Bar dataKey="critical_high" name="Critical + High" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        ) : (
          <div className="flex items-center justify-center h-full text-on-surface-variant text-sm">
            No domain data available
          </div>
        )}
      </div>
    </Card>
  );
};

export default FindingsByDomain;
