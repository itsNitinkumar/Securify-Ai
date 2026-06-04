import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { TrendingUp, Bug, FolderOpen, AlertTriangle, CheckCircle } from 'lucide-react';

interface QuickStatProps {
  icon: any;
  label: string;
  action: string;
  color: string;
  iconColor: string;
}

const QuickStat = ({ icon: Icon, label, action, color, iconColor }: QuickStatProps) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/search?q=${encodeURIComponent(action)}`)}
      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface transition-colors text-left"
    >
      <span className="text-xs text-on-surface-variant flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        {label}
      </span>
      <span className={`text-xs font-mono ${color}`}>&rarr;</span>
    </button>
  );
};

const QuickStats = () => {
  return (
    <Card className="p-4 bg-surface-high border-outline">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-on-surface">Quick Search</h3>
      </div>
      <div className="space-y-1">
        <QuickStat icon={AlertTriangle} label="Critical Findings" action="Show all critical findings" color="text-error" iconColor="text-error" />
        <QuickStat icon={Bug} label="False Positives" action="Show false positive findings" color="text-purple-400" iconColor="text-purple-400" />
        <QuickStat icon={CheckCircle} label="Completed Projects" action="Show completed projects" color="text-green-400" iconColor="text-green-400" />
        <QuickStat icon={FolderOpen} label="Pending Review" action="Show projects pending review" color="text-yellow-400" iconColor="text-yellow-400" />
        <QuickStat icon={Bug} label="SQL Injection" action="Show SQL Injection findings" color="text-primary" iconColor="text-primary" />
      </div>
    </Card>
  );
};

export default QuickStats;
