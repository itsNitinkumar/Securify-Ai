import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  subtitle?: string;
  change?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  variant?: 'default' | 'critical' | 'warning';
}

const StatCard = ({
  title,
  value,
  suffix,
  subtitle,
  change,
  icon: Icon,
  trend,
  variant = 'default',
}: StatCardProps) => {
  const variantStyles = {
    default: 'border-outline',
    critical: 'border-error/30 bg-error/5',
    warning: 'border-primary/30 bg-primary/5',
  };

  return (
    <Card className={`p-4 md:p-6 bg-surface-high ${variantStyles[variant]} hover:border-primary/50 transition-all`}>
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-on-surface-variant mb-1 uppercase tracking-wide">
            {title}
          </p>
          <div className="flex items-baseline gap-1 md:gap-2">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-on-surface font-technical">
              {value}
            </h3>
            {suffix && (
              <span className="text-base md:text-lg text-on-surface-variant">{suffix}</span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 md:p-3 rounded-lg flex-shrink-0 ${
          variant === 'critical' ? 'bg-error/10' : 
          variant === 'warning' ? 'bg-primary/10' : 
          'bg-surface-variant'
        }`}>
          <Icon className={`w-5 h-5 md:w-6 md:h-6 ${
            variant === 'critical' ? 'text-error' : 
            variant === 'warning' ? 'text-primary' : 
            'text-on-surface-variant'
          }`} />
        </div>
      </div>
      
      {change && (
        <div className="flex items-center gap-2 pt-3 md:pt-4 border-t border-outline-variant">
          {trend === 'up' ? (
            <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-primary" />
          ) : (
            <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-error" />
          )}
          <span className={`text-xs md:text-sm font-medium ${
            trend === 'up' ? 'text-primary' : 'text-error'
          }`}>
            {change}
          </span>
          <span className="text-xs text-on-surface-variant">vs last period</span>
        </div>
      )}
    </Card>
  );
};

export default StatCard;
