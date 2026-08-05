import { useNavigate } from 'react-router-dom';
import { Send, Globe, KeyRound, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

// ─── Action cards ───────────────────────────────────────────────────────────

interface ActionCard {
  id: string;
  label: string;
  description: string;
  icon: typeof Send;
  color: string;
  gradient: string;
  to: string;
}

const ACTIONS: ActionCard[] = [
  {
    id: 'send',
    label: 'Send Test Email',
    description: 'Compose & fire a test email',
    icon: Send,
    color: 'text-brand-400',
    gradient: 'from-brand-500/20 to-brand-600/5',
    to: '/send-email',
  },
  {
    id: 'domain',
    label: 'Add Domain',
    description: 'Verify a new sending domain',
    icon: Globe,
    color: 'text-cyan-400',
    gradient: 'from-cyan-500/20 to-cyan-600/5',
    to: '/domains',
  },
  {
    id: 'smtp',
    label: 'Generate SMTP',
    description: 'Create SMTP relay credentials',
    icon: KeyRound,
    color: 'text-emerald-400',
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    to: '/smtp',
  },
  {
    id: 'apikey',
    label: 'Create API Key',
    description: 'Issue a programmatic token',
    icon: ShieldCheck,
    color: 'text-amber-400',
    gradient: 'from-amber-500/20 to-amber-600/5',
    to: '/api-keys',
  },
  {
    id: 'logs',
    label: 'Open Logs',
    description: 'Browse delivery audit trail',
    icon: FileText,
    color: 'text-violet-400',
    gradient: 'from-violet-500/20 to-violet-600/5',
    to: '/logs',
  },
  {
    id: 'dns',
    label: 'Verify DNS',
    description: 'Check domain health status',
    icon: CheckCircle2,
    color: 'text-rose-400',
    gradient: 'from-rose-500/20 to-rose-600/5',
    to: '/domains',
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/80 backdrop-blur-sm p-6">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
        Quick Actions
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => navigate(a.to)}
              className={`group flex flex-col items-center text-center gap-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br ${a.gradient} p-4 transition-all duration-200 hover:border-slate-300/80 dark:hover:border-slate-700/80 hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 dark:bg-slate-900/80 shadow-sm transition-transform duration-200 group-hover:scale-110`}>
                <Icon className={`w-5 h-5 ${a.color}`} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{a.label}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{a.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
