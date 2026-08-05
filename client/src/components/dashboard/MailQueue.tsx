import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Inbox,
  Loader2,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fadeUp, revealViewport } from './motion';
import type { QueueSnapshot } from '../../hooks/useDashboardDerivations';

// ─── MailQueue (Section 6) ────────────────────────────────────────────────────
// Professional queue monitor with live pulse. Six pipeline stages surfaced as
// animated tiles + a proportional throughput bar.

interface MailQueueProps {
  queue: QueueSnapshot;
  loading?: boolean;
}

interface Stage {
  key: keyof QueueSnapshot;
  label: string;
  icon: LucideIcon;
  color: string; // hex
  spin?: boolean;
}

const STAGES: Stage[] = [
  { key: 'queued', label: 'Queued', icon: Inbox, color: '#64748b' },
  { key: 'processing', label: 'Processing', icon: Loader2, color: '#8b5cf6', spin: true },
  { key: 'deferred', label: 'Deferred', icon: Clock, color: '#f59e0b' },
  { key: 'retry', label: 'Retry', icon: RefreshCw, color: '#ec4899' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, color: '#10b981' },
  { key: 'failed', label: 'Failed', icon: XCircle, color: '#ef4444' },
];

export const MailQueue = ({ queue, loading }: MailQueueProps) => {
  // Live tick pulse to convey real-time monitoring
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1000), 3000);
    return () => clearInterval(id);
  }, []);

  const barTotal =
    queue.queued + queue.processing + queue.deferred + queue.retry + queue.completed + queue.failed || 1;

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-900/80"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 dark:text-brand-400">
            <Activity className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Mail Queue</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {queue.inFlight.toLocaleString()} messages in flight
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      {/* Stage tiles */}
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
        {STAGES.map((s) => {
          const Icon = s.icon;
          const value = queue[s.key];
          return (
            <div
              key={s.key}
              className="relative rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 dark:border-slate-800/70 dark:bg-slate-950/30"
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${s.color}1a`, color: s.color }}
                >
                  <Icon className={`h-4 w-4 ${s.spin && value > 0 ? 'animate-spin' : ''}`} />
                </span>
                {value > 0 && (s.key === 'processing' || s.key === 'queued') && (
                  <span className="relative flex h-2 w-2">
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                      style={{ backgroundColor: s.color }}
                    />
                    <span
                      className="relative inline-flex h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                  </span>
                )}
              </div>
              <motion.p
                key={`${s.key}-${value}-${tick}`}
                initial={{ opacity: 0.4, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-2xl font-bold tabular-nums text-slate-900 dark:text-white"
              >
                {loading ? '—' : value.toLocaleString()}
              </motion.p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Throughput bar */}
      <div className="px-5 pb-5">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Throughput distribution</span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {STAGES.map((s) => {
            const pct = (queue[s.key] / barTotal) * 100;
            if (pct <= 0) return null;
            return (
              <motion.div
                key={s.key}
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                style={{ backgroundColor: s.color }}
                title={`${s.label}: ${queue[s.key]}`}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default MailQueue;
