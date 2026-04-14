import { useState } from 'react';
import { User, Lock, Bell, Globe, Key, Shield, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const ProfileSettingsPage = () => {
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@company.com',
    role: 'analyst',
  });

  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [notifications, setNotifications] = useState({
    emailFindings: true,
    emailReports: true,
    emailActivity: false,
    pushFindings: true,
    pushReports: false,
  });

  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      alert('Profile updated successfully');
    }, 1000);
  };

  const handleChangePassword = async () => {
    if (password.new !== password.confirm) {
      alert('Passwords do not match');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setPassword({ current: '', new: '', confirm: '' });
      alert('Password changed successfully');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
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
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-surface-high p-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6 bg-surface-high border-outline">
              <h3 className="text-lg font-semibold text-on-surface mb-6">Profile Information</h3>
              
              {/* Avatar */}
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
                  <p className="text-xs text-on-surface-variant mt-1">
                    Contact your administrator to change your role
                  </p>
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
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="p-6 bg-surface-high border-outline">
              <h3 className="text-lg font-semibold text-on-surface mb-6">Change Password</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={password.current}
                    onChange={(e) => setPassword({ ...password, current: e.target.value })}
                    className="bg-surface border-outline text-on-surface"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={password.new}
                    onChange={(e) => setPassword({ ...password, new: e.target.value })}
                    className="bg-surface border-outline text-on-surface"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={password.confirm}
                    onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                    className="bg-surface border-outline text-on-surface"
                  />
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={saving || !password.current || !password.new || !password.confirm}
                  className="bg-primary text-surface hover:bg-primary/90"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-surface-high border-outline">
              <h3 className="text-lg font-semibold text-on-surface mb-4">Two-Factor Authentication</h3>
              <p className="text-sm text-on-surface-variant mb-4">
                Add an extra layer of security to your account
              </p>
              <Button variant="outline" className="border-outline text-on-surface-variant">
                <Shield className="w-4 h-4 mr-2" />
                Enable 2FA
              </Button>
            </Card>

            <Card className="p-6 bg-surface-high border-outline">
              <h3 className="text-lg font-semibold text-on-surface mb-4">API Keys</h3>
              <p className="text-sm text-on-surface-variant mb-4">
                Manage API keys for programmatic access
              </p>
              <Button variant="outline" className="border-outline text-on-surface-variant">
                <Key className="w-4 h-4 mr-2" />
                Manage API Keys
              </Button>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6 bg-surface-high border-outline">
              <h3 className="text-lg font-semibold text-on-surface mb-6">Email Notifications</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface">New Findings</p>
                    <p className="text-xs text-on-surface-variant">
                      Get notified when new findings are created
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailFindings}
                    onChange={(e) =>
                      setNotifications({ ...notifications, emailFindings: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-outline bg-surface text-primary focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface">Report Updates</p>
                    <p className="text-xs text-on-surface-variant">
                      Get notified about report generation and updates
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailReports}
                    onChange={(e) =>
                      setNotifications({ ...notifications, emailReports: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-outline bg-surface text-primary focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface">Activity Alerts</p>
                    <p className="text-xs text-on-surface-variant">
                      Get notified about important activity
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailActivity}
                    onChange={(e) =>
                      setNotifications({ ...notifications, emailActivity: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-outline bg-surface text-primary focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-surface-high border-outline">
              <h3 className="text-lg font-semibold text-on-surface mb-6">Push Notifications</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface">Critical Findings</p>
                    <p className="text-xs text-on-surface-variant">
                      Instant alerts for critical severity findings
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.pushFindings}
                    onChange={(e) =>
                      setNotifications({ ...notifications, pushFindings: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-outline bg-surface text-primary focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface">Report Ready</p>
                    <p className="text-xs text-on-surface-variant">
                      Alert when reports are ready for download
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.pushReports}
                    onChange={(e) =>
                      setNotifications({ ...notifications, pushReports: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-outline bg-surface text-primary focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="p-6 bg-surface-high border-outline">
              <h3 className="text-lg font-semibold text-on-surface mb-6">Display Preferences</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">
                    Language
                  </label>
                  <select className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">
                    Timezone
                  </label>
                  <select className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>UTC</option>
                    <option>EST</option>
                    <option>PST</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-on-surface mb-2 block">
                    Date Format
                  </label>
                  <select className="w-full px-3 py-2 bg-surface border border-outline rounded-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-surface-high border-outline">
              <h3 className="text-lg font-semibold text-on-surface mb-4">Session Management</h3>
              <p className="text-sm text-on-surface-variant mb-4">
                Active sessions: 2 devices
              </p>
              <Button variant="outline" className="border-error/30 text-error hover:bg-error/10">
                Sign Out All Devices
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
