import { useState, useEffect } from 'react';
import { MessageSquare, Send, Edit2, Trash2, X } from 'lucide-react';
import { commentApi, Comment } from '@/api/commentApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import InlineConfirm from '@/components/ui/inline-confirm';

interface FindingCommentsProps {
  findingId: number;
  currentUserId: number;
  currentUserRole: string;
}

const FindingComments = ({ findingId, currentUserId, currentUserRole }: FindingCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    loadComments();
  }, [findingId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await commentApi.getByFinding(findingId);
      setComments(response.data.data || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      await commentApi.create(findingId, newComment);
      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Failed to create comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id: number) => {
    if (!editText.trim()) return;

    try {
      await commentApi.update(id, editText);
      setEditingId(null);
      setEditText('');
      loadComments();
    } catch (error) {
      console.error('Failed to update comment:', error);
      toast.error('Failed to update comment');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await commentApi.delete(id);
      setConfirmDeleteId((current) => (current === id ? null : current));
      loadComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.comment);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'manager':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'reviewer':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'analyst':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <Card className="p-4 bg-surface border-outline-variant">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-on-surface">
          Comments ({comments.length})
        </h3>
      </div>

      {/* Comment Form - Only Reviewers and Managers can add comments */}
      {(currentUserRole === 'reviewer' || currentUserRole === 'manager') && (
        <form onSubmit={handleSubmit} className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="w-full px-3 py-2 bg-surface-low border border-outline rounded-md text-on-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-end mt-2">
            <Button
              type="submit"
              disabled={submitting || !newComment.trim()}
              size="sm"
              className="bg-primary text-surface hover:bg-primary/90"
            >
              {submitting ? (
                'Posting...'
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post Comment
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-on-surface-variant mx-auto mb-2 opacity-50" />
          <p className="text-sm text-on-surface-variant">No comments yet</p>
          <p className="text-xs text-on-surface-variant mt-1">Be the first to comment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-3 bg-surface-low rounded-md border border-outline-variant"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-on-surface">
                    {comment.user_name || 'Unknown User'}
                  </span>
                  {comment.user_role && (
                    <Badge className={`text-xs ${getRoleBadgeColor(comment.user_role)}`}>
                      {comment.user_role}
                    </Badge>
                  )}
                  <span className="text-xs text-on-surface-variant">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                {(comment.user_id === currentUserId || currentUserRole === 'manager') && (
                  <div className="flex gap-1">
                    {editingId !== comment.id && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(comment)}
                          className="h-6 w-6 p-0 text-on-surface-variant hover:text-primary"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(comment.id)}
                          className="h-6 w-6 p-0 text-on-surface-variant hover:text-error"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {editingId === comment.id ? (
                <div>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface text-sm resize-none mb-2"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleEdit(comment.id)}
                      className="bg-primary text-surface hover:bg-primary/90"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEdit}
                      className="text-on-surface-variant"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant whitespace-pre-wrap">
                  {comment.comment}
                </p>
              )}

              {confirmDeleteId === comment.id ? (
                <div className="mt-3">
                  <InlineConfirm
                    danger
                    title="Delete comment?"
                    description="This cannot be undone."
                    confirmText="Delete"
                    onCancel={() => setConfirmDeleteId(null)}
                    onConfirm={() => void handleDelete(comment.id)}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default FindingComments;
