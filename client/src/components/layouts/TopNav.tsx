import { useState } from 'react';
import { Menu, ChevronDown, Check } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';

interface TopNavProps {
  onOpenMobileSidebar: () => void;
}

export const TopNav = ({ onOpenMobileSidebar }: TopNavProps) => {
  const { activeWorkspace, workspaces, setActiveWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-20 text-slate-700 dark:text-slate-300">
      {/* Sidebar Mobile Toggle */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onOpenMobileSidebar} 
        className="md:hidden p-1.5 rounded-lg -ml-2"
      >
        <Menu className="w-6 h-6" />
      </Button>

      {/* Tenant Workspace Selector */}
      <div className="relative">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2"
        >
          <span className="font-semibold">{activeWorkspace?.name || 'Select Workspace'}</span>
          <span className="text-xs uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-bold">
            {activeWorkspace?.plan}
          </span>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </Button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-20 animate-in fade-in slide-in-from-top-1 duration-100">
              <span className="block px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Switch Workspace
              </span>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspace(ws);
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-200">{ws.name}</span>
                  {activeWorkspace?.id === ws.id && (
                    <Check className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* User profile entry metadata */}
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">{user.displayName}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 font-bold text-sm flex items-center justify-center">
            {user.displayName.split(' ').map(n => n[0]).join('')}
          </div>
        </div>
      )}
    </header>
  );
};

export default TopNav;
