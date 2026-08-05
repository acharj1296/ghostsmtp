import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { EASE } from './motion';

// ─── EmptyState ─────────────────────────────────────────────────────────────
// Never show a blank card. This renders an inviting illustration + primary CTA
// so first-run users always have a clear next action.

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Compact variant for use inside smaller cards. */
  compact?: boolean;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-8 px-4' : 'py-14 px-6'
      }`}
    >
      {/* Layered gradient illustration */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative mb-5"
      >
        <div className="absolute inset-0 -z-10 rounded-full bg-brand-500/20 blur-2xl" />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-500/20 bg-gradient-to-br from-brand-500/15 to-brand-600/5 text-brand-500 dark:text-brand-400">
          <Icon className="h-7 w-7" strokeWidth={1.75} />
        </div>
      </motion.div>

      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{description}</p>

      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition-colors hover:bg-brand-700"
        >
          {actionLabel}
        </motion.button>
      )}
    </div>
  );
};

export default EmptyState;
