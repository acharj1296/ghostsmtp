import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Server, Shield, Activity, Zap, CheckCircle } from 'lucide-react';

export const Landing = () => {
  const { isAuthenticated } = useAuth();

  // If already authenticated, bypass the landing page and head straight to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-brand-500/30">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-brand-950/20 via-slate-950/0 to-slate-950/0 pointer-events-none z-0" />
      
      {/* Navigation Header */}
      <header className="relative z-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-2 rounded-xl text-white">
              <Server className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              GhostSMTP
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-900/50">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="primary">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-brand-400 font-semibold mb-6">
          <Zap className="w-3.5 h-3.5" />
          Production-Ready SMTP Hosting Platform
        </div>
        
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight mb-6">
          SMTP Infrastructure Built for{' '}
          <span className="bg-gradient-to-r from-brand-400 via-brand-500 to-indigo-400 bg-clip-text text-transparent">
            Modern Developers
          </span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          Send transactional emails with confidence. Validate SPF, DKIM, and DMARC protocols automatically, track analytics, and manage sending limits in real-time.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto px-4">
          <Link to="/register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-11/12 py-3 px-8 text-base shadow-lg shadow-brand-500/20">
              Start Sending Free
            </Button>
          </Link>
          <Link to="/login" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto border-slate-800 hover:bg-slate-900 text-slate-300">
              Access Dashboard
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 w-full border-t border-slate-900 pt-16">
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl text-left backdrop-blur-sm">
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl w-fit mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">DKIM & SPF Records</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Verify and sign outbound deliveries using standard protocols to maximize inbox deliverability.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl text-left backdrop-blur-sm">
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl w-fit mb-4">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Real-Time Logs</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Track delivery statuses, bounces, rejects, and latency profiles instantly via clean logs.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl text-left backdrop-blur-sm">
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl w-fit mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Relay Credentials</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Generate credentials in seconds and hook them up directly to your existing application frameworks.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 bg-slate-950/40">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>© {new Date().getFullYear()} GhostSMTP. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
