import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Plus, MessageSquare, CheckCircle } from 'lucide-react';
import { commentThreadApi, CommentThread } from '@/api/commentThreadApi';
import { Badge } from '@/components/ui/badge';
import CommentThreadPanel from './CommentThreadPanel';
import { useAuth } from '@/contexts/AuthContext';

interface CommentableSectionProps {
  projectId: number;
  findingId?: number;
  sectionType: string;
  sectionKey: string;
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

const CommentableSection = ({
  projectId,
  findingId,
  sectionType,
  sectionKey,
  label,
  icon,
  children,
  className,
  actions,
}: CommentableSectionProps) => {
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const { hasRole } = useAuth();
  const isClient = hasRole('client');

  useEffect(() => {
    if (projectId) {
      loadThreadCounts();
    }
  }, [projectId, findingId, sectionType, sectionKey]);

  const loadThreadCounts = async () => {
    try {
      setLoading(true);
      const res = await commentThreadApi.getThreads({ projectId, findingId, sectionType, sectionKey });
      setThreads(res.data.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePanel = useCallback(() => {
    if (isClient) return;
    setShowPanel(prev => !prev);
  }, [isClient]);

  const handlePanelClose = useCallback(() => {
    setShowPanel(false);
    loadThreadCounts();
  }, []);

  const handleReplyAdded = useCallback(() => {
    loadThreadCounts();
  }, []);

  const totalComments = threads.reduce((sum, t) => sum + (t.reply_count || 0) + 1, 0);
  const unresolvedCount = threads.filter(t => t.status === 'OPEN' || t.status === 'REOPENED').length;
  const resolvedCount = threads.filter(t => t.status === 'RESOLVED').length;

  return (
    <div className={`group ${className || ''}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
          {icon}
          {label}
        </h3>
        <div className="flex items-center gap-1.5">
          {totalComments > 0 && !showPanel && (
            <button
              type="button"
              onClick={handleTogglePanel}
              className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors"
            >
              {unresolvedCount > 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>{unresolvedCount}</span>
                </>
              ) : resolvedCount > 0 ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span>{totalComments}</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3 h-3" />
                  <span>{totalComments}</span>
                </>
              )}
            </button>
          )}
          {!isClient && (
            <button
              type="button"
              onClick={handleTogglePanel}
              className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-high text-on-surface-variant hover:text-primary ${showPanel ? 'opacity-100 bg-surface-high text-primary' : ''}`}
              title={showPanel ? 'Close comments' : 'Add comment'}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      </div>

      {children}

      {showPanel && (
        <CommentThreadPanel
          projectId={projectId}
          findingId={findingId}
          sectionType={sectionType}
          sectionKey={sectionKey}
          onClose={handlePanelClose}
        />
      )}
    </div>
  );
};

export default CommentableSection;
