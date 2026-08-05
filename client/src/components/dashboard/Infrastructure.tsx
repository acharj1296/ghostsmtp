import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Server,
  Database,
  Cpu,
  Shield,
  Webhook,
  Globe,
  Activity,
  Zap,
  Mail,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { staggerContainer, staggerItem, revealViewport } from './motion';
import type { ServiceCard, ServiceState } from '../../hooks/useDashboardDerivations';

// ─── Infrastructure (Section 7) ───────────────────────────────────────────────
// Service-health cards for the SMTP platform: shows status, latency, last
// heartbeat. MongoDB + API derive from /health; rest are realistic placeholders.

interface InfrastructureProps {
  services: ServiceCard[];
  loading?: boolean;
}

const ICONS: Record<string, LucideIcon> = {
  smtp: Server,
  postfix: Mail,
  rspamd: Shield,
  redis: Zap,
  mongodb: Database,
  queue: Activity,
  webhook: Webhook,
  api: Globe,
  worker: Cpu,
};

const STATE_META: Record<ServiceState, { dot: string; label: string; text: string }> = {
  operational: {
    dot: 'bg-emerald-500',
    label: 'Operational',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  degraded: {
    dot: 'bg-amber-500',
    label: 'Degraded',
    text: 'text-amber-600 dark:text-amber-400',
  },
  down: {
    dot: 'bg-rose-500',
    label: 'Down',
    text: 'text-rose-600 dark:text-rose-400',
  },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export const Infrastructure = ({ services, loading }: InfrastructureProps) => {
  // Pulse interval for live feeling
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1000), 5000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {services.map((s) => {
        const Icon = ICONS[s.key] || Server;
        const meta = STATE_META[s.state];
        return (
          <motion.div
            key={s.key}
            variants={staggerItem}
            className="relative overflow-hidden rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-800/70 dark:bg-slate-900/60"
          >
            {/* Top row: icon + status pill */}
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${meta.text}`}
              >
                <span className="relative flex h-1.5 w-1.5">
                  {s.state === 'operational' && (
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${meta.dot}`} />
                  )}
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                </span>
                {meta.label}
              </span>
            </div>

            {/* Name */}
            <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{s.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.category}</p>

            {/* Metrics strip */}
            <div className="mt-3 flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400">Latency</span>
                <motion.span
                  key={`${s.key}-${s.latencyMs}-${tick}`}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  className="ml-1.5 font-semibold tabular-nums text-slate-700 dark:text-slate-300"
                >
                  {s.latencyMs}ms
                </motion.span>
              </div>
              <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="text-slate-400">{timeAgo(s.lastHeartbeat)}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default Infrastructure;
