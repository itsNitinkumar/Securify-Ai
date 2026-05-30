import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, Settings, Bell, HelpCircle, FolderOpen, Search, FileText, LogOut } from 'lucide-react';
import Logo from '@/components/common/Logo';
import { useEffect, useState } from 'react';
import { authApi } from '@/api/authApi';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission, hasRole } = useAuth();
  const [profile, setProfile] = useState<{ name?: string; email?: string; avatar?: string } | null>(null);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await authApi.getProfile();
        const userData = (res as any)?.data?.data || (res as any)?.data?.user || (res as any)?.data;
        setProfile(userData);
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };
    loadProfile();
  }, []);

  const isAdminOrManager = hasRole('admin', 'manager') || hasPermission('manage_roles');

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { path: '/projects', label: 'Projects', icon: FolderOpen, show: hasPermission('view_projects') },
    { path: '/templates', label: 'Templates', icon: FileText, show: hasPermission('view_templates') || isAdminOrManager },
    { path: '/search', label: 'Search', icon: Search, show: true },
    { path: '/activity', label: 'Activity Logs', icon: Activity, show: isAdminOrManager },
    { path: '/users', label: 'Users', icon: Users, show: hasPermission('view_users') },
    { path: '/settings', label: 'RBAC Settings', icon: Settings, show: hasPermission('manage_roles') || hasRole('admin') },
  ].filter(item => item.show);

  const handleLogout = async () => {
    try {
      await authApi.signout();
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(';').forEach(c => document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/'));
      toast.success('Logged out successfully');
      navigate('/signin');
    } catch (error) {
      console.error('Logout failed:', error);
      localStorage.clear();
      sessionStorage.clear();
      navigate('/signin');
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen bg-surface flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-low border-r border-outline flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="p-6 border-b border-outline shrink-0">
          <Logo size="lg" />
          <div className="mt-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-xs text-on-surface-variant font-technical">
              SENTINEL_NODE_01
            </span>
          </div>
          <span className="text-xs text-primary">STATUS: SECURE</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  active
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-outline space-y-1 shrink-0">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-high hover:text-on-surface transition-all">
            <HelpCircle className="w-5 h-5" />
            <span className="text-sm">Support</span>
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-error hover:bg-error/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-surface-low border-b border-outline flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-on-surface">
              {navItems.find((item) => isActive(item.path))?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg hover:bg-surface-high transition-colors">
              <Bell className="w-5 h-5 text-on-surface-variant" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
            </button>
            <button className="p-2 rounded-lg hover:bg-surface-high transition-colors">
              <HelpCircle className="w-5 h-5 text-on-surface-variant" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-outline">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{getInitials(profile?.name)}</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
