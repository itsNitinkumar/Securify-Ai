import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../api/axios';
import { authApi } from '../api/authApi';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  role_id?: number;
  company_id?: number;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicPaths = ['/signin', '/signup', '/auth/callback', '/forgot-password'];

const isPublicPath = (path: string) => publicPaths.some(p => path.startsWith(p));

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const path = window.location.pathname;

    if (isPublicPath(path)) {
      setIsLoading(false);
      return;
    }

    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get('/auth/profile');

        if (response.data) {
          const userData: User = response.data.data || response.data.user;

          // Fetch permissions alongside profile
          try {
            const permResponse = await axios.get('/auth/permissions');
            if (permResponse.data?.data) {
              userData.permissions = permResponse.data.data;
            }
          } catch {
            // Permissions endpoint may not exist yet; fallback gracefully
          }

          setUser(userData);
          setToken('cookie-based');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Re-hydrate permissions when the tab regains focus so role/perm changes
  // elsewhere are picked up without a full page reload.
  useEffect(() => {
    const onFocus = async () => {
      if (!user) return;
      try {
        const permResponse = await axios.get('/auth/permissions');
        if (permResponse.data?.data) {
          setUser((prev) => (prev ? { ...prev, permissions: permResponse.data.data } : prev));
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.id]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.signin({ email, password });
      const payload = (response as any)?.data?.data || (response as any)?.data || {};
      const userData: User = payload.user;

      // Fetch permissions immediately so sidebar / role-gated UI is correct on first render.
      try {
        const permResponse = await axios.get('/auth/permissions');
        if (permResponse.data?.data) {
          userData.permissions = permResponse.data.data;
        }
      } catch (permError) {
        // Permissions endpoint may not exist; user.role still works for role-based checks.
        console.warn('Could not load permissions during login:', permError);
      }

      setToken(payload.token || 'cookie-based');
      setUser(userData);

      if (payload.token) localStorage.setItem('token', payload.token);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission);
  };

  const hasRole = (...roles: string[]): boolean => {
    if (!user?.role) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
