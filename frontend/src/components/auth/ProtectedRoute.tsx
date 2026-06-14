import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authApi } from '@/api/authApi';
import axios from '@/api/axios';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { hydrateSession } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('🔐 ProtectedRoute: Checking authentication...');
    
    try {
      // Try to get profile - this will work if cookie is valid
      console.log('📡 ProtectedRoute: Calling /api/v1/auth/profile');
      const response = await authApi.getProfile();
      
      console.log('✅ ProtectedRoute: Profile response:', response.data);
      
      const userData = response.data.data as any;
      if (userData) {
        let permissions: string[] | undefined;
        try {
          const permResponse = await axios.get('/auth/permissions');
          permissions = permResponse.data?.data || [];
        } catch {
          // ignore permission failures here; profile auth is enough to proceed
        }

        hydrateSession(userData, permissions);

        console.log('✅ ProtectedRoute: User authenticated:', {
          email: userData.email,
          role: userData.role
        });
        setIsAuthenticated(true);
      } else {
        console.warn('⚠️ ProtectedRoute: No user data in response');
        setIsAuthenticated(false);
      }
    } catch (error: any) {
      console.error('❌ ProtectedRoute: Auth check failed:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        error
      });
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-on-surface-variant">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
