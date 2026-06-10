import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ProjectStatusItem } from '@/api/dashboardApi';

interface ProjectsByStatusProps {
  data: ProjectStatusItem[];
}

const COLORS: Record<string, string> = {
  draft: '#6b7280',
  pending_review: '#eab308',
  completed: '#22c55e',
  archived: '#3b82f6',
};

const LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  completed: 'Completed',
  archived: 'Archived',
};

const ProjectsByStatus = ({ data }: ProjectsByStatusProps) => {
  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map((item) => ({
    name: LABELS[item.status] || item.status,
    value: item.count,
    color: COLORS[item.status] || '#9ca3af',
  }));

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline h-full">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-on-surface">
          Projects by Status
        </h3>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative mb-4">
          <PieChart width={176} height={176}>
            <Pie
              data={chartData}
              cx={88}
              cy={88}
              innerRadius={44}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
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
            />
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-on-surface font-technical">{total}</span>
            <span className="text-xs text-on-surface-variant">PROJECTS</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {data.map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[item.status] || '#9ca3af' }}
              />
              <span className="text-xs text-on-surface-variant">
                {LABELS[item.status] || item.status}
              </span>
              <span className="text-xs font-medium text-on-surface">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default ProjectsByStatus;
