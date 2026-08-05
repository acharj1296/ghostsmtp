import { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Bell,
  RefreshCw,
  Plus,
  ChevronDown,
  User,
  Menu,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from '../ui/button';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TopNavProps {
  onOpenMobileSidebar: () => void;
}

export const TopNav = ({ onOpenMobileSidebar }: TopNavProps) => {
  const { activeWorkspace, workspaces, setActiveWorkspace } = useWorkspace();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock notifications (replace with real API later)
  const [notifications] = useState<
    { id: string; type: 'success' | 'warning' | 'error' | 'info'; title: string; message: string; time: string; read: boolean }[]
  >([
    { id: '1', type: 'success', title: 'Domain verified', message: 'example.com is now verified and ready to send', time: '2h ago', read: false },
    { id: '2', type: 'warning', title: 'Bounce rate spike', message: 'Bounce rate increased to 4.2% on staging domain', time: '5h ago', read: false },
    { id: '3', type: 'info', title: 'New release', message: 'GhostSMTP v2.4.0 deployed with MTA-STS support', time: '1d ago', read: true },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Could navigate to logs with search query
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      {/* Left section - Mobile toggle + Workspace + Search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile sidebar toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenMobileSidebar}
          className="md:hidden p-1.5 rounded-lg -ml-1"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Workspace selector */}
        <div className="relative flex items-center gap-2 hidden sm:block">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 h-9 px-3"
          >
            <span className="font-semibold text-sm truncate max-w-[140px]">
              {activeWorkspace?.name || 'Select Workspace'}
            </span>
            {activeWorkspace && (
              <span className="text-[10px] uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-bold">
                {activeWorkspace.plan}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </Button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-20 animate-in fade-in slide-in-from-top-1 duration-100">
                <div className="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Workspace
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors ${
                      activeWorkspace?.id === ws.id
                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                        : ''
                    }`}
                  >
                    <span className="font-medium truncate">{ws.name}</span>
                    <span className="text-[10px] uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-bold">
                      {ws.plan}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Quick Search */}
        <div className="relative flex-1 sm:flex-none w-full sm:w-72">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-full justify-start h-9 px-3 rounded-xl text-left gap-2 bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500 dark:text-slate-400">Search workspace...</span>
          </Button>

          {searchOpen && (
            <form onSubmit={handleSearch} className="absolute top-full left-0 right-0 mt-1 z-20">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 animate-in slide-in-from-top-1 duration-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type to search domains, logs, credentials..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <Button size="sm" variant="primary" type="submit" className="flex-1">
                    Search
                  </Button>
                  <Button size="sm" variant="ghost" type="button" onClick={() => setSearchOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Right section - Notifications, Refresh, Quick Create, User */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-1.5 rounded-xl h-9 w-9 transition-colors"
          >
            <Bell className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {notificationsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotificationsOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 animate-in fade-in slide-in-from-top-1 duration-100 max-h-[400px] flex flex-col">
                <div className="p-3 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <button className="text-xs text-brand-500 hover:underline">Mark all read</button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">No notifications</div>
                  ) : (
                    <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          className={`w-full p-3 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${
                            !n.read ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`flex-shrink-0 mt-0.5 w-2 h-2 rounded-full ${
                                n.type === 'success'
                                  ? 'bg-emerald-500'
                                  : n.type === 'warning'
                                    ? 'bg-amber-500'
                                    : n.type === 'error'
                                      ? 'bg-rose-500'
                                      : 'bg-brand-500'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${!n.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{n.message}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/60">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View all notifications
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="p-1.5 rounded-xl h-9 w-9 transition-colors"
          title="Refresh all data"
        >
          <RefreshCw className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300" />
        </Button>

        {/* Quick Create */}
        <div className="hidden sm:block">
          <Button
            variant="primary"
            size="sm"
            className="h-9 px-4 gap-2 font-medium shadow-md shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl h-9 transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
          >
            <div className="w-8 h-8 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 font-bold text-sm flex items-center justify-center">
              {user?.displayName.split(' ').map((n) => n[0]).join('') || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">{user?.displayName}</p>
              <p className="text-[10px] text-slate-500">{user?.email}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-20 animate-in fade-in slide-in-from-top-1 duration-100">
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors">
                  <User className="w-4 h-4 text-slate-400" />
                  Profile
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors">
                  <Settings className="w-4 h-4 text-slate-400" />
                  Settings
                </button>
                <hr className="my-1 border-slate-200/60 dark:border-slate-800/60" />
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-500/5 hover:text-rose-600 text-left transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;