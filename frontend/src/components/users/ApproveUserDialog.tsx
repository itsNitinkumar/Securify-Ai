import { useState } from 'react';
import { userApi } from '@/api/userApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  status?: string;
}

interface ApproveUserDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ApproveUserDialog = ({ user, open, onOpenChange, onSuccess }: ApproveUserDialogProps) => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('client');

  const handleApprove = async () => {
    try {
      setLoading(true);
      await userApi.approve(user.id, selectedRole);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to approve user:', error);
      alert('Failed to approve user');
    } finally {
      setLoading(false);
    }
  };

  // Define available roles based on current user's role
  const allRoles = [
    { value: 'client', label: 'Client', description: 'Read-only access to approved findings', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    { value: 'reporter', label: 'Reporter', description: 'Creates and manages findings', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    { value: 'manager', label: 'Manager', description: 'Full access to projects and reports', color: 'bg-primary/10 text-primary border-primary/20' },
  ];

  // Filter roles based on current user's permissions
  const availableRoles = currentUser?.role === 'admin' 
    ? allRoles
    : allRoles.filter(r => r.value !== 'manager');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface-high border-outline">
        <DialogHeader>
          <DialogTitle className="text-2xl text-on-surface flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-400" />
            Approve User Account
          </DialogTitle>
          <DialogDescription>Select a role for this user and activate their account.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* User Info */}
          <div className="p-4 bg-surface rounded-lg border border-outline-variant">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-on-surface-variant">Name:</span>
                <span className="text-sm text-on-surface ml-2 font-medium">{user.name}</span>
              </div>
              <div>
                <span className="text-xs text-on-surface-variant">Email:</span>
                <span className="text-sm text-on-surface ml-2">{user.email}</span>
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-3 block">
              Assign Role <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableRoles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedRole === role.value
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant hover:border-outline'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-on-surface">{role.label}</span>
                    {selectedRole === role.value && (
                      <Badge className="bg-primary text-surface text-xs">Selected</Badge>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant">{role.description}</p>
                </button>
              ))}
            </div>
            {currentUser?.role === 'manager' && (
              <p className="text-xs text-on-surface-variant mt-2">
                ℹ️ Only admin can assign manager role
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-400">
              ✓ This user will be able to login immediately after approval.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-outline text-on-surface-variant"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApprove}
            disabled={loading}
            className="bg-green-500 text-white hover:bg-green-600"
          >
            {loading ? 'Approving...' : 'Approve & Activate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveUserDialog;
