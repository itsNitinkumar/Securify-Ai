import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Shield, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { userApi } from '@/api/userApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const CreateManagerPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 12) {
      toast.error('Password must be at least 12 characters long');
      return;
    }

    try {
      setLoading(true);
      await userApi.createManager(formData);
      toast.success('Manager created');
      navigate('/users');
    } catch (error: any) {
      console.error('Failed to create manager:', error);
      toast.error(error?.response?.data?.message || 'Failed to create manager');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/users')}
        className="mb-4 text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Users
      </Button>

      <div className="mb-6 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Create Manager</h1>
          <p className="text-sm text-on-surface-variant">Create a new manager account with full credentials.</p>
        </div>
      </div>

      <Card className="max-w-2xl p-6 bg-surface-high border-outline">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              minLength={12}
              className="bg-surface border-outline text-on-surface"
            />
            <p className="mt-1 text-xs text-on-surface-variant">Password must be at least 12 characters long.</p>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
            <p className="text-xs text-on-surface">
              <span className="font-semibold">Note:</span> The manager will be created with active status and can login immediately.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/users')}
              className="border-outline text-on-surface-variant"
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Manager
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateManagerPage;
