import React, { useEffect, useState } from 'react';
import { UserCheck, UserX, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import axios from '@/api/axios';

interface RoleRequest {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  requested_role: string;
  previous_role: string;
  status: string;
  request_reason?: string;
  reviewed_by?: number;
  reviewer_name?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

export const RoleRequestsDashboard: React.FC = () => {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const endpoint = filter === 'pending' 
        ? '/role-requests/pending' 
        : '/role-requests';
      
      const response = await axios.get(endpoint);
      setRequests(response.data.data);
    } catch (error) {
      showNotification('Failed to load role requests', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (requestId: number, status: 'approved' | 'rejected') => {
    setReviewingId(requestId);

    try {
      await axios.patch(`/role-requests/${requestId}/review`, {
        status,
        review_notes: reviewNotes || undefined,
      });

      showNotification(`Request ${status} successfully!`, 'success');
      setReviewNotes('');
      fetchRequests();
    } catch (error: any) {
      showNotification(error.response?.data?.message || `Failed to ${status} request`, 'error');
    } finally {
      setReviewingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
      approved: 'bg-primary/10 text-primary border border-primary/20',
      rejected: 'bg-error/10 text-error border border-error/20',
    };

    const icons = {
      pending: <Clock className="w-3 h-3" />,
      approved: <CheckCircle className="w-3 h-3" />,
      rejected: <XCircle className="w-3 h-3" />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      client: 'bg-surface-high text-on-surface-variant border border-outline',
      analyst: 'bg-primary/10 text-primary border border-primary/20',
      reviewer: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[role as keyof typeof colors]}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-surface-high rounded-lg border border-outline">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg border z-50 ${
          notification.type === 'success' 
            ? 'bg-primary/10 text-primary border-primary/20' 
            : 'bg-error/10 text-error border-error/20'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="p-4 border-b border-outline">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-on-surface">Role Change Requests</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                filter === 'pending'
                  ? 'bg-primary text-on-primary-container shadow-[0_0_20px_rgba(0,252,64,0.15)]'
                  : 'bg-surface-bright text-on-surface-variant hover:bg-surface-highest border border-outline'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                filter === 'all'
                  ? 'bg-primary text-on-primary-container shadow-[0_0_20px_rgba(0,252,64,0.15)]'
                  : 'bg-surface-bright text-on-surface-variant hover:bg-surface-highest border border-outline'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="p-8 text-center text-on-surface-variant">
          <Clock className="w-12 h-12 mx-auto mb-2 text-outline" />
          <p>No {filter === 'pending' ? 'pending' : ''} role requests</p>
        </div>
      ) : (
        <div className="divide-y divide-outline">
          {requests.map((request) => (
            <div key={request.id} className="p-4 hover:bg-surface-bright transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-on-surface">{request.user_name}</h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-sm text-on-surface-variant">{request.user_email}</p>
                </div>
                <div className="text-right text-sm text-on-surface-variant">
                  {formatDate(request.created_at)}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {getRoleBadge(request.previous_role)}
                <span className="text-on-surface-variant">→</span>
                {getRoleBadge(request.requested_role)}
              </div>

              {request.request_reason && (
                <div className="mb-3 p-3 bg-surface rounded-lg border border-outline">
                  <p className="text-sm text-on-surface-variant">{request.request_reason}</p>
                </div>
              )}

              {request.status === 'pending' && (
                <div className="space-y-2">
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add review notes (optional)"
                    rows={2}
                    className="w-full px-3 py-2 bg-surface border border-outline rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(request.id, 'approved')}
                      disabled={reviewingId === request.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary-container rounded-lg hover:bg-primary-container transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,252,64,0.15)]"
                    >
                      {reviewingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReview(request.id, 'rejected')}
                      disabled={reviewingId === request.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-error/10 text-error border border-error/20 rounded-lg hover:bg-error/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reviewingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserX className="w-4 h-4" />
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {request.status !== 'pending' && request.reviewed_at && (
                <div className="mt-3 p-3 bg-surface rounded-lg border border-outline text-sm">
                  <p className="text-on-surface-variant">
                    Reviewed by <span className="font-medium text-on-surface">{request.reviewer_name}</span> on{' '}
                    {formatDate(request.reviewed_at)}
                  </p>
                  {request.review_notes && (
                    <p className="mt-1 text-on-surface-variant">{request.review_notes}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
