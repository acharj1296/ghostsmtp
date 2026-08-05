import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { staggerContainer, staggerItem, revealViewport, EASE } from './motion';
import type { DeliverabilityFactor } from '../../hooks/useDashboardDerivations';

// ─── DeliverabilityCenter (Section 8) ─────────────────────────────────────────
// Ten professional gauges covering inbox/spam scoring and full authentication
// posture (SPF, DKIM, DMARC, Reverse DNS, BIMI, TLS, MTA-STS, TLS-RPT).

interface DeliverabilityCenterProps {
  factors: DeliverabilityFactor[];
  overallScore: number;
  grade: string;
  loading?: boolean;
}

const STATUS_COLOR: Record<DeliverabilityFactor['status'], string> = {
  ok: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

function Gauge({ factor }: { factor: DeliverabilityFactor }) {
  const size = 84;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const color = STATUS_COLOR[factor.status];
  const offset = circ - (factor.value / 100) * circ;

  return (
    <motion.div
      variants={staggerItem}
      className="flex flex-col items-center rounded-xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/60 dark:bg-slate-900/60"
      title={factor.hint}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-slate-200 dark:stroke-slate-800"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            whileInView={{ strokeDashoffset: offset }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: EASE }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
            {Math.round(factor.value)}
          </span>
        </div>
      </div>
      <span className="mt-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
        {factor.label}
      </span>
    </motion.div>
  );
}

export const DeliverabilityCenter = ({
  factors,
  overallScore,
  grade,
  loading,
}: DeliverabilityCenterProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall summary banner */}
      <motion.div
        variants={staggerItem}
        initial="hidden"
        whileInView="visible"
        viewport={revealViewport}
        className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-gradient-to-r from-brand-500/[0.07] to-transparent p-5 dark:border-slate-800/60"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 dark:text-brand-400">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Overall deliverability posture
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregated across authentication, reputation and transport security
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {Math.round(overallScore)}%
          </p>
          <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            Grade {grade}
          </span>
        </div>
      </motion.div>

      {/* Gauge grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={revealViewport}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {factors.map((f) => (
          <Gauge key={f.key} factor={f} />
        ))}
      </motion.div>
    </div>
  );
};

export default DeliverabilityCenter;
