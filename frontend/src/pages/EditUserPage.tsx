import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { userApi } from '@/api/userApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type UserRecord = {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at?: string;
  updated_at?: string;
};

const EditUserPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const parsedUserId = userId ? Number.parseInt(userId, 10) : NaN;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [formData, setFormData] = useState({ name: '', role: 'client' });

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const res = await userApi.getById(parsedUserId);
        const loaded = (res.data as any)?.data || (res.data as any)?.user || res.data;
        const record = loaded as UserRecord;
        setUser(record);
        setFormData({ name: record.name, role: record.role || 'client' });
      } catch (error) {
        console.error('Failed to load user:', error);
        toast.error('Failed to load user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [parsedUserId]);

  const roles = useMemo(
    () => [
      { value: 'reporter', label: 'Reporter', description: 'Creates and manages findings' },
      { value: 'manager', label: 'Manager', description: 'Full access to all features' },
      { value: 'client', label: 'Client', description: 'Read-only access to approved findings' },
    ],
    []
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSaving(true);
      await userApi.update(user.id, { name: formData.name, role: formData.role });
      toast.success('User updated');
      navigate('/users');
    } catch (error: any) {
      console.error('Failed to update user:', error);
      toast.error(error?.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || Number.isNaN(parsedUserId)) {
    return (
      <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
        <Button variant="ghost" onClick={() => navigate('/users')} className="mb-4 text-on-surface-variant hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
        <Card className="p-8 bg-surface-high border-outline">
          <h1 className="text-xl font-semibold text-on-surface">User not found</h1>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      <Button variant="ghost" onClick={() => navigate('/users')} className="mb-4 text-on-surface-variant hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Users
      </Button>

      <Card className="max-w-3xl p-6 bg-surface-high border-outline">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Edit User</h1>
            <p className="mt-1 text-sm text-on-surface-variant">Update user information and role assignments.</p>
          </div>
          <Badge variant="outline" className="border-outline text-on-surface-variant">ID: {user.id}</Badge>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">Email</label>
            <Input disabled value={user.email} className="bg-surface-variant border-outline text-on-surface-variant cursor-not-allowed" />
            <p className="mt-1 text-xs text-on-surface-variant">Email cannot be changed.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-on-surface mb-2 block">
              Full Name <span className="text-error">*</span>
            </label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-surface border-outline text-on-surface"
              placeholder="e.g., Jane Doe"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-on-surface mb-3 block">
              Role <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: role.value })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.role === role.value ? 'border-primary bg-primary/10' : 'border-outline-variant hover:border-outline'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-on-surface">{role.label}</span>
                    {formData.role === role.value ? (
                      <Badge className="bg-primary text-surface text-xs">Current</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-on-surface-variant">{role.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/users')} className="border-outline text-on-surface-variant" disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-primary text-surface hover:bg-primary/90">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditUserPage;
