import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface ExecutiveSummaryProps {
  value: string;
  onChange: (value: string) => void;
  isEditable: boolean;
}

const ExecutiveSummary = ({ value, onChange, isEditable }: ExecutiveSummaryProps) => {
  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-on-surface">Executive Summary</h3>
        {isEditable && (
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate
          </Button>
        )}
      </div>

      {isEditable ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="The security assessment of the Alpha-Omni infrastructure revealed significant architectural exposures within the secondary authentication layer..."
          rows={8}
          className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      ) : (
        <div className="p-4 bg-surface rounded-lg border border-outline-variant">
          <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
            {value || 'No executive summary provided'}
          </p>
        </div>
      )}
    </Card>
  );
};

export default ExecutiveSummary;
