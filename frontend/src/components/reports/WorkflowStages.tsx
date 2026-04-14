import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, Shield, Globe } from 'lucide-react';

type ReportStage = 'drafting' | 'peer_review' | 'manager_approval' | 'published';

interface WorkflowStagesProps {
  currentStage: ReportStage;
  onStageChange: (stage: ReportStage) => void;
}

const stages = [
  { id: 'drafting', label: 'Drafting', icon: Clock, step: 1 },
  { id: 'peer_review', label: 'Peer Review', icon: CheckCircle, step: 2 },
  { id: 'manager_approval', label: 'Manager Approval', icon: Shield, step: 3 },
  { id: 'published', label: 'Published', icon: Globe, step: 4 },
];

const WorkflowStages = ({ currentStage, onStageChange }: WorkflowStagesProps) => {
  const currentStepIndex = stages.findIndex((s) => s.id === currentStage);

  return (
    <Card className="p-4 md:p-6 bg-surface-high border-outline">
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = stage.id === currentStage;
          const isCompleted = index < currentStepIndex;
          const isClickable = index <= currentStepIndex + 1;

          return (
            <div key={stage.id} className="flex items-center flex-shrink-0">
              <button
                onClick={() => isClickable && onStageChange(stage.id as ReportStage)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary/10'
                    : isCompleted
                    ? 'hover:bg-surface'
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center ${
                    isActive
                      ? 'bg-primary text-surface'
                      : isCompleted
                      ? 'bg-primary/20 text-primary'
                      : 'bg-surface-variant text-on-surface-variant'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                  ) : (
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                  )}
                </div>
                <div className="text-center">
                  <p
                    className={`text-xs md:text-sm font-medium whitespace-nowrap ${
                      isActive ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    {stage.label}
                  </p>
                </div>
              </button>
              {index < stages.length - 1 && (
                <div
                  className={`w-8 md:w-16 h-0.5 mx-2 ${
                    isCompleted ? 'bg-primary' : 'bg-outline-variant'
                  }`}
                ></div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default WorkflowStages;
