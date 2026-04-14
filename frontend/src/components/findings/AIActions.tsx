import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, AlertTriangle, Wrench } from 'lucide-react';

interface AIActionsProps {
  findingId: number;
  onRegenerateSection: (section: string) => void;
}

const AIActions = ({ findingId, onRegenerateSection }: AIActionsProps) => {
  const actions = [
    {
      icon: FileText,
      label: 'Generate Description',
      section: 'description',
      description: 'AI-powered vulnerability description',
    },
    {
      icon: AlertTriangle,
      label: 'Generate Impact Analysis',
      section: 'impact',
      description: 'Assess business and technical impact',
    },
    {
      icon: Wrench,
      label: 'Generate Remediation',
      section: 'remediation',
      description: 'Step-by-step fix recommendations',
    },
  ];

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-on-surface">AI-Powered Actions</h3>
      </div>
      <p className="text-xs text-on-surface-variant mb-4">
        Use Sentinel AI to enhance your finding with intelligent content generation
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.section}
              onClick={() => onRegenerateSection(action.section)}
              className="p-4 bg-surface rounded-lg border border-outline-variant hover:border-primary/50 transition-all text-left group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-sm font-medium text-on-surface mb-1 group-hover:text-primary transition-colors">
                {action.label}
              </p>
              <p className="text-xs text-on-surface-variant">{action.description}</p>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default AIActions;
