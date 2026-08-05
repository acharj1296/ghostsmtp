import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  ChevronDown,
  Check,
  AlertTriangle,
  X,
  ExternalLink,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { EmptyState } from './EmptyState';
import { EASE } from './motion';
import type { CheckState, DomainHealthRow } from '../../hooks/useDashboardDerivations';

// ─── DomainHealth (Section 4) ─────────────────────────────────────────────────
// The table SMTP customers live in: authentication + delivery posture per domain,
// with expandable rows for DNS detail. Empty state invites the first domain.

interface DomainHealthProps {
  rows: DomainHealthRow[];
  loading?: boolean;
}

// ─── Check pill ────────────────────────────────────────────────────────────────
const CHECK_META: Record<CheckState, { icon: typeof Check; cls: string; label: string }> = {
  pass: { icon: Check, cls: 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20', label: 'Pass' },
  warn: { icon: AlertTriangle, cls: 'bg-amber-500/10 text-amber-500 ring-amber-500/20', label: 'Warn' },
  fail: { icon: X, cls: 'bg-rose-500/10 text-rose-500 ring-rose-500/20', label: 'Fail' },
};

const CheckPill = ({ state }: { state: CheckState }) => {
  const m = CHECK_META[state];
  const Icon = m.icon;
  return (
    <span
      title={m.label}
      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg ring-1 ${m.cls}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
    </span>
  );
};

const STATUS_META: Record<DomainHealthRow['status'], { cls: string; label: string }> = {
  verified: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Verified' },
  pending: { cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Pending' },
  failed: { cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', label: 'Failed' },
};

function DeliverabilityBar({ value }: { value: number }) {
  const color = value >= 90 ? '#10b981' : value >= 75 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

const COLS = ['Verification', 'DNS', 'SPF', 'DKIM', 'DMARC', 'TLS'] as const;

export const DomainHealth = ({ rows, loading }: DomainHealthProps) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-900/80">
        <div className="space-y-px">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 flex-1 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-900/80">
        <EmptyState
          icon={Globe}
          title="Add your first sending domain"
          description="Verify a domain to authenticate your mail with SPF, DKIM and DMARC and start sending."
          actionLabel="Add Domain"
          onAction={() => navigate('/domains')}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-900/80">
      {/* Table header (desktop) */}
      <div className="hidden grid-cols-[1.6fr_repeat(6,auto)_1.2fr_auto] items-center gap-4 border-b border-slate-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 lg:grid">
        <span>Domain</span>
        {COLS.map((c) => (
          <span key={c} className="text-center">{c}</span>
        ))}
        <span>Deliverability</span>
        <span className="text-right">Actions</span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
        {rows.map((row) => {
          const isOpen = expanded === row.id;
          const status = STATUS_META[row.status];
          return (
            <div key={row.id}>
              {/* Row */}
              <button
                onClick={() => setExpanded(isOpen ? null : row.id)}
                className="grid w-full grid-cols-2 items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 lg:grid-cols-[1.6fr_repeat(6,auto)_1.2fr_auto]"
              >
                {/* Domain */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Globe className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {row.name}
                    </p>
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Check pills (desktop) */}
                <div className="hidden justify-center lg:flex"><CheckPill state={row.verification} /></div>
                <div className="hidden justify-center lg:flex"><CheckPill state={row.dns} /></div>
                <div className="hidden justify-center lg:flex"><CheckPill state={row.spf} /></div>
                <div className="hidden justify-center lg:flex"><CheckPill state={row.dkim} /></div>
                <div className="hidden justify-center lg:flex"><CheckPill state={row.dmarc} /></div>
                <div className="hidden justify-center lg:flex"><CheckPill state={row.tls} /></div>

                {/* Deliverability */}
                <div className="hidden lg:block"><DeliverabilityBar value={row.deliverability} /></div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  <span className="hidden text-xs font-medium text-brand-500 sm:inline">
                    {isOpen ? 'Hide' : 'Details'}
                  </span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </motion.span>
                </div>
              </button>

              {/* Mobile check row */}
              <div className="flex items-center gap-2 px-5 pb-3 lg:hidden">
                {COLS.map((c, i) => {
                  const state = [row.verification, row.dns, row.spf, row.dkim, row.dmarc, row.tls][i];
                  return (
                    <div key={c} className="flex flex-col items-center gap-1">
                      <CheckPill state={state} />
                      <span className="text-[9px] uppercase text-slate-400">{c}</span>
                    </div>
                  );
                })}
              </div>

              {/* Expanded detail */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="overflow-hidden bg-slate-50/60 dark:bg-slate-950/40"
                  >
                    <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
                      <DetailField label="DKIM Selector" value={row.dkimSelector} mono />
                      <DetailField label="DMARC Policy" value={`p=${row.dmarcPolicy}`} mono />
                      <DetailField label="Mail Server" value={row.mailServerHost} mono />
                      <DetailField label="Server IP" value={row.mailServerIp} mono />
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-slate-200/60 px-5 py-3 dark:border-slate-800/60">
                      <ActionLink icon={ShieldCheck} label="Verify DNS" onClick={() => navigate('/domains')} />
                      <ActionLink icon={ExternalLink} label="Manage domain" onClick={() => navigate('/domains')} />
                      <ActionLink icon={Copy} label="Copy records" onClick={() => navigate('/domains')} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-sm text-slate-700 dark:text-slate-300 ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </p>
    </div>
  );
}

function ActionLink({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Check;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-500/40 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-brand-400"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export default DomainHealth;
