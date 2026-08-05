import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Send,
  Globe,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  FileText,
  ScrollText,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { staggerContainer, staggerItem, revealViewport } from './motion';

// ─── ActionCenter (Section 3) ─────────────────────────────────────────────────
// Large horizontal command surface. Impossible to miss — this is the answer to
// "what should I do next". All buttons wired to real routes.

interface ActionDef {
  key: string;
  label: string;
  icon: LucideIcon;
  to: string;
  accent: string; // tailwind gradient classes
  primary?: boolean;
}

const ACTIONS: ActionDef[] = [
  { key: 'send', label: 'Send Test Email', icon: Send, to: '/send-email', accent: 'from-brand-500 to-brand-600', primary: true },
  { key: 'domain', label: 'Add Domain', icon: Globe, to: '/domains', accent: 'from-sky-500 to-blue-600' },
  { key: 'smtp', label: 'Generate SMTP Credentials', icon: KeyRound, to: '/smtp', accent: 'from-violet-500 to-purple-600' },
  { key: 'api', label: 'Generate API Key', icon: ShieldCheck, to: '/api-keys', accent: 'from-fuchsia-500 to-pink-600' },
  { key: 'dns', label: 'Verify DNS', icon: CheckCircle2, to: '/domains', accent: 'from-emerald-500 to-green-600' },
  { key: 'logs', label: 'View Logs', icon: ScrollText, to: '/logs', accent: 'from-amber-500 to-orange-600' },
  { key: 'template', label: 'Create Template', icon: FileText, to: '/templates', accent: 'from-cyan-500 to-teal-600' },
];

export const ActionCenter = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50 p-5 dark:border-slate-800/60 dark:from-slate-900/80 dark:to-slate-900/40 sm:p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500 dark:text-brand-400">
          <Zap className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Action Center</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Everything you need, one click away</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <motion.button
              key={a.key}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(a.to)}
              className={`group relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                a.primary
                  ? 'border-brand-500/30 bg-brand-500/[0.06] hover:bg-brand-500/10'
                  : 'border-slate-200/70 bg-white hover:border-slate-300 dark:border-slate-800/70 dark:bg-slate-900/60 dark:hover:border-slate-700'
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${a.accent} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold leading-tight text-slate-800 dark:text-slate-200">
                {a.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ActionCenter;
