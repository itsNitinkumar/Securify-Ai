import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * AuthCallbackPage - Handles OAuth redirects
 * 
 * Note: With cookie-based auth, this page is mostly obsolete.
 * Google OAuth now redirects directly to home with cookie already set.
 * This page is kept for backward compatibility.
 */
const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate('/', { replace: true });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [navigate]);

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
