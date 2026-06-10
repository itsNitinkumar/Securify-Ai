import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CategoryItem } from '@/api/dashboardApi';

interface FindingsByCategoryProps {
  data: CategoryItem[];
}

const FindingsByCategory = ({ data }: FindingsByCategoryProps) => {
  const chartData = data.map((item) => ({
    name: item.category.length > 18 ? item.category.slice(0, 16) + '...' : item.category,
    fullName: item.category,
    count: item.count,
  }));

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-on-surface">
          Findings by Category
        </h3>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        {chartData.length > 0 ? (
          <BarChart width={400} height={260} data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 100, bottom: 5 }}>
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
              formatter={(value: any, _name: any, props: any) => [value, String(props?.payload?.fullName || '')]}
            />
            <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
          </BarChart>
        ) : (
          <div className="flex items-center justify-center h-full text-on-surface-variant text-sm">
            No category data available
          </div>
        )}
      </div>
    </Card>
  );
};

export default FindingsByCategory;
