import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Filter } from 'lucide-react';

interface SmartFiltersProps {
  filters: {
    severity: string;
    timeframe: string;
    status: string;
  };
  onFiltersChange: (filters: any) => void;
}

const SmartFilters = ({ filters, onFiltersChange }: SmartFiltersProps) => {
  const severityLevels = ['all', 'critical', 'high', 'medium', 'low'];
  const timeframes = ['all', '24h', '7d', '30d', '90d'];
  const statuses = ['all', 'active', 'in_review', 'approved'];

  return (
    <Card className="p-4 bg-surface-high border-outline">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-on-surface">Smart Filters</h3>
      </div>

      <div className="space-y-4">
        {/* Severity Level */}
        <div>
          <label className="text-xs text-on-surface-variant mb-2 block">Severity Level</label>
          <div className="flex flex-wrap gap-2">
            {severityLevels.map((level) => (
              <Badge
                key={level}
                variant={filters.severity === level ? 'default' : 'outline'}
                className={`cursor-pointer text-xs ${
                  filters.severity === level
                    ? 'bg-primary text-surface'
                    : 'border-outline text-on-surface-variant hover:border-primary'
                }`}
                onClick={() => onFiltersChange({ ...filters, severity: level })}
              >
                {level.toUpperCase()}
              </Badge>
            ))}
          </div>
        </div>

        {/* Timeframe */}
        <div>
          <label className="text-xs text-on-surface-variant mb-2 block">Timeframe</label>
          <div className="flex flex-wrap gap-2">
            {timeframes.map((time) => (
              <Badge
                key={time}
                variant={filters.timeframe === time ? 'default' : 'outline'}
                className={`cursor-pointer text-xs ${
                  filters.timeframe === time
                    ? 'bg-primary text-surface'
                    : 'border-outline text-on-surface-variant hover:border-primary'
                }`}
                onClick={() => onFiltersChange({ ...filters, timeframe: time })}
              >
                {time === 'all' ? 'ALL TIME' : time.toUpperCase()}
              </Badge>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="text-xs text-on-surface-variant mb-2 block">Status</label>
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <Badge
                key={status}
                variant={filters.status === status ? 'default' : 'outline'}
                className={`cursor-pointer text-xs ${
                  filters.status === status
                    ? 'bg-primary text-surface'
                    : 'border-outline text-on-surface-variant hover:border-primary'
                }`}
                onClick={() => onFiltersChange({ ...filters, status })}
              >
                {status.replace('_', ' ').toUpperCase()}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SmartFilters;
