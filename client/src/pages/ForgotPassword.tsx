import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { LoginLayout } from '../components/layouts/LoginLayout';
import { Server, KeyRound, Check, X, ArrowLeft } from 'lucide-react';

export const ForgotPassword = () => {
  const { sendPasswordReset } = useAuth();
  
  // Form states
  const [email, setEmail] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      await sendPasswordReset(email);
      setSuccessMsg('Reset link sent! Please check your email inbox to reset your password.');
      setEmail('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to send password reset email.');
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
        <p className="text-slate-400 text-sm">SMTP Hosting Platform Dashboard</p>
      </div>

      <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto bg-brand-500/10 p-3 rounded-full w-fit mb-4 text-brand-400">
            <KeyRound className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
          <CardDescription className="text-slate-400 mt-2">
            No worries! Enter your email address and we'll send you a password recovery link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex gap-2 items-start">
              <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex gap-2 items-start">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{successMsg}</span>
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
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
              isLoading={loading}
            >
              Send Password Reset Link
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center">
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </LoginLayout>
  );
};

export default ForgotPassword;
