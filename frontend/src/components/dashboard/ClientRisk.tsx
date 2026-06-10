import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ClientRiskItem } from '@/api/dashboardApi';

interface ClientRiskProps {
  data: ClientRiskItem[];
}

const ClientRisk = ({ data }: ClientRiskProps) => {
  const chartData = data.map((item) => ({
    name: item.client_name.length > 16 ? item.client_name.slice(0, 14) + '...' : item.client_name,
    fullName: item.client_name,
    Critical: item.critical_count,
    High: item.high_count,
    Medium: item.medium_count,
    Low: item.low_count,
  }));

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-on-surface">
          Client Risk Breakdown
        </h3>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        {chartData.length > 0 ? (
          <BarChart width={800} height={260} data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 100, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis
              dataKey="name"
              type="category"
              width={95}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: any, name: any) => [value, String(name)]}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Critical" stackId="a" fill="#ef4444" />
            <Bar dataKey="High" stackId="a" fill="#f97316" />
            <Bar dataKey="Medium" stackId="a" fill="#eab308" />
            <Bar dataKey="Low" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        ) : (
          <div className="flex items-center justify-center h-full text-on-surface-variant text-sm">
            No client data available
          </div>
        )}
      </div>
    </Card>
  );
};

export default ClientRisk;
