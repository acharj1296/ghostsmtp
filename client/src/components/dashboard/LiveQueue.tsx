import { useEffect, useRef, useState } from 'react';
import type { EmailLog } from '../../hooks/useDashboardData';
import { Activity, CheckCircle2, Clock, RefreshCw, AlertTriangle, XCircle, Send } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LiveQueueProps {
  logs: EmailLog[];
  loading?: boolean;
}

interface QueueState {
  queued: number;
  sending: number;
  retrying: number;
  failed: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function classifyLogs(logs: EmailLog[]): QueueState {
  return logs.reduce<QueueState>(
    (acc, log) => {
      if (log.status === 'queued') acc.queued++;
      else if (log.status === 'processing' || log.status === 'accepted') acc.sending++;
      else if (log.status === 'deferred' || (log.retryCount > 0 && log.status === 'failed')) acc.retrying++;
      else if (log.status === 'failed') acc.failed++;
      return acc;
    },
    { queued: 0, sending: 0, retrying: 0, failed: 0 },
  );
}

// ─── Animated pulse dot ─────────────────────────────────────────────────────

function PulseDot({ color, ping = true }: { color: string; ping?: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {ping && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
          style={{ backgroundColor: color }}
        />
      )}
      <span
        className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

// ─── Progress bar ───────────────────────────────────────────────────────────

function QueueBar({ label, value, total, color, icon: Icon }: {
  label: string;
  value: number;
  total: number;
  color: string;
  icon: typeof Clock;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
        <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200/60 dark:bg-slate-800/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export const LiveQueue = ({ logs, loading = false }: LiveQueueProps) => {
  const [ticks, setTicks] = useState(0);
  const state = classifyLogs(logs);
  const total = state.queued + state.sending + state.retrying + state.failed;
  const prevRef = useRef(state);

  // Simulated live tick so the queue feels alive even on sparse data.
  useEffect(() => {
    const id = setInterval(() => setTicks((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  // Determine whether any item changed to animate a "pulse"
  const changed =
    JSON.stringify(prevRef.current) !== JSON.stringify(state) || ticks > 0;
  prevRef.current = state;

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/80 backdrop-blur-sm p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Activity className="w-4 h-4 text-brand-500" />
            Live Mail Queue
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time transmission pipeline
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
          <PulseDot color="#10b981" />
          Live
        </span>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
          <div className="h-6 w-28 animate-pulse rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className={`flex items-end gap-2 mb-5 transition-opacity duration-500 ${changed ? '' : 'opacity-70'}`}>
            <span className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums">
              {total.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">in flight</span>
          </div>

          <div className="space-y-4">
            <QueueBar label="Queued" value={state.queued} total={total} color="#8b5cf6" icon={Clock} />
            <QueueBar label="Sending" value={state.sending} total={total} color="#3b82f6" icon={Send} />
            <QueueBar label="Retrying" value={state.retrying} total={total} color="#f59e0b" icon={RefreshCw} />
            <QueueBar label="Failed" value={state.failed} total={total} color="#ef4444" icon={XCircle} />
          </div>

          {/* Mini status summary */}
          <div className="mt-6 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Worker pool healthy
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              {state.retrying > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              {state.retrying > 0 ? `${state.retrying} message(s) waiting on retry backoff` : 'No retries currently active'}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              {state.failed > 0 ? (
                <XCircle className="w-4 h-4 text-rose-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              {state.failed > 0 ? `${state.failed} permanent failure(s)` : 'No delivery failures'}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LiveQueue;
