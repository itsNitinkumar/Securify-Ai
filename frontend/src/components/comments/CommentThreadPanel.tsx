import { useState, useEffect, useCallback } from 'react';
import { Send, CheckCircle, RotateCcw, Trash2, X, MessageSquare } from 'lucide-react';
import { commentThreadApi, CommentThread, ThreadReply } from '@/api/commentThreadApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import InlineConfirm from '@/components/ui/inline-confirm';

interface CommentThreadPanelProps {
  projectId: number;
  findingId?: number;
  sectionType: string;
  sectionKey: string;
  onClose: () => void;
  threads?: CommentThread[];
}

const CommentThreadPanel = ({ projectId, findingId, sectionType, sectionKey, onClose, threads: providedThreads }: CommentThreadPanelProps) => {
  const { user, hasPermission, hasRole } = useAuth();
  const [thread, setThread] = useState<CommentThread | null>(null);
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteReplyId, setConfirmDeleteReplyId] = useState<number | null>(null);

  const canComment = hasPermission('create_comments') || hasRole('manager', 'admin');
  const canManageAll = hasPermission('manage_roles') || hasPermission('approve_findings');
  const isClient = hasRole('client');

  useEffect(() => {
    if (providedThreads) {
      const matching = providedThreads.filter(
        (t) => t.section_type === sectionType && t.section_key === sectionKey
      );
      if (matching.length > 0) {
        setThread(matching[0]);
        loadReplies(matching[0].id);
        setLoading(false);
        return;
      }
    }
    loadThread();
  }, [projectId, findingId, sectionType, sectionKey, providedThreads]);

  const loadThread = async () => {
    try {
      setLoading(true);
      const res = await commentThreadApi.getThreads({ projectId, findingId, sectionType, sectionKey });
      const threads = res.data.data || [];
      if (threads.length > 0) {
        setThread(threads[0]);
        await loadReplies(threads[0].id);
      } else {
        setThread(null);
        setReplies([]);
      }
    } catch (error) {
      console.error('Failed to load thread:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async (threadId: number) => {
    try {
      const res = await commentThreadApi.getReplies(threadId);
      setReplies(res.data.data || []);
    } catch (error) {
      console.error('Failed to load replies:', error);
    }
  };

  const handleCreateAndPost = async () => {
    if (!newMessage.trim() || !canComment) return;
    try {
      setSubmitting(true);
      const res = await commentThreadApi.createThread({
        project_id: projectId,
        finding_id: findingId,
        section_type: sectionType,
        section_key: sectionKey,
        message: newMessage.trim(),
      });
      setThread(res.data.data || null);
      setNewMessage('');
      if (res.data.data) {
        await loadReplies(res.data.data.id);
      }
    } catch (error) {
      console.error('Failed to create thread:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async () => {
    if (!newMessage.trim() || !thread || !canComment) return;
    try {
      setSubmitting(true);
      await commentThreadApi.addReply(thread.id, newMessage.trim());
      setNewMessage('');
      await loadReplies(thread.id);
    } catch (error) {
      console.error('Failed to add reply:', error);
      toast.error('Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!thread) return;
    try {
      await commentThreadApi.resolveThread(thread.id);
      setThread(prev => prev ? { ...prev, status: 'RESOLVED' } : null);
      toast.success('Thread resolved');
    } catch (error) {
      console.error('Failed to resolve thread:', error);
      toast.error('Failed to resolve thread');
    }
  };

  const handleReopen = async () => {
    if (!thread) return;
    try {
      await commentThreadApi.reopenThread(thread.id);
      setThread(prev => prev ? { ...prev, status: 'REOPENED' } : null);
      toast.success('Thread reopened');
    } catch (error) {
      console.error('Failed to reopen thread:', error);
      toast.error('Failed to reopen thread');
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    try {
      await commentThreadApi.deleteReply(replyId);
      setConfirmDeleteReplyId(null);
      if (thread) await loadReplies(thread.id);
    } catch (error) {
      console.error('Failed to delete reply:', error);
      toast.error('Failed to delete reply');
    }
  };

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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const currentUserId = parseInt(user?.id || '0');

  const isOpen = thread?.status === 'OPEN' || thread?.status === 'REOPENED';
  const canResolve = thread && isOpen && (hasPermission('create_comments') || hasRole('reporter'));
  const canReopen = thread && thread.status === 'RESOLVED' && (hasPermission('manage_roles') || hasPermission('approve_findings') || hasRole('manager', 'admin'));

  if (loading) {
    return (
      <div className="mt-3 pt-3 border-t border-outline-variant">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          Loading comments...
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-outline-variant">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-on-surface">Comments</span>
          {thread && (
            <Badge className={`text-xs ${thread.status === 'RESOLVED' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
              {thread.status === 'RESOLVED' ? 'Resolved' : thread.status === 'REOPENED' ? 'Reopened' : 'Open'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {thread && canResolve && (
            <Button variant="ghost" size="sm" onClick={handleResolve} className="h-6 text-xs text-green-500 hover:text-green-400" title="Resolve thread">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Resolve
            </Button>
          )}
          {canReopen && (
            <Button variant="ghost" size="sm" onClick={handleReopen} className="h-6 text-xs text-yellow-500 hover:text-yellow-400" title="Reopen thread">
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reopen
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 text-on-surface-variant hover:text-primary">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {!thread && !isClient && (
        <div className="mb-3">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="w-full px-3 py-2 bg-surface-low border border-outline rounded-md text-on-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-end mt-2">
            <Button
              type="button"
              onClick={handleCreateAndPost}
              disabled={submitting || !newMessage.trim()}
              size="sm"
              className="bg-primary text-surface hover:bg-primary/90"
            >
              {submitting ? 'Posting...' : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post Comment
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {thread && (
        <>
          <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
            {replies.length === 0 && (
              <p className="text-xs text-on-surface-variant text-center py-3">No replies yet</p>
            )}
            {replies.map((reply) => (
              <div key={reply.id} className="p-2.5 bg-surface-low rounded-md border border-outline-variant">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-xs font-medium text-on-surface truncate">
                      {reply.user_name || 'Unknown User'}
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
                  {(reply.user_id === currentUserId || canManageAll) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteReplyId(reply.id)}
                      className="h-5 w-5 p-0 text-on-surface-variant hover:text-error flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {confirmDeleteReplyId === reply.id ? (
                  <div className="mt-1">
                    <InlineConfirm
                      danger
                      title="Delete reply?"
                      description="This cannot be undone."
                      confirmText="Delete"
                      onCancel={() => setConfirmDeleteReplyId(null)}
                      onConfirm={() => { handleDeleteReply(reply.id); }}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant whitespace-pre-wrap">{reply.message}</p>
                )}
              </div>
            ))}
          </div>

          {!isClient && (
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Add a reply..."
                rows={1}
                className="flex-1 px-3 py-2 bg-surface-low border border-outline rounded-md text-on-surface text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (thread) handleAddReply();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddReply}
                disabled={submitting || !newMessage.trim()}
                size="sm"
                className="bg-primary text-surface hover:bg-primary/90 h-9"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </>
      )}

      {!thread && isClient && (
        <p className="text-xs text-on-surface-variant text-center py-2">No comments yet</p>
      )}
    </div>
  );
};

export default CommentThreadPanel;
