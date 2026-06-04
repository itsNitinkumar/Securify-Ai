import { Card } from '@/components/ui/card';
import { AlertTriangle, Shield, Bug, FolderOpen, CheckCircle, Clock, Calendar, FileText } from 'lucide-react';

interface QuickStatProps {
  icon: any;
  label: string;
  action: string;
  color: string;
  iconColor: string;
  onSearch: (query: string) => void;
}

const QuickStat = ({ icon: Icon, label, action, color, iconColor, onSearch }: QuickStatProps) => (
  <button
    onClick={() => onSearch(action)}
    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface transition-colors text-left"
  >
    <span className="text-xs text-on-surface-variant flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      {label}
    </span>
    <span className={`text-xs font-mono ${color}`}>&rarr;</span>
  </button>
);

interface QuickStatsProps {
  templates?: string[];
  onSearch: (query: string) => void;
}

const QuickStats = ({ templates, onSearch }: QuickStatsProps) => {
  const severityItems = [
    { icon: AlertTriangle, label: 'Critical', action: 'Show all critical findings', color: 'text-red-400', iconColor: 'text-red-400' },
    { icon: Shield, label: 'High', action: 'Show all high findings', color: 'text-orange-400', iconColor: 'text-orange-400' },
    { icon: Shield, label: 'Medium', action: 'Show all medium findings', color: 'text-yellow-400', iconColor: 'text-yellow-400' },
    { icon: Shield, label: 'Low', action: 'Show all low findings', color: 'text-blue-400', iconColor: 'text-blue-400' },
    { icon: Bug, label: 'Informational', action: 'Show all informational findings', color: 'text-gray-400', iconColor: 'text-gray-400' },
  ];

  const dateItems = [
    { icon: Calendar, label: 'Today', action: 'Show findings created today', color: 'text-primary', iconColor: 'text-primary' },
    { icon: Calendar, label: 'This Week', action: 'Show all findings generated this week', color: 'text-primary', iconColor: 'text-primary' },
    { icon: Calendar, label: 'This Month', action: 'Show findings created this month', color: 'text-primary', iconColor: 'text-primary' },
    { icon: Clock, label: 'Last Week', action: 'Show findings created last week', color: 'text-on-surface-variant', iconColor: 'text-on-surface-variant' },
    { icon: Clock, label: 'Last Month', action: 'Show findings created last month', color: 'text-on-surface-variant', iconColor: 'text-on-surface-variant' },
  ];

  const statusItems = [
    { icon: FolderOpen, label: 'Draft', action: 'Show projects with draft status', color: 'text-gray-400', iconColor: 'text-gray-400' },
    { icon: AlertTriangle, label: 'Pending Review', action: 'Show projects pending review', color: 'text-yellow-400', iconColor: 'text-yellow-400' },
    { icon: Clock, label: 'Pending Comment Res.', action: 'Show projects with pending comment resolution', color: 'text-orange-400', iconColor: 'text-orange-400' },
    { icon: CheckCircle, label: 'Completed', action: 'Show completed projects', color: 'text-green-400', iconColor: 'text-green-400' },
  ];

  return (
    <Card className="p-4 bg-surface-high border-outline">
      <div className="flex items-center gap-2 mb-3">
        <FolderOpen className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-on-surface">Quick Search</h3>
      </div>

      <div className="space-y-4">
        {/* Severity */}
        <div>
          <h4 className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">By Severity</h4>
          <div className="space-y-0.5">
            {severityItems.map((item) => (
              <QuickStat key={item.label} {...item} onSearch={onSearch} />
            ))}
          </div>
        </div>

        {/* Templates */}
        {templates && templates.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">By Template</h4>
            <div className="space-y-0.5">
              {templates.map((name) => (
                <QuickStat
                  key={name}
                  icon={FileText}
                  label={name}
                  action={`Show findings using ${name} template`}
                  color="text-primary"
                  iconColor="text-primary"
                  onSearch={onSearch}
                />
              ))}
            </div>
          </div>
        )}

        {/* Date Range */}
        <div>
          <h4 className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">By Date</h4>
          <div className="space-y-0.5">
            {dateItems.map((item) => (
              <QuickStat key={item.label} {...item} onSearch={onSearch} />
            ))}
          </div>
        </div>

        {/* Project Status */}
        <div>
          <h4 className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">By Project Status</h4>
          <div className="space-y-0.5">
            {statusItems.map((item) => (
              <QuickStat key={item.label} {...item} onSearch={onSearch} />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default QuickStats;
