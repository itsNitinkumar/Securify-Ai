import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { userApi } from '@/api/userApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

type UserRecord = {
  id: number;
  email: string;
  name: string;
  role: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

const ApproveUserPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const parsedUserId = userId ? Number.parseInt(userId, 10) : NaN;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('client');

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const userRes = await userApi.getById(parsedUserId);
        const loadedUser = (userRes.data as any)?.data || (userRes.data as any)?.user || userRes.data;
        setUser(loadedUser as UserRecord);
      } catch (error) {
        console.error('Failed to load user:', error);
        toast.error('Failed to load user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [parsedUserId]);

  const allRoles = useMemo(
    () => [
      { value: 'client', label: 'Client', description: 'Read-only access to approved findings', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
      { value: 'reporter', label: 'Reporter', description: 'Creates and manages findings', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
      { value: 'manager', label: 'Manager', description: 'Full access to projects and reports', color: 'bg-primary/10 text-primary border-primary/20' },
    ],
    []
  );

  const availableRoles = useMemo(() => {
    return currentUser?.role === 'admin' ? allRoles : allRoles.filter((r) => r.value !== 'manager');
  }, [allRoles, currentUser]);

  const handleApprove = async () => {
    if (!user) return;
    try {
      setSubmitting(true);
      await userApi.approve(user.id, selectedRole);
      toast.success('User approved');
      navigate('/users');
    } catch (error: any) {
      console.error('Failed to approve user:', error);
      toast.error(error?.response?.data?.message || 'Failed to approve user');
    } finally {
      setSubmitting(false);
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
        <div className="flex items-start gap-3">
          <CheckCircle className="h-6 w-6 text-green-400" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-on-surface">Approve User Account</h1>
            <p className="mt-1 text-sm text-on-surface-variant">Assign a role and activate the account.</p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div className="p-4 bg-surface rounded-lg border border-outline-variant">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-on-surface-variant">Name:</span>
                <span className="ml-2 text-sm text-on-surface font-medium">{user.name}</span>
              </div>
              <div>
                <span className="text-xs text-on-surface-variant">Email:</span>
                <span className="ml-2 text-sm text-on-surface">{user.email}</span>
              </div>
              {user.status ? (
                <div>
                  <span className="text-xs text-on-surface-variant">Status:</span>
                  <Badge className="ml-2 bg-yellow-500/10 text-yellow-400 border-yellow-500/20">{user.status}</Badge>
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-on-surface mb-3 block">Assign Role <span className="text-error">*</span></label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableRoles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedRole === role.value ? 'border-primary bg-primary/10' : 'border-outline-variant hover:border-outline'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-on-surface">{role.label}</span>
                    {selectedRole === role.value ? (
                      <Badge className="bg-primary text-surface text-xs">Selected</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-on-surface-variant">{role.description}</p>
                </button>
              ))}
            </div>
            {currentUser?.role === 'manager' ? (
              <p className="mt-2 text-xs text-on-surface-variant">Only admin can assign manager role.</p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/users')}
              className="border-outline text-on-surface-variant"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleApprove()}
              disabled={submitting}
              className="bg-green-500 text-white hover:bg-green-600"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve & Activate'
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ApproveUserPage;
