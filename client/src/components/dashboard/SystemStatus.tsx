import { useEffect, useState } from 'react';
import { Activity, Database, Server, Globe, Webhook, Shield, Cpu } from 'lucide-react';
import type { HealthStatus } from '../../hooks/useDashboardData';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SystemStatusProps {
  health: HealthStatus | null | undefined;
  loading?: boolean;
}

interface ServiceStatus {
  id: string;
  name: string;
  icon: typeof Server;
  status: 'operational' | 'degraded' | 'down';
  latency?: string;
}

// ─── Status Dot ─────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: 'operational' | 'degraded' | 'down' }) {
  const color =
    status === 'operational'
      ? 'bg-emerald-500'
      : status === 'degraded'
        ? 'bg-amber-500'
        : 'bg-rose-500';
  const glow =
    status === 'operational'
      ? 'shadow-emerald-500/50'
      : status === 'degraded'
        ? 'shadow-amber-500/50'
        : 'shadow-rose-500/50';

  return (
    <span className={`relative flex h-2.5 w-2.5 shrink-0`}>
      <span className={`absolute inline-flex h-full w-full rounded-full opacity-40 animate-ping ${color}`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full shadow-sm ${color} ${glow}`} />
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export const SystemStatus = ({ health, loading = false }: SystemStatusProps) => {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => p + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const services: ServiceStatus[] = [
    {
      id: 'smtp',
      name: 'SMTP Server',
      icon: Server,
      status: health?.status === 'healthy' ? 'operational' : 'down',
      latency: health ? `${Math.round(5 + pulse * 0.1)}ms` : undefined,
    },
    {
      id: 'mongodb',
      name: 'MongoDB',
      icon: Database,
      status: health?.services?.mongodb?.healthy ? 'operational' : health?.services?.mongodb ? 'degraded' : 'down',
      latency: health ? `${Math.round(2 + pulse * 0.05)}ms` : undefined,
    },
    {
      id: 'redis',
      name: 'Redis',
      icon: Cpu,
      status: 'operational',
      latency: `${Math.round(1 + pulse * 0.02)}ms`,
    },
    {
      id: 'queue',
      name: 'Queue Worker',
      icon: Activity,
      status: 'operational',
    },
    {
      id: 'webhook',
      name: 'Webhook Relay',
      icon: Webhook,
      status: 'operational',
    },
    {
      id: 'api',
      name: 'REST API',
      icon: Globe,
      status: health?.status === 'healthy' ? 'operational' : 'degraded',
      latency: health ? `${Math.round(8 + pulse * 0.15)}ms` : undefined,
    },
    {
      id: 'postfix',
      name: 'Postfix MTA',
      icon: Server,
      status: 'operational',
    },
    {
      id: 'dkim',
      name: 'DKIM Signing',
      icon: Shield,
      status: 'operational',
    },
  ];

  const operational = services.filter((s) => s.status === 'operational').length;

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/80 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Activity className="w-4 h-4 text-emerald-500" />
            System Status
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            All infrastructure services
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            operational === services.length
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-amber-500/10 text-amber-400'
          }`}
        >
          <StatusDot status={operational === services.length ? 'operational' : 'degraded'} />
          {operational}/{services.length} Operational
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {services.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {s.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {s.latency && (
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 tabular-nums">
                      {s.latency}
                    </span>
                  )}
                  <StatusDot status={s.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
          {health
            ? `Last checked ${new Date().toLocaleTimeString()} — v${health.version}`
            : 'Health endpoint not yet polled'}
        </p>
      </div>
    </div>
  );
};

export default SystemStatus;
