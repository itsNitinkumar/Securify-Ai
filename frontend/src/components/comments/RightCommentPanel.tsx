import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Send, CheckCircle, RotateCcw, Trash2, MessageSquare } from 'lucide-react';
import { commentThreadApi, CommentThread, ThreadReply } from '@/api/commentThreadApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

export interface RightCommentPanelProps {
  projectId: number;
  findingId?: number;
  sectionType: string;
  sectionKey: string;
  sectionLabel: string;
  threads: CommentThread[];
  open: boolean;
  onClose: () => void;
  onThreadsChanged: () => void;
}

const getRoleBadgeColor = (role?: string) => {
  switch (role) {
    case 'manager':
    case 'admin':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'reporter':
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

type ThreadWithReplies = CommentThread & { replies?: ThreadReply[] };

const RightCommentPanel = ({
  projectId,
  findingId,
  sectionType,
  sectionKey,
  sectionLabel,
  threads,
  open,
  onClose,
  onThreadsChanged,
}: RightCommentPanelProps) => {
  const { user, hasPermission, hasRole } = useAuth();
  const [localThreads, setLocalThreads] = useState<ThreadWithReplies[]>([]);
  const [loadedReplySet, setLoadedReplySet] = useState<Set<number>>(new Set());
  const [newMessage, setNewMessage] = useState('');
  const [footerMessage, setFooterMessage] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingThreadId, setLoadingThreadId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const seededSectionRef = useRef<string>('');

  const canComment = hasPermission('create_comments') || hasRole('manager', 'admin');
  const canManageAll = hasRole('manager') || hasRole('admin') || hasPermission('manage_roles') || hasPermission('approve_findings');
  const isClient = hasRole('client');
  const currentUserId = parseInt(user?.id || '0');

  const sectionFingerprint = `${sectionType}::${findingId || 0}::${sectionKey}::${threads.length}`;

  useEffect(() => {
    if (!open) {
      setNewMessage('');
      setFooterMessage('');
      setActiveThreadId(null);
      return;
    }
    if (seededSectionRef.current === sectionFingerprint) return;
    seededSectionRef.current = sectionFingerprint;
    const seeded: ThreadWithReplies[] = threads.map((t) => ({
      ...t,
      replies: (t as ThreadWithReplies).replies ? [...(t as ThreadWithReplies).replies!] : undefined,
    }));
    setLocalThreads(seeded);
    setLoadedReplySet(new Set());
    setFilter('all');
  }, [open, sectionFingerprint, threads]);

  const loadReplies = useCallback(async (threadId: number, force = false) => {
    if (!force && loadedReplySet.has(threadId)) return;
    try {
      setLoadingThreadId(threadId);
      const res = await commentThreadApi.getReplies(threadId);
      const replies = res.data.data || [];
      setLocalThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, replies } : t))
      );
      setLoadedReplySet((prev) => {
        const next = new Set(prev);
        next.add(threadId);
        return next;
      });
    } catch (error) {
      console.error('Failed to load replies:', error);
    } finally {
      setLoadingThreadId(threadId);
    }
  }, [loadedReplySet]);

  useEffect(() => {
    if (!open) return;
    localThreads.forEach((t) => {
      if (!t.replies) {
        void loadReplies(t.id);
      }
    });
  }, [open, localThreads, loadReplies]);

  const handleCreateThread = async () => {
    if (!footerMessage.trim() || !canComment) return;
    const message = footerMessage.trim();
    try {
      setSubmitting(true);
      const res = await commentThreadApi.createThread({
        project_id: projectId,
        finding_id: findingId,
        section_type: sectionType,
        section_key: sectionKey,
        message,
      });
      const created = res.data.data;
      if (created) {
        const enriched: ThreadWithReplies = {
          ...created,
          replies: (created as ThreadWithReplies).replies || [],
        };
        setLocalThreads((prev) => {
          const existingIdx = prev.findIndex((t) => t.id === created.id);
          if (existingIdx >= 0) {
            const next = [...prev];
            next[existingIdx] = enriched;
            return next;
          }
          return [enriched, ...prev];
        });
        setLoadedReplySet((prev) => new Set(prev).add(created.id));
      }
      setFooterMessage('');
      onThreadsChanged();
    } catch (error) {
      console.error('Failed to create thread:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (threadId: number) => {
    if (!newMessage.trim() || !canComment) return;
    const message = newMessage.trim();
    try {
      setSubmitting(true);
      const res = await commentThreadApi.addReply(threadId, message);
      const reply = res.data.data;
      if (reply) {
        const enrichedReply = {
          ...reply,
          user_name: reply.user_name || user?.name || 'You',
          user_role: reply.user_role || user?.role,
        };
        setLocalThreads((prev) =>
          prev.map((t) => {
            if (t.id !== threadId) return t;
            const existing = t.replies || [];
            const seen = new Set(existing.map((r) => r.id));
            const replies = seen.has(enrichedReply.id) ? existing : [...existing, enrichedReply];
            return {
              ...t,
              replies,
              status: t.status === 'RESOLVED' ? 'REOPENED' : t.status,
            };
          })
        );
      }
      setNewMessage('');
      onThreadsChanged();
    } catch (error) {
      console.error('Failed to add reply:', error);
      toast.error('Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (threadId: number) => {
    const previous = localThreads.find((t) => t.id === threadId);
    if (!previous) return;
    setLocalThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, status: 'RESOLVED' } : t))
    );
    try {
      await commentThreadApi.resolveThread(threadId);
      toast.success('Thread resolved');
      onThreadsChanged();
    } catch (error) {
      console.error('Failed to resolve thread:', error);
      toast.error('Failed to resolve thread');
      setLocalThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, status: previous.status } : t))
      );
    }
  };

  const handleReopen = async (threadId: number) => {
    const previous = localThreads.find((t) => t.id === threadId);
    if (!previous) return;
    setLocalThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, status: 'REOPENED' } : t))
    );
    try {
      await commentThreadApi.reopenThread(threadId);
      toast.success('Thread reopened');
      onThreadsChanged();
    } catch (error) {
      console.error('Failed to reopen thread:', error);
      toast.error('Failed to reopen thread');
      setLocalThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, status: previous.status } : t))
      );
    }
  };

  const handleDeleteReply = async (threadId: number, replyId: number) => {
    let snapshot: ThreadReply[] = [];
    setLocalThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        snapshot = t.replies || [];
        return { ...t, replies: (t.replies || []).filter((r) => r.id !== replyId) };
      })
    );
    try {
      await commentThreadApi.deleteReply(replyId);
    } catch (error: any) {
      console.error('Failed to delete reply:', error);
      const status = error?.response?.status;
      if (status === 404) {
        toast.error('Reply already removed');
      } else if (status === 403) {
        toast.error('You can only delete your own replies');
      } else {
        toast.error('Failed to delete reply');
      }
      setLocalThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, replies: snapshot } : t))
      );
    }
  };

  const openCount = localThreads.filter((t) => t.status === 'OPEN' || t.status === 'REOPENED').length;
  const resolvedCount = localThreads.filter((t) => t.status === 'RESOLVED').length;

  const visibleThreads = localThreads.filter((t) => {
    if (filter === 'open') return t.status === 'OPEN' || t.status === 'REOPENED';
    if (filter === 'resolved') return t.status === 'RESOLVED';
    return true;
  });

  return (
    <aside
      aria-hidden={!open}
      className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-surface-low border-l border-outline shadow-2xl z-40 transform transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full">
        <header className="flex items-start justify-between gap-2 px-4 py-3 border-b border-outline bg-surface-high">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-on-surface-variant">
              {findingId ? 'Finding section' : 'Project section'}
            </div>
            <h3 className="text-sm font-semibold text-on-surface truncate" title={sectionLabel}>
              {sectionLabel}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-on-surface-variant">
              <MessageSquare className="w-3 h-3" />
              <span>{localThreads.length} thread{localThreads.length === 1 ? '' : 's'}</span>
              {openCount > 0 && (
                <span className="text-orange-400">· {openCount} open</span>
              )}
              {resolvedCount > 0 && (
                <span className="text-green-400">· {resolvedCount} resolved</span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1">
              {([
                { key: 'all', label: 'All', count: localThreads.length },
                { key: 'open', label: 'Open', count: openCount },
                { key: 'resolved', label: 'Resolved', count: resolvedCount },
              ] as const).map((opt) => {
                const active = filter === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFilter(opt.key)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      active
                        ? 'bg-primary text-surface border-primary'
                        : 'bg-transparent text-on-surface-variant border-outline hover:border-primary hover:text-primary'
                    }`}
                  >
                    {opt.label} ({opt.count})
                  </button>
                );
              })}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-on-surface-variant hover:text-primary"
            aria-label="Close comments panel"
          >
            <X className="w-4 h-4" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3">
          {localThreads.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-10 h-10 text-on-surface-variant mx-auto mb-2 opacity-50" />
              <p className="text-sm text-on-surface-variant">No comments on this section yet</p>
              {!isClient && canComment && (
                <p className="text-xs text-on-surface-variant mt-1">Start the discussion below</p>
              )}
            </div>
          )}

          {localThreads.length > 0 && visibleThreads.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-10 h-10 text-on-surface-variant mx-auto mb-2 opacity-50" />
              <p className="text-sm text-on-surface-variant">
                No {filter === 'open' ? 'open' : 'resolved'} threads on this section
              </p>
            </div>
          )}

          {visibleThreads.map((thread) => {
            const replies = thread.replies || [];
            const isOpen = thread.status === 'OPEN' || thread.status === 'REOPENED';
            const isActive = activeThreadId === thread.id;
            const canResolve = isOpen && (hasPermission('create_comments') || hasRole('reporter'));
            const canReopen = thread.status === 'RESOLVED' &&
              (hasPermission('manage_roles') || hasPermission('approve_findings') || hasRole('manager', 'admin'));
            return (
              <div
                key={thread.id}
                className={`rounded-md border bg-surface ${
                  isOpen ? 'border-orange-500/40' : 'border-green-500/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveThreadId(isActive ? null : thread.id)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-on-surface truncate">
                      {thread.created_by_name || 'Unknown'}
                    </span>
                    {thread.created_by_role && (
                      <Badge className={`text-[10px] ${getRoleBadgeColor(thread.created_by_role)}`}>
                        {thread.created_by_role}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      className={`text-[10px] ${
                        thread.status === 'RESOLVED'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      }`}
                    >
                      {thread.status}
                    </Badge>
                  </div>
                </button>

                <div className="px-3 pb-3 space-y-2">
                  {loadingThreadId === thread.id && replies.length === 0 ? (
                    <p className="text-xs text-on-surface-variant">Loading…</p>
                  ) : (
                    replies.map((reply) => {
                      const canDeleteThisReply =
                        reply.user_id === currentUserId || canManageAll;
                      return (
                        <div
                          key={reply.id}
                          className="rounded-md border border-outline-variant bg-surface-low p-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-xs font-medium text-on-surface truncate">
                                {reply.user_name || 'Unknown'}
                              </span>
                              {reply.user_role && (
                                <Badge className={`text-[10px] ${getRoleBadgeColor(reply.user_role)}`}>
                                  {reply.user_role}
                                </Badge>
                              )}
                              <span className="text-[10px] text-on-surface-variant whitespace-nowrap">
                                {formatDate(reply.created_at)}
                              </span>
                            </div>
                            {canDeleteThisReply && (
                              <button
                                type="button"
                                onClick={() => handleDeleteReply(thread.id, reply.id)}
                                className="text-on-surface-variant hover:text-error p-1"
                                title={reply.user_id === currentUserId ? 'Delete your reply' : 'Delete reply (manager override)'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-on-surface-variant whitespace-pre-wrap">
                            {reply.message}
                          </p>
                        </div>
                      );
                    })
                  )}

                  {isActive && !isClient && canComment && (
                    <div className="flex items-center gap-2 pt-1">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Reply…"
                        rows={1}
                        className="flex-1 px-2 py-1.5 bg-surface border border-outline rounded-md text-on-surface text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (newMessage.trim()) handleAddReply(thread.id);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => handleAddReply(thread.id)}
                        disabled={submitting || !newMessage.trim()}
                        size="sm"
                        className="bg-primary text-surface hover:bg-primary/90 h-8 px-2"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center gap-1 pt-1">
                    {canResolve && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResolve(thread.id)}
                        className="h-6 text-[11px] text-green-500 hover:text-green-400 px-2"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Resolve
                      </Button>
                    )}
                    {canReopen && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReopen(thread.id)}
                        className="h-6 text-[11px] text-orange-500 hover:text-orange-400 px-2"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reopen
                      </Button>
                    )}
                    {!isClient && canComment && !isActive && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveThreadId(thread.id)}
                        className="h-6 text-[11px] text-primary hover:text-primary/80 px-2"
                      >
                        Reply
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isClient && canComment && (
          <footer className="border-t border-outline bg-surface-high p-3">
            <div className="flex items-center gap-2">
              <textarea
                value={footerMessage}
                onChange={(e) => setFooterMessage(e.target.value)}
                placeholder={localThreads.length > 0 ? 'Reply to a thread above, or start a new one…' : 'Start a new thread…'}
                rows={2}
                className="flex-1 px-2 py-1.5 bg-surface border border-outline rounded-md text-on-surface text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (footerMessage.trim()) handleCreateThread();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleCreateThread}
                disabled={submitting || !footerMessage.trim()}
                size="sm"
                className="bg-primary text-surface hover:bg-primary/90 h-9 px-3"
                title="Start a new thread"
              >
                <Send className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-on-surface-variant">
              Click a section on the left to attach a comment to it.
            </p>
          </footer>
        )}
      </div>
    </aside>
  );
};

export default RightCommentPanel;
