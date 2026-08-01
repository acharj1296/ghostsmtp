import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Globe, 
  Key, 
  Send, 
  Webhook, 
  FileCode, 
  BarChart3, 
  FileText, 
  ShieldAlert,
  Server,
  Database,
  Cpu,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Common Navigation Bar Component
const Navigation = () => {
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Domains', path: '/domains', icon: Globe },
    { name: 'API Keys & SMTP', path: '/credentials', icon: Key },
    { name: 'Send Email', path: '/send', icon: Send },
    { name: 'Templates', path: '/templates', icon: FileCode },
    { name: 'Webhooks', path: '/webhooks', icon: Webhook },
    { name: 'Logs', path: '/logs', icon: FileText },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Admin Control', path: '/admin', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 text-slate-300">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-brand-600 p-2 rounded-lg text-white shadow-lg shadow-brand-500/25">
          <Server className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-white text-lg tracking-tight">GhostSMTP</h1>
          <span className="text-xs text-brand-400 font-medium">SMTP Platform</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-brand-600/10 text-brand-400 border-l-2 border-brand-500 pl-3' 
                  : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        <p>GhostSMTP v1.0.0</p>
        <p>Phase 1 Foundation Setup</p>
      </div>
    </aside>
  );
};

// Main Dashboard Page
const Dashboard = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/v1/health');
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Platform Health & Status</h2>
        <p className="text-slate-400 text-sm">Real-time status of backend services and system logs.</p>
      </div>

      {/* Health Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200">API Gateway</h3>
            <button 
              onClick={fetchHealth} 
              className="text-slate-400 hover:text-white transition-colors"
              title="Refresh Health"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {loading ? (
            <div className="text-slate-400 text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
              Checking...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-rose-400 font-medium text-sm">
              <AlertCircle className="w-5 h-5" />
              Connection Failed
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                <CheckCircle className="w-5 h-5" />
                Online & Healthy
              </div>
              <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-800">
                <p>Uptime: {Math.round(healthData.uptime)}s</p>
                <p>Environment: {healthData.env}</p>
                <p>Version: {healthData.version}</p>
              </div>
            </div>
          )}
        </div>

        {/* Database & Cache Info Placeholders */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200">PostgreSQL</h3>
            <Database className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
            <Cpu className="w-5 h-5" />
            Phase 2 integration pending
          </div>
          <p className="text-xs text-slate-500 mt-2 border-t border-slate-800 pt-2">
            Schema migration and setup will execute in the next phase.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200">Redis & BullMQ</h3>
            <Database className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
            <Cpu className="w-5 h-5" />
            Phase 5 queue integration pending
          </div>
          <p className="text-xs text-slate-500 mt-2 border-t border-slate-800 pt-2">
            Redis server instance is online in Docker. Queues configure in Phase 5.
          </p>
        </div>
      </div>

      {/* Overview stats preview card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Phase 1 Accomplished</h3>
        <p className="text-slate-400 text-sm mb-4">
          All workspace structures, dependencies, base environments, and basic configurations are set up.
        </p>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-300 font-medium">React SPA Frontend Server</span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">Running (Port 3000)</span>
          </div>
          <div className="flex justify-between items-center text-sm p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-300 font-medium">Express TypeScript API Backend</span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">Running (Port 4000)</span>
          </div>
          <div className="flex justify-between items-center text-sm p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-300 font-medium">Docker Services (PostgreSQL, Redis)</span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">Ready for orchestration</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Generic Under Construction Page Placeholder
const PlaceholderPage = ({ title }: { title: string }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-lg mx-auto">
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-6 text-brand-500">
        <Cpu className="w-12 h-12 animate-pulse" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-slate-400 text-sm mb-6">
        This component is part of the GhostSMTP platform roadmap and will be implemented step-by-step in the upcoming phases.
      </p>
      <div className="inline-flex gap-2">
        <Link 
          to="/" 
          className="bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

// Main Routing App Shell
const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        <Navigation />
        <main className="ml-64 flex-1 p-8 min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/domains" element={<PlaceholderPage title="Domains Setup & DNS Config" />} />
            <Route path="/credentials" element={<PlaceholderPage title="API Keys & SMTP Credentials" />} />
            <Route path="/send" element={<PlaceholderPage title="Email Dispatch Gateway" />} />
            <Route path="/templates" element={<PlaceholderPage title="Handlebars Email Templates" />} />
            <Route path="/webhooks" element={<PlaceholderPage title="Webhook Management & Retries" />} />
            <Route path="/logs" element={<PlaceholderPage title="Delivery Logs & Header Inspector" />} />
            <Route path="/analytics" element={<PlaceholderPage title="Analytics & Aggregated Reports" />} />
            <Route path="/admin" element={<PlaceholderPage title="Admin Panel & System Health" />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
