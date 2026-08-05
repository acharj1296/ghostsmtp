import { useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingDown,
  TrendingUp,
  Globe,
  ShieldCheck,
} from 'lucide-react';
import type { DashboardStats, Domain, SmtpCredential, EmailLog } from '../../hooks/useDashboardData';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AiInsightsProps {
  stats: DashboardStats | undefined;
  domains: Domain[];
  credentials: SmtpCredential[];
  logs: EmailLog[];
  loading?: boolean;
}

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'trend';
  message: string;
  icon: typeof CheckCircle2;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const AiInsights = ({ stats, domains, credentials, logs, loading = false }: AiInsightsProps) => {
  const insights = useMemo<Insight[]>(() => {
    const items: Insight[] = [];

    // Bounce rate insight
    if (stats && (stats.sent + stats.delivered + stats.bounced) > 0) {
      const bounceRate = (stats.bounced / Math.max(stats.sent + stats.delivered + stats.bounced, 1)) * 100;
      if (bounceRate > 5) {
        items.push({
          id: 'bounce-high',
          type: 'warning',
          message: `Bounce rate elevated at ${bounceRate.toFixed(1)}%. Review invalid recipients and remove stale addresses.`,
          icon: AlertTriangle,
        });
      } else if (bounceRate > 0) {
        items.push({
          id: 'bounce-ok',
          type: 'success',
          message: `Bounce rate healthy at ${bounceRate.toFixed(1)}%. Delivery reputation on track.`,
          icon: CheckCircle2,
        });
      }
    }

    // Queue health
    if (stats) {
      if (stats.queued > 0) {
        items.push({
          id: 'queue',
          type: 'info',
          message: `Queue running smoothly — ${stats.queued} message(s) currently in the pipeline.`,
          icon: Info,
        });
      } else {
        items.push({
          id: 'queue-idle',
          type: 'success',
          message: 'Mail queue empty. All outgoing transmissions have been processed.',
          icon: CheckCircle2,
        });
      }
    }

    // Domain insights
    const verified = domains.filter((d) => d.status === 'verified').length;
    const total = domains.length;
    if (total === 0) {
      items.push({
        id: 'no-domains',
        type: 'warning',
        message: 'No sending domains configured. Add and verify a domain to start sending.',
        icon: Globe,
      });
    } else if (verified < total) {
      items.push({
        id: 'domain-pending',
        type: 'warning',
        message: `${total - verified} domain(s) awaiting DNS verification. Publish the required records to unlock sending.`,
        icon: AlertTriangle,
      });
    } else if (verified > 0) {
      items.push({
        id: 'domain-all',
        type: 'success',
        message: `All ${verified} domain(s) verified and signing DKIM. Authentication stack complete.`,
        icon: ShieldCheck,
      });
    }

    // Latency insight
    const withLatency = logs.filter((l) => l.processingTimeMs && l.processingTimeMs > 0);
    if (withLatency.length > 5) {
      const avg = withLatency.reduce((a, l) => a + (l.processingTimeMs || 0), 0) / withLatency.length;
      const recent = withLatency.slice(0, 10);
      const recentAvg = recent.reduce((a, l) => a + (l.processingTimeMs || 0), 0) / recent.length;

      if (recentAvg < avg) {
        items.push({
          id: 'latency-improving',
          type: 'trend',
          message: `SMTP latency improving — recent avg ${Math.round(recentAvg)}ms vs historical ${Math.round(avg)}ms.`,
          icon: TrendingDown,
        });
      } else if (recentAvg > avg * 1.5) {
        items.push({
          id: 'latency-spike',
          type: 'warning',
          message: `Latency trending upward — recent avg ${Math.round(recentAvg)}ms vs historical ${Math.round(avg)}ms.`,
          icon: TrendingUp,
        });
      }
    }

    // Credential health
    if (credentials.length === 0) {
      items.push({
        id: 'no-creds',
        type: 'info',
        message: 'No SMTP credentials created yet. Generate your first relay key to begin sending.',
        icon: Info,
      });
    }

    // Complaint rate
    const complaints = logs.filter((l) => l.status === 'complained').length;
    if (complaints > 0) {
      items.push({
        id: 'complaints',
        type: 'warning',
        message: `${complaints} spam complaint(s) received. Review list hygiene and sending practices.`,
        icon: AlertTriangle,
      });
    } else if (stats && (stats.sent + stats.delivered) > 10) {
      items.push({
        id: 'no-complaints',
        type: 'success',
        message: 'Zero spam complaints — sender reputation is excellent.',
        icon: CheckCircle2,
      });
    }

    return items.slice(0, 6);
  }, [stats, domains, credentials, logs]);

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/80 backdrop-blur-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Insights
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-400 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            No insights yet
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Send some emails and we'll surface actionable insights.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {insights.map((item) => {
            const Icon = item.icon;
            const color =
              item.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/15'
                : item.type === 'warning'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/15'
                  : item.type === 'trend'
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/15'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-brand-400 border-brand-500/15';

            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${color}`}
              >
                <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                  {item.message}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AiInsights;
