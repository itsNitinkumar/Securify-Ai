import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, UserCog } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const RoleRequestPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');

  const canSubmit = useMemo(() => {
    return !hasPendingRequest && reason.trim().length > 0 && !submitting;
  }, [hasPendingRequest, reason, submitting]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await axios.get('/role-requests/my-requests');
        const requests = (response.data as any)?.data || [];
        const pending = Array.isArray(requests)
          ? requests.some((req: any) => req?.status === 'pending')
          : false;
        if (!cancelled) setHasPendingRequest(pending);
      } catch (error) {
        console.error('Failed to load role requests', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error('Please provide a reason for the role change');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post('/role-requests/request', {
        requested_role: 'reporter',
        request_reason: reason,
      });
      toast.success('Role request submitted');
      navigate('/profile');
    } catch (error: any) {
      console.error('Failed to submit role request', error);
      toast.error(error?.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-on-surface-variant">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/profile')}
        className="mb-4 text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Profile
      </Button>

      <div className="mb-6 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <UserCog className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Request Role Change</h1>
          <p className="text-sm text-on-surface-variant">
            Submit a request to become a reporter.
          </p>
        </div>
      </div>

      {hasPendingRequest && (
        <Card className="mb-6 p-4 bg-surface-high border-outline">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
            <div>
              <p className="text-sm font-medium text-on-surface">Pending request</p>
              <p className="text-sm text-on-surface-variant">
                You already have a pending role change request. Please wait for manager approval.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="max-w-3xl p-6 bg-surface-high border-outline">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 border border-outline rounded-lg bg-surface">
            <div className="font-medium text-on-surface">Reporter</div>
            <div className="text-sm text-on-surface-variant">Create and edit findings, upload evidence</div>
          </div>

          <div>
            <Label htmlFor="reason" className="text-on-surface">
              Reason for Request <span className="text-error">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="mt-2 bg-surface border-outline text-on-surface"
              placeholder="Explain why you need this role (experience, responsibilities, etc.)"
              disabled={hasPendingRequest || submitting}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/profile')}
              className="border-outline text-on-surface-variant"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-surface hover:bg-primary/90"
              disabled={!canSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default RoleRequestPage;
