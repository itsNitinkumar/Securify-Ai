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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface EditUserDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditUserDialog = ({ user, open, onOpenChange, onSuccess }: EditUserDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    role: user.role as 'analyst' | 'reviewer' | 'manager' | 'client',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      await userApi.update(user.id, {
        name: formData.name,
        role: formData.role,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'analyst', label: 'Analyst', description: 'Can create and edit findings' },
    { value: 'reviewer', label: 'Reviewer', description: 'Can review and comment on findings' },
    { value: 'manager', label: 'Manager', description: 'Full access to all features' },
    { value: 'client', label: 'Client', description: 'Read-only access to approved findings' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface-high border-outline">
        <DialogHeader>
          <DialogTitle className="text-2xl text-on-surface">Edit User</DialogTitle>
          <DialogDescription>Update user information and role assignments.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Email (Read-only) */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Email Address
            </label>
            <Input
              disabled
              value={user.email}
              className="bg-surface-variant border-outline text-on-surface-variant cursor-not-allowed"
            />
            <p className="text-xs text-on-surface-variant mt-1">Email cannot be changed</p>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Full Name <span className="text-error">*</span>
            </label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., John Doe"
              className="bg-surface border-outline text-on-surface"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-3 block">
              Role <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      role: role.value as typeof formData.role,
                    })
                  }
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.role === role.value
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant hover:border-outline'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-on-surface">{role.label}</span>
                    {formData.role === role.value && (
                      <Badge className="bg-primary text-surface text-xs">Current</Badge>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant">{role.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 bg-surface rounded-lg border border-outline-variant">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-on-surface-variant">User ID:</span>
                <span className="text-on-surface ml-2 font-mono">{user.id}</span>
              </div>
              <div>
                <span className="text-on-surface-variant">Created:</span>
                <span className="text-on-surface ml-2">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
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
              type="submit"
              disabled={loading}
              className="bg-primary text-surface hover:bg-primary/90"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
