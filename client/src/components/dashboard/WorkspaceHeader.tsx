import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Server, MapPin, Activity, Send, Sparkles, ChevronRight } from 'lucide-react';
import { fadeUp } from './motion';

// ─── WorkspaceHeader (Section 1) ──────────────────────────────────────────────
// In-page hero band summarizing the workspace at a glance: plan, SMTP cluster,
// region, and overall platform health, with the primary send CTA. Distinct from
// the global TopNav (which handles nav/search/profile).

export type OverallHealth = 'healthy' | 'degraded' | 'down';

interface WorkspaceHeaderProps {
  workspaceName: string;
  plan: string;
  /** SMTP cluster + region are presentational (not exposed by the backend yet). */
  cluster?: string;
  region?: string;
  health: OverallHealth;
  healthLabel: string;
}

const HEALTH_STYLES: Record<OverallHealth, { dot: string; text: string; ring: string }> = {
  healthy: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'bg-emerald-500/10 border-emerald-500/20',
  },
  degraded: {
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'bg-amber-500/10 border-amber-500/20',
  },
  down: {
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    ring: 'bg-rose-500/10 border-rose-500/20',
  },
};

export const WorkspaceHeader = ({
  workspaceName,
  plan,
  cluster = 'ghost-smtp-us-1',
  region = 'US East (N. Virginia)',
  health,
  healthLabel,
}: WorkspaceHeaderProps) => {
  const navigate = useNavigate();
  const hs = HEALTH_STYLES[health];

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-6 dark:border-slate-800/60 dark:bg-slate-900/80 sm:p-7"
    >
      {/* Decorative gradient wash */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-brand-500/20 to-brand-600/5 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: identity */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
            <Sparkles className="h-3.5 w-3.5" />
            Workspace overview
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {workspaceName}
            </h1>
            <span className="rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              {plan}
            </span>
          </div>

          {/* Meta strip */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Server className="h-4 w-4 text-slate-400" />
              <span className="font-medium text-slate-700 dark:text-slate-300">{cluster}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" />
              {region}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${hs.ring} ${hs.text}`}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${hs.dot}`}
                />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${hs.dot}`} />
              </span>
              {healthLabel}
            </span>
          </div>
        </div>

        {/* Right: primary CTA */}
        <div className="flex flex-shrink-0 items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/send-email')}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-colors hover:bg-brand-700"
          >
            <Send className="h-4 w-4" />
            Send Test Email
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/logs')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Activity className="h-4 w-4" />
            View Logs
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default WorkspaceHeader;
