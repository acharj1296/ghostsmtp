import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Button } from './button';

export interface NotificationProps {
  show: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info';
}

export const Notification = ({ show, onClose, title, message, type = 'info' }: NotificationProps) => {
  if (!show) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-brand-500" />,
  };

  const borders = {
    success: 'border-emerald-500/20 dark:border-emerald-500/10',
    warning: 'border-amber-500/20 dark:border-amber-500/10',
    error: 'border-rose-500/20 dark:border-rose-500/10',
    info: 'border-brand-500/20 dark:border-brand-500/10',
  };

  return (
    <div className={`fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white dark:bg-slate-900 border ${borders[type]} rounded-xl shadow-2xl p-4 flex gap-3 items-start animate-in slide-in-from-bottom-5 fade-in duration-200`}>
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 space-y-0.5">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">{message}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onClose} className="p-1 rounded-lg flex-shrink-0 -mt-1 -mr-1">
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default Notification;
