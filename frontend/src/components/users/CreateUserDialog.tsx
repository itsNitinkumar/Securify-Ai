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

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateUserDialog = ({ open, onOpenChange, onSuccess }: CreateUserDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'analyst' as 'analyst' | 'reviewer' | 'manager' | 'client',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      await userApi.create({
        name: formData.name,
        email: formData.email,
      });
      onSuccess();
      onOpenChange(false);
      // Reset form
      setFormData({
        name: '',
        email: '',
        role: 'analyst',
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user');
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
          <DialogTitle className="text-2xl text-on-surface">Add New User</DialogTitle>
          <DialogDescription>Create a new user account with specific role and permissions.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Email Address <span className="text-error">*</span>
            </label>
            <Input
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g., john.doe@company.com"
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
                      <Badge className="bg-primary text-surface text-xs">Selected</Badge>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant">{role.description}</p>
                </button>
              ))}
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
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;
