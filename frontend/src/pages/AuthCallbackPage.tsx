import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');

    console.log('🔐 Auth Callback - Token:', token ? 'Present' : 'Missing');
    console.log('👤 Auth Callback - User:', userParam ? 'Present' : 'Missing');

    if (token && userParam) {
      try {
        // Store token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('user', userParam);
        
        console.log('✅ Token and user stored in localStorage');

        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          navigate('/', { replace: true });
          // Force reload to ensure axios picks up the new token
          window.location.reload();
        }, 500);
      } catch (error) {
        console.error('❌ Error storing auth data:', error);
        navigate('/signin?error=auth_failed', { replace: true });
      }
    } else {
      console.error('❌ Missing token or user data');
      navigate('/signin?error=missing_credentials', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
        <h2 className="text-xl font-semibold text-on-surface">Completing authentication...</h2>
        <p className="text-sm text-on-surface-variant">Please wait while we log you in.</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
