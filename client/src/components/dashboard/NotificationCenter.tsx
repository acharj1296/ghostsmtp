import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { staggerContainer, staggerItem, revealViewport } from './motion';
import type { DashboardNotification, NoteLevel } from '../../hooks/useDashboardDerivations';

// ─── NotificationCenter (Section 11) ──────────────────────────────────────────
// In-page grouped notifications (not a floating toast). Filterable by level.

interface NotificationCenterProps {
  notifications: DashboardNotification[];
  loading?: boolean;
}

const LEVEL_META: Record<NoteLevel, { icon: LucideIcon; ring: string; text: string; dot: string }> = {
  error: { icon: AlertCircle, ring: 'bg-rose-500/10', text: 'text-rose-500', dot: 'bg-rose-500' },
  warning: { icon: AlertTriangle, ring: 'bg-amber-500/10', text: 'text-amber-500', dot: 'bg-amber-500' },
  info: { icon: Info, ring: 'bg-brand-500/10', text: 'text-brand-500', dot: 'bg-brand-500' },
  success: { icon: CheckCircle2, ring: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
};

const FILTERS: Array<{ key: NoteLevel | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'error', label: 'Errors' },
  { key: 'warning', label: 'Warnings' },
  { key: 'info', label: 'Info' },
  { key: 'success', label: 'Success' },
];

export const NotificationCenter = ({ notifications, loading }: NotificationCenterProps) => {
  const [filter, setFilter] = useState<NoteLevel | 'all'>('all');

  const counts = notifications.reduce(
    (acc, n) => {
      acc[n.level]++;
      return acc;
    },
    { error: 0, warning: 0, info: 0, success: 0 } as Record<NoteLevel, number>,
  );

  const filtered =
    filter === 'all' ? notifications : notifications.filter((n) => n.level === filter);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-900/80">
      {/* Header */}
      <div className="border-b border-slate-100 p-5 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 dark:text-brand-400">
              <Bell className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Notifications</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {notifications.length} total · {counts.error} critical
              </p>
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = f.key === 'all' ? notifications.length : counts[f.key as NoteLevel];
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {f.label}
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All clear"
            description="No notifications in this category. Everything looks healthy."
            compact
          />
        ) : (
          <motion.ul
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            className="space-y-1.5"
          >
            <AnimatePresence initial={false}>
              {filtered.map((n) => {
                const meta = LEVEL_META[n.level];
                const Icon = meta.icon;
                return (
                  <motion.li
                    key={n.id}
                    variants={staggerItem}
                    layout
                    className="flex items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-slate-200/70 hover:bg-slate-50/70 dark:hover:border-slate-800 dark:hover:bg-slate-800/30"
                  >
                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${meta.ring} ${meta.text}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
