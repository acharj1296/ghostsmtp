import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoginLayout } from '../components/layouts/LoginLayout';
import { auth } from '../api/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { Server, Mail, Check, X, ArrowRight } from 'lucide-react';

export const VerifyEmail = () => {
  const { user, logout } = useAuth();
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleCheckVerification = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const isMock = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'mock-api-key';

    try {
      if (isMock) {
        // In mock mode, we simulate verifying the email successfully.
        setSuccessMsg('Email verified successfully! Redirecting...');
        setTimeout(() => {
          // Simply refresh or reload session to simulate verification complete
          localStorage.setItem('token', 'mock-developer-token');
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.reload();
          if (currentUser.emailVerified) {
            setSuccessMsg('Email verified successfully! Redirecting...');
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 1500);
          } else {
            setErrorMsg('Your email is not verified yet. Please check your inbox.');
          }
        } else {
          setErrorMsg('No user session active. Please sign in.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to check verification status.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setResending(true);

    const isMock = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'mock-api-key';

    try {
      if (isMock) {
        setSuccessMsg('Verification email sent! (UI Mock)');
      } else {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await sendEmailVerification(currentUser);
          setSuccessMsg('Verification email sent! Please check your inbox.');
        } else {
          setErrorMsg('No user session active. Please sign in.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
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
            <Mail className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription className="text-slate-400 mt-2">
            We sent a verification link to <span className="text-white font-medium">{user?.email || 'your email'}</span>. 
            Verify your email before logging in.
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

          <Button
            onClick={handleCheckVerification}
            variant="primary"
            className="w-full flex items-center justify-center gap-2"
            isLoading={loading}
            disabled={resending}
          >
            I've Verified My Email
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Button
            onClick={handleResendEmail}
            variant="outline"
            className="w-full border-slate-800 hover:bg-slate-800/50 text-slate-300"
            isLoading={resending}
            disabled={loading}
          >
            Resend Verification Email
          </Button>

          <div className="pt-4 border-t border-slate-800 text-center">
            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Sign out and back to Sign In
            </button>
          </div>
        </CardContent>
      </Card>
    </LoginLayout>
  );
};

export default VerifyEmail;
