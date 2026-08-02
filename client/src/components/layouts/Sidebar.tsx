import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Globe, 
  Key, 
  FileText, 
  FileCode, 
  Webhook, 
  Settings, 
  User,
  Sun,
  Moon,
  LogOut,
  Server,
  Send
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar = ({ onCloseMobile }: SidebarProps) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Email Composer', path: '/send-email', icon: Send },
    { name: 'Domains', path: '/domains', icon: Globe },
    { name: 'SMTP Credentials', path: '/smtp', icon: Key },
    { name: 'API Keys', path: '/api-keys', icon: Key },
    { name: 'Email Logs', path: '/logs', icon: FileText },
    { name: 'Templates', path: '/templates', icon: FileCode },
    { name: 'Webhooks', path: '/webhooks', icon: Webhook },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen fixed left-0 top-0 text-slate-700 dark:text-slate-300 z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <div className="bg-brand-600 p-2 rounded-lg text-white">
          <Server className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">GhostSMTP</h1>
          <span className="text-xs text-brand-500 font-medium">SMTP Hosting</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-l-2 border-brand-500 pl-3' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer (Theme Toggle + LogOut) */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex justify-between items-center px-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Theme</span>
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="p-1 rounded-lg">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </Button>
        </div>
        <Button 
          variant="ghost" 
          onClick={logout} 
          className="w-full flex items-center justify-start gap-3 text-rose-500 dark:text-rose-400 hover:bg-rose-500/5 hover:text-rose-600 px-4 py-3 rounded-lg text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
