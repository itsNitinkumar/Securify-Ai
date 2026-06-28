import { useState, useEffect } from 'react';
import { MessageSquare, Send, Edit2, Trash2, X, CheckCircle, RotateCcw } from 'lucide-react';
import { projectCommentApi, ProjectComment } from '@/api/projectCommentApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import InlineConfirm from '@/components/ui/inline-confirm';

const SECTION_TYPES = [
  'project_details',
  'application_details',
  'user_roles',
  'out_of_scope_endpoints',
  'finding_description',
  'finding_impact',
  'finding_likelihood',
  'finding_recommendation',
  'finding_references',
  'finding_evidence',
  'finding_steps_to_reproduce',
  'dast_fp_description',
  'dast_fp_affected_target',
  'dast_fp_references',
  'dast_fp_evidence',
  'custom',
] as const;

interface ProjectCommentsProps {
  projectId: number;
}

const ProjectComments = ({ projectId }: ProjectCommentsProps) => {
  const { user, hasPermission, hasRole } = useAuth();
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newSectionType, setNewSectionType] = useState('custom');
  const [newSectionIdentifier, setNewSectionIdentifier] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const canComment = hasPermission('create_comments') || hasRole('manager', 'admin');
  const canManageAll = hasRole('manager') || hasRole('admin') || hasPermission('manage_roles') || hasPermission('approve_findings');
  const canResolve = hasPermission('create_comments');
  const canReopen = canManageAll;

  useEffect(() => {
    loadComments();
  }, [projectId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await projectCommentApi.getByProject(projectId);
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
      await projectCommentApi.create(projectId, {
        section_type: newSectionType,
        section_identifier: newSectionIdentifier.trim() || undefined,
        comment: newComment,
      });
      setNewComment('');
      setNewSectionIdentifier('');
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
      await projectCommentApi.update(id, editText);
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
      await projectCommentApi.delete(id);
      setConfirmDeleteId(null);
      loadComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await projectCommentApi.resolve(id);
      loadComments();
      toast.success('Comment resolved');
    } catch (error) {
      console.error('Failed to resolve comment:', error);
      toast.error('Failed to resolve comment');
    }
  };

  const handleReopen = async (id: number) => {
    try {
      await projectCommentApi.reopen(id);
      loadComments();
    } catch (error) {
      console.error('Failed to reopen comment:', error);
      toast.error('Failed to reopen comment');
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

  const getSectionLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getRoleBadgeColor = (role: string) => {
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

  const unresolvedCount = comments.filter((c) => !c.resolved).length;

  return (
    <Card className="p-4 bg-surface-high border-outline">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-on-surface">
          Review Comments ({comments.length})
        </h3>
        {unresolvedCount > 0 && (
          <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
            {unresolvedCount} unresolved
          </Badge>
        )}
      </div>

      {canComment && (
        <form onSubmit={handleSubmit} className="mb-4 space-y-2">
          <div className="flex gap-2">
            <select
              value={newSectionType}
              onChange={(e) => setNewSectionType(e.target.value)}
              className="flex-1 px-3 py-2 bg-surface-low border border-outline rounded-md text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="custom">General Comment</option>
              {SECTION_TYPES.filter((s) => s !== 'custom').map((type) => (
                <option key={type} value={type}>{getSectionLabel(type)}</option>
              ))}
            </select>
            <input
              type="text"
              value={newSectionIdentifier}
              onChange={(e) => setNewSectionIdentifier(e.target.value)}
              placeholder="Section ref (optional)"
              className="flex-1 px-3 py-2 bg-surface-low border border-outline rounded-md text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a review comment..."
            rows={3}
            className="w-full px-3 py-2 bg-surface-low border border-outline rounded-md text-on-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-end">
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

      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-on-surface-variant mx-auto mb-2 opacity-50" />
          <p className="text-sm text-on-surface-variant">No review comments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 bg-surface-low rounded-md border ${
                comment.resolved ? 'border-green-500/20 opacity-75' : 'border-outline-variant'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-on-surface">
                    {comment.created_by_name || 'Unknown User'}
                  </span>
                  {comment.created_by_role && (
                    <Badge className={`text-xs ${getRoleBadgeColor(comment.created_by_role)}`}>
                      {comment.created_by_role}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs border-outline text-on-surface-variant">
                    {getSectionLabel(comment.section_type)}
                  </Badge>
                  {comment.section_identifier && (
                    <span className="text-xs text-on-surface-variant">
                      [{comment.section_identifier}]
                    </span>
                  )}
                  <span className="text-xs text-on-surface-variant">
                    {formatDate(comment.created_at)}
                  </span>
                  {comment.resolved && (
                    <Badge className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
                      Resolved
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {!comment.resolved && canResolve && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResolve(comment.id)}
                      className="h-6 w-6 p-0 text-green-500 hover:text-green-400"
                      title="Mark as resolved"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {comment.resolved && canReopen && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReopen(comment.id)}
                      className="h-6 w-6 p-0 text-yellow-500 hover:text-yellow-400"
                      title="Reopen"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {(comment.created_by === parseInt(user?.id || '0') || canManageAll) && (
                    <>
                      {editingId !== comment.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditText(comment.comment);
                          }}
                          className="h-6 w-6 p-0 text-on-surface-variant hover:text-primary"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
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
                      onClick={() => {
                        setEditingId(null);
                        setEditText('');
                      }}
                      className="text-on-surface-variant"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className={`text-sm whitespace-pre-wrap ${comment.resolved ? 'text-on-surface-variant' : 'text-on-surface'}`}>
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
                    onConfirm={() => { handleDelete(comment.id); }}
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

export default ProjectComments;
