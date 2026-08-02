import { useState, useMemo } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { LoginLayout } from '../components/layouts/LoginLayout';
import { Server, Eye, EyeOff, Check, X } from 'lucide-react';

export const Register = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle, user } = useAuth();

  // Redirect directly if already logged in
  if (user) {
    if (user.emailVerified) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/verify-email" replace />;
    }
  }
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password strength requirements validation
  const requirements = useMemo(() => {
    return [
      { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
      { id: 'upper', label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
      { id: 'lower', label: 'At least one lowercase letter', met: /[a-z]/.test(password) },
      { id: 'number', label: 'At least one number', met: /[0-9]/.test(password) },
      { id: 'special', label: 'At least one special character', met: /[^A-Za-z0-9]/.test(password) },
    ];
  }, [password]);

  // Compute strength score (0 to 5)
  const strengthScore = useMemo(() => {
    if (!password) return 0;
    return requirements.filter(req => req.met).length;
  }, [password, requirements]);

  // Strength label & color
  const strengthDetails = useMemo(() => {
    switch (strengthScore) {
      case 0:
        return { label: 'Empty', color: 'bg-slate-700', text: 'text-slate-400' };
      case 1:
      case 2:
        return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400' };
      case 3:
      case 4:
        return { label: 'Medium', color: 'bg-amber-500', text: 'text-amber-400' };
      case 5:
        return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400' };
      default:
        return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400' };
    }
  }, [strengthScore]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Pre-checks
    if (strengthScore < 4) {
      setErrorMsg('Please choose a stronger password.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('You must agree to the Terms & Conditions.');
      return;
    }

    setLoading(true);
    
    try {
      await register(email, password, name);
      setSuccessMsg('Account created successfully! Redirecting to email verification...');
      
      // Clear fields on success
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setAgreeTerms(false);
      
      setTimeout(() => {
        navigate('/verify-email');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await loginWithGoogle();
      setSuccessMsg('Signed in with Google successfully! Redirecting...');
    } catch (err: any) {
      console.error(err);
      
      // Firebase auth error code mappings
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('The sign-in popup was closed before completing. Please try again.');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMsg('Network connectivity issue detected. Please check your internet connection.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setErrorMsg('An account already exists with the same email using a different login method.');
      } else {
        setErrorMsg(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginLayout>
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="bg-brand-600 p-3 rounded-2xl text-white shadow-xl shadow-brand-500/20">
          <Server className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">GhostSMTP</h2>
        <p className="text-slate-400 text-sm">Create your SMTP Hosting account</p>
      </div>

      <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Get Started</CardTitle>
          <CardDescription className="text-slate-500">Create an account to manage your delivery domains.</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex gap-2 items-start">
              <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex gap-2 items-start">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            
            <Input
              label="Email Address"
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-[34px] text-slate-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-2 mt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Password Strength</span>
                  <span className={`font-semibold ${strengthDetails.text}`}>
                    {strengthDetails.label}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-full flex-1 transition-all duration-300 ${
                        i < strengthScore ? strengthDetails.color : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                {strengthScore < 5 && (
                  <ul className="text-[11px] text-slate-500 space-y-0.5">
                    {requirements.map((req) => (
                      <li key={req.id} className="flex items-center gap-1.5">
                        <span className={req.met ? 'text-emerald-500' : 'text-slate-600'}>
                          ✓
                        </span>
                        <span className={req.met ? 'text-slate-400' : 'text-slate-500'}>
                          {req.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="relative">
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-[34px] text-slate-400 hover:text-white"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input
                id="agreeTerms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-brand-600 focus:ring-brand-500 h-4 w-4"
              />
              <label htmlFor="agreeTerms" className="text-xs text-slate-400 cursor-pointer select-none">
                I agree to the{' '}
                <a href="#" className="text-brand-400 hover:underline">
                  Terms & Conditions
                </a>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={loading}
            >
              Create Account
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900/60 px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-800 hover:bg-slate-800/50 text-slate-300 flex items-center justify-center gap-2"
            onClick={handleGoogleSignup}
            isLoading={loading}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Google
          </Button>

          <p className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </LoginLayout>
  );
};

export default Register;
