import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { X } from 'lucide-react';
import { Button } from '../ui/button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          
          {/* Sidebar container */}
          <div className="relative z-10 w-64 h-full animate-in slide-in-from-left duration-200">
            <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-[-3rem] p-2 bg-slate-900 text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Main content frame */}
      <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
        <TopNav onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
        <main className="flex-grow p-6 sm:p-8 bg-gradient-to-b from-slate-50/50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900/50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
