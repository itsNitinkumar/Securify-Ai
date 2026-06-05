import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import StatusPulse from '../components/common/StatusPulse';
import Logo from '../components/common/Logo';
import { useAuth } from '../contexts/AuthContext';

const SignInPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Context login hits /auth/login, sets the httpOnly cookie, fetches
      // permissions, and updates the AuthContext user — so the sidebar /
      // role-gated nav items render correctly on first navigation.
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface-lowest p-16 flex-col justify-between relative overflow-hidden">
        <Logo size="lg" />

        <div className="space-y-8 relative z-10">
          <StatusPulse status="active" label="PROTOCOL V4.2 ACTIVE" />
          
          <div className="space-y-4">
            <h1 className="text-6xl font-bold leading-tight tracking-tight">
              Establish your<br />
              credentials for<br />
              the<br />
              <span className="text-[#00fc40]">Digital Sentinel</span><br />
              protocol.
            </h1>
            
            <p className="text-[#adaaaa] text-lg max-w-md leading-relaxed">
              Enterprise-grade protection for high-stakes intelligence. Authenticate to access the neural firewall matrix.
            </p>
          </div>

          <div className="flex gap-12 pt-8">
            <div>
              <p className="text-[10px] font-technical uppercase tracking-wider text-[#494847] mb-1">ENCRYPTION</p>
              <p className="text-sm font-medium text-[#ffffff]">AES-256 Quantum</p>
            </div>
            <div>
              <p className="text-[10px] font-technical uppercase tracking-wider text-[#494847] mb-1">STATUS</p>
              <p className="text-sm font-medium text-[#9cff93]">Ready for Handshake</p>
            </div>
          </div>
        </div>

        <StatusPulse status="ready" label="SECURE SENTINEL SESSION ACTIVE" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00fc40] opacity-5 blur-[120px] rounded-full" />
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <Logo size="md" className="lg:hidden mb-8" />

          <div className="space-y-3">
            <h2 className="text-4xl font-bold tracking-tight">Primary Authentication</h2>
            <p className="text-[#adaaaa]">Secure terminal access required to continue session.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-[#ff735120] border border-[#ff7351] rounded-md p-3">
                <p className="text-sm text-[#ff7351]">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-technical uppercase tracking-wider text-[#adaaaa]">
                CORPORATE EMAIL
              </label>
              <Input
                type="email"
                placeholder="name@securify.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-technical uppercase tracking-wider text-[#adaaaa]">
                  PASSWORD
                </label>
                <Link to="/forgot-password" className="text-xs text-[#9cff93] hover:text-[#00fc40] transition-colors">
                  FORGOT PASSWORD?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#adaaaa] hover:text-[#9cff93] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={16} />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="mr-2" size={16} />
                  Establish Connection
                </>
              )}
            </Button>
          </form>

          <Card className="p-4 border-l-2 border-[#00fc40]">
            <div className="flex items-start gap-3">
              <img 
                src="https://securifyai.co/wp-content/uploads/2024/09/securify-logo-light.png" 
                alt="Securify" 
                className="h-4 mt-0.5" 
              />
              <div>
                <p className="text-xs font-technical uppercase tracking-wider text-[#9cff93] mb-1">
                  DATA SANITIZED BEFORE AI PROCESSING
                </p>
                <p className="text-xs text-[#adaaaa]">All authentication logs are scrubbed for PII.</p>
              </div>
            </div>
          </Card>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#49484726]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-4 text-[#494847] font-technical tracking-wider">OR</span>
            </div>
          </div>

          <Button variant="secondary" className="w-full" asChild>
            <a href="http://localhost:3000/api/v1/auth/google">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"/>
                <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"/>
                <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5818182 23.1818182,9.90909091 L12,9.90909091 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"/>
                <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"/>
              </svg>
              Continue with Google
            </a>
          </Button>

          <p className="text-center text-sm text-[#adaaaa]">
            Don't have access credentials?{' '}
            <Link to="/signup" className="text-[#9cff93] hover:text-[#00fc40] transition-colors font-medium">
              Request Authorization
            </Link>
          </p>

          <p className="text-center text-[10px] font-technical uppercase tracking-wider text-[#494847] pt-4">
            SYSTEM ARCHITECTURE OPTIMIZED FOR HIGH AVAILABILITY
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;