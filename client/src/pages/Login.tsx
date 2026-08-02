import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { LoginLayout } from '../components/layouts/LoginLayout';
import { Server, Eye, EyeOff, X } from 'lucide-react';

export const Login = () => {
  const { login, loginWithGoogle, user } = useAuth();
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    
    try {
      await login(email, password);
      // Wait for auth context to update user reference
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to sign in. Please check your credentials.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setGoogleLoading(true);
    
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to sign in with Google.');
      setGoogleLoading(false);
    }
  };

  // We handle redirection reactively when authentication context resolves the user
  if (user) {
    if (!user.emailVerified) {
      return <Navigate to="/verify-email" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return (
    <LoginLayout>
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="bg-brand-600 p-3 rounded-2xl text-white shadow-xl shadow-brand-500/20">
          <Server className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">GhostSMTP</h2>
        <p className="text-slate-400 text-sm">SMTP Hosting Platform Dashboard</p>
      </div>

      <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Sign In</CardTitle>
          <CardDescription className="text-slate-500">Access your sending domains and analytics.</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex gap-2 items-start">
              <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || googleLoading}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || googleLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-[34px] text-slate-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || googleLoading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember Me and Forgot Password Container */}
            <div className="flex items-center justify-between text-xs mt-2">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-brand-600 focus:ring-brand-500 h-4 w-4"
                  disabled={loading || googleLoading}
                />
                Remember me
              </label>
              
              <Link to="/forgot-password" className="text-brand-400 hover:underline font-semibold">
                Forgot Password?
              </Link>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full mt-2" 
              isLoading={loading}
              disabled={googleLoading}
            >
              Sign In
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
            onClick={handleGoogleLogin}
            isLoading={googleLoading}
            disabled={loading}
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
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:underline font-semibold">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </LoginLayout>
  );
};

export default Login;
