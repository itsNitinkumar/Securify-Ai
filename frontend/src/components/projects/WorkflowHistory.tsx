import { useEffect, useState } from 'react';
import { projectApi } from '@/api/projectApi';
import { Clock, Send, MessageSquare, CheckCircle } from 'lucide-react';

interface HistoryEntry {
  id: number;
  project_id: number;
  from_status?: string;
  to_status: string;
  action: string;
  performed_by: number;
  performed_by_name?: string;
  performed_by_role?: string;
  created_at: string;
}

const actionConfig: Record<string, { icon: any; label: string; color: string }> = {
  SUBMIT_FOR_REVIEW: { icon: Send, label: 'Submitted for review', color: 'text-yellow-400' },
  REQUEST_CHANGES: { icon: MessageSquare, label: 'Changes requested', color: 'text-orange-400' },
  MARK_COMPLETE: { icon: CheckCircle, label: 'Completed', color: 'text-green-400' },
};

const defaultEntry = { icon: Clock, label: 'Status change', color: 'text-on-surface-variant' };

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatStatus = (status?: string) => {
  if (!status) return '';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

interface WorkflowHistoryProps {
  projectId: number;
}

const WorkflowHistory = ({ projectId }: WorkflowHistoryProps) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await projectApi.getWorkflowHistory(projectId);
        setEntries(res.data || []);
      } catch (err) {
        console.error('Failed to load workflow history:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-on-surface-variant py-2">
        <div className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
        Loading history...
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-outline-variant">
      <h4 className="text-xs font-semibold text-on-surface-variant uppercase mb-3">Activity Timeline</h4>
      <div className="relative">
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-outline-variant" />
        <div className="space-y-4">
          {entries.map((entry, idx) => {
            const config = actionConfig[entry.action] || defaultEntry;
            const Icon = config.icon;
            return (
              <div key={entry.id} className="relative flex items-start gap-3">
                <div className={`relative z-10 w-6 h-6 rounded-full bg-surface-high border border-outline-variant flex items-center justify-center flex-shrink-0 ${idx === 0 ? 'ring-2 ring-primary/20' : ''}`}>
                  <Icon className={`w-3 h-3 ${config.color}`} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-on-surface">{config.label}</span>
                    <span className="text-[10px] text-on-surface-variant">{formatDate(entry.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {entry.from_status && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-low text-on-surface-variant">
                        {formatStatus(entry.from_status)}
                      </span>
                    )}
                    {entry.from_status && <span className="text-[10px] text-on-surface-variant">→</span>}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-low text-on-surface-variant">
                      {formatStatus(entry.to_status)}
                    </span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    by {entry.performed_by_name || 'Unknown'} ({entry.performed_by_role || 'N/A'})
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkflowHistory;
