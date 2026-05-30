import { useState, useEffect } from 'react';
import { User, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RoleRequestButton } from '@/components/profile/RoleRequestButton';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from '@/api/axios';
import { toast } from 'react-hot-toast';

const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: 'client',
  });
  const [saving, setSaving] = useState(false);

  const checkPendingRequest = async () => {
    try {
      const response = await axios.get('/role-requests/my-requests');
      const pending = response.data.data.some((req: any) => req.status === 'pending');
      setHasPendingRequest(pending);
    } catch (error) {
      console.error('Failed to check pending requests');
    }
  };

  useEffect(() => {
    console.log('User from auth:', user);
    if (user) {
      setProfile({
        name: user.name || 'Unknown User',
        email: user.email || 'No email',
        role: user.role || 'client',
      });
      checkPendingRequest();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface p-4 flex items-center justify-center">
        <div className="text-on-surface">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface p-4 flex items-center justify-center">
        <div className="text-on-surface">Please log in to view your profile</div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Profile updated successfully');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-surface-high border border-outline text-on-surface-variant hover:text-on-surface hover:border-primary/30 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
              Profile & Settings
            </h1>
          </div>
        <p className="text-sm md:text-base text-on-surface-variant">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="max-w-4xl">
        <Card className="p-6 bg-surface-high border-outline">
          <h3 className="text-lg font-semibold text-on-surface mb-6">Profile Information</h3>

          <div className="flex items-center gap-6 mb-6 pb-6 border-b border-outline-variant">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">
                {profile.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface mb-1">{profile.name}</p>
              <p className="text-xs text-on-surface-variant mb-2">{profile.email}</p>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                {profile.role.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Full Name
              </label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="bg-surface border-outline text-on-surface"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Email Address
              </label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="bg-surface border-outline text-on-surface"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-on-surface mb-2 block">
                Role
              </label>
              <Input
                value={profile.role}
                disabled
                className="bg-surface-variant border-outline text-on-surface-variant cursor-not-allowed"
              />
              <p className="text-xs text-on-surface-variant mt-1 mb-3">
                {profile.role === 'client'
                  ? 'Request a role change below'
                  : profile.role === 'manager' || profile.role === 'admin' || profile.role === 'reporter'
                    ? 'Contact system administrator to change your role'
                    : 'Contact your manager to change your role'}
              </p>

              <RoleRequestButton
                currentRole={profile.role}
                hasPendingRequest={hasPendingRequest}
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-primary text-surface hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
