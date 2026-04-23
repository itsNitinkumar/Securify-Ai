import { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
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

interface CreateManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateManagerDialog = ({ open, onOpenChange, onSuccess }: CreateManagerDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 12) {
      alert('Password must be at least 12 characters long');
      return;
    }

    try {
      setLoading(true);
      await userApi.createManager(formData);
      alert('Manager created successfully!');
      onSuccess();
      onOpenChange(false);
      setFormData({ name: '', email: '', password: '' });
    } catch (error: any) {
      console.error('Failed to create manager:', error);
      alert(error.response?.data?.message || 'Failed to create manager');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface-high border-outline">
        <DialogHeader>
          <DialogTitle className="text-xl text-on-surface">Create Manager Account</DialogTitle>
          <DialogDescription>
            Create a new manager account with full credentials. Manager will be able to login immediately.
          </DialogDescription>
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
              placeholder="John Manager"
              className="bg-surface border-outline text-on-surface"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Email <span className="text-error">*</span>
            </label>
            <Input
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="manager@company.com"
              className="bg-surface border-outline text-on-surface"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Password <span className="text-error">*</span>
            </label>
            <Input
              required
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 12 characters"
              className="bg-surface border-outline text-on-surface"
              minLength={12}
            />
            <p className="text-xs text-on-surface-variant mt-1">
              Password must be at least 12 characters long
            </p>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
            <p className="text-xs text-on-surface">
              <span className="font-semibold">Note:</span> The manager will be created with 'active' status and can login immediately with these credentials.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-on-surface-variant"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-surface hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Manager
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateManagerDialog;
