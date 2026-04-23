import React, { useState } from 'react';
import { UserCog, Loader2 } from 'lucide-react';
import axios from '@/api/axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RoleRequestButtonProps {
  currentRole: string;
  hasPendingRequest?: boolean;
}

export const RoleRequestButton: React.FC<RoleRequestButtonProps> = ({
  currentRole,
  hasPendingRequest = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'analyst' | 'reviewer'>('analyst');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Don't show button if user is already manager or admin
  if (currentRole === 'manager' || currentRole === 'admin') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!reason.trim()) {
      setError('Please provide a reason for the role change');
      return;
    }

    setIsLoading(true);

    try {
      await axios.post('/role-requests/request', {
        requested_role: selectedRole,
        request_reason: reason,
      });

      setSuccess('Role request submitted successfully!');
      setIsOpen(false);
      setReason('');
      
      // Reload page to update status
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsLoading(false);
    }
  };

  if (hasPendingRequest) {
    return (
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          You have a pending role change request. Please wait for manager approval.
        </p>
      </div>
    );
  }

  return (
    <>
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}
      
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-primary text-surface hover:bg-primary/90"
      >
        <UserCog className="w-4 h-4 mr-2" />
        Request Role Change
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-surface-high border-outline">
          <DialogHeader>
            <DialogTitle className="text-on-surface">Request Role Change</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-error/10 border border-error/30 rounded-lg">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}
            
            <div>
              <Label className="text-on-surface mb-2 block">Select Role</Label>
              <div className="space-y-2">
                <label className="flex items-start p-3 border border-outline rounded-lg cursor-pointer hover:bg-surface transition-colors">
                  <input
                    type="radio"
                    value="analyst"
                    checked={selectedRole === 'analyst'}
                    onChange={(e) => setSelectedRole(e.target.value as 'analyst')}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-on-surface">Analyst</div>
                    <div className="text-sm text-on-surface-variant">
                      Create and edit findings, upload evidence
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-3 border border-outline rounded-lg cursor-pointer hover:bg-surface transition-colors">
                  <input
                    type="radio"
                    value="reviewer"
                    checked={selectedRole === 'reviewer'}
                    onChange={(e) => setSelectedRole(e.target.value as 'reviewer')}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-on-surface">Reviewer</div>
                    <div className="text-sm text-on-surface-variant">
                      Review and approve findings
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="reason" className="text-on-surface">
                Reason for Request
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="mt-2 bg-surface border-outline text-on-surface"
                placeholder="Explain why you need this role (e.g., experience, qualifications, responsibilities)"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 border-outline text-on-surface-variant"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-primary text-surface hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
