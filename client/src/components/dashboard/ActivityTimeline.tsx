import { useState } from 'react';
import { History, Send, CheckCircle2, AlertTriangle, MailX, ShieldAlert, Globe, KeyRound, Webhook, Zap, Ban } from 'lucide-react';
import type { ActivityItem } from '../../hooks/useDashboardData';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActivityTimelineProps {
  items: ActivityItem[];
  loading?: boolean;
}

const ICONS: Record<ActivityItem['type'], { icon: typeof Send; color: string; bg: string }> = {
  email_sent: { icon: Send, color: 'text-brand-400', bg: 'bg-brand-500/15' },
  email_delivered: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  email_bounced: { icon: MailX, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  email_complaint: { icon: Ban, color: 'text-rose-400', bg: 'bg-rose-500/15' },
  email_failed: { icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-500/15' },
  domain_verified: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  domain_pending: { icon: Globe, color: 'text-slate-400', bg: 'bg-slate-500/15' },
  domain_failed: { icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/15' },
  credential_created: { icon: KeyRound, color: 'text-violet-400', bg: 'bg-violet-500/15' },
  apikey_created: { icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  webhook_added: { icon: Webhook, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
  smtp_used: { icon: Send, color: 'text-brand-400', bg: 'bg-brand-500/15' },
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const ActivityTimeline = ({ items, loading = false }: ActivityTimelineProps) => {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? items.slice(0, 20) : items.slice(0, 7);

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/80 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <History className="w-4 h-4 text-brand-500" />
            Recent Activity
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Workspace audit trail
          </p>
        </div>
        {items.length > 7 && (
          <button
            onClick={() => setShowAll((s) => !s)}
            className="text-xs font-semibold text-brand-500 hover:text-brand-400 transition-colors"
          >
            {showAll ? 'Show less' : 'View all'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200/60 dark:bg-slate-800/60" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-40 animate-pulse rounded-full bg-slate-200/60 dark:bg-slate-800/60" />
                <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200/60 dark:bg-slate-800/60" />
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-400 mb-3">
            <History className="w-8 h-8" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            No activity yet
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Events will appear here as you send email and manage your workspace.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-1 bottom-1 w-px bg-slate-200/80 dark:bg-slate-800/80" />

          <div className="space-y-5">
            {displayed.map((item) => {
              const conf = ICONS[item.type];
              const Icon = conf.icon;
              return (
                <div key={item.id} className="relative flex items-start gap-4 pl-0">
                  {/* Node */}
                  <div className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${conf.bg}`}>
                    <Icon className={`w-4 h-4 ${conf.color}`} />
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.message}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                        {timeAgo(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityTimeline;
