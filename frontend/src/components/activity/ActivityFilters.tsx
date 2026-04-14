import { Badge } from '@/components/ui/badge';

interface ActivityFiltersProps {
  filters: {
    action: string;
    entityType: string;
    timeRange: string;
  };
  onFiltersChange: (filters: any) => void;
}

const ActivityFilters = ({ filters, onFiltersChange }: ActivityFiltersProps) => {
  const actions = [
    { value: 'all', label: 'All Actions' },
    { value: 'create', label: 'Create' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'approve', label: 'Approve' },
    { value: 'login', label: 'Login' },
  ];

  const entityTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'project', label: 'Project' },
    { value: 'finding', label: 'Finding' },
    { value: 'report', label: 'Report' },
    { value: 'user', label: 'User' },
    { value: 'finding_library', label: 'Template' },
  ];

  const timeRanges = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Action Filter */}
      <div className="flex-1">
        <label className="text-xs text-on-surface-variant mb-2 block">Action</label>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Badge
              key={action.value}
              variant={filters.action === action.value ? 'default' : 'outline'}
              className={`cursor-pointer text-xs ${
                filters.action === action.value
                  ? 'bg-primary text-surface'
                  : 'border-outline text-on-surface-variant hover:border-primary'
              }`}
              onClick={() => onFiltersChange({ ...filters, action: action.value })}
            >
              {action.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Entity Type Filter */}
      <div className="flex-1">
        <label className="text-xs text-on-surface-variant mb-2 block">Entity Type</label>
        <div className="flex flex-wrap gap-2">
          {entityTypes.map((type) => (
            <Badge
              key={type.value}
              variant={filters.entityType === type.value ? 'default' : 'outline'}
              className={`cursor-pointer text-xs ${
                filters.entityType === type.value
                  ? 'bg-primary text-surface'
                  : 'border-outline text-on-surface-variant hover:border-primary'
              }`}
              onClick={() => onFiltersChange({ ...filters, entityType: type.value })}
            >
              {type.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="flex-1">
        <label className="text-xs text-on-surface-variant mb-2 block">Time Range</label>
        <div className="flex flex-wrap gap-2">
          {timeRanges.map((range) => (
            <Badge
              key={range.value}
              variant={filters.timeRange === range.value ? 'default' : 'outline'}
              className={`cursor-pointer text-xs ${
                filters.timeRange === range.value
                  ? 'bg-primary text-surface'
                  : 'border-outline text-on-surface-variant hover:border-primary'
              }`}
              onClick={() => onFiltersChange({ ...filters, timeRange: range.value })}
            >
              {range.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityFilters;
