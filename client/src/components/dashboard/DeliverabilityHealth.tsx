import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HealthFactor {
  key: string;
  label: string;
  status: 'ok' | 'warning' | 'error';
  value: number; // 0-100
  detail?: string;
}

interface DeliverabilityHealthProps {
  score: number;
  grade: string;
  factors: HealthFactor[];
  loading?: boolean;
}

// ─── Radial Gauge ───────────────────────────────────────────────────────────

function RadialGauge({ score, grade }: { score: number; grade: string }) {
  const [animated, setAnimated] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimated(score * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score]);

  const size = 200;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animated / 100);

  const color = animated >= 90 ? '#10b981' : animated >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.15)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums">
          {Math.round(animated)}
        </span>
        <span
          className="mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
          style={{
            color,
            backgroundColor: `${color}1a`,
          }}
        >
          Grade {grade}
        </span>
      </div>
    </div>
  );
}

// ─── Factor row ─────────────────────────────────────────────────────────────

function FactorRow({ factor }: { factor: HealthFactor }) {
  const statusColor =
    factor.status === 'ok'
      ? '#10b981'
      : factor.status === 'warning'
        ? '#f59e0b'
        : '#ef4444';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{factor.label}</span>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: statusColor }}
        >
          {factor.status === 'ok' ? 'Pass' : factor.status === 'warning' ? 'Warn' : 'Fail'}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200/60 dark:bg-slate-800/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${factor.value}%`, backgroundColor: statusColor }}
        />
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export const DeliverabilityHealth = ({
  score,
  grade,
  factors,
  loading = false,
}: DeliverabilityHealthProps) => {
  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/80 backdrop-blur-sm p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Deliverability Health
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Authentication & reputation signals
          </p>
        </div>
        <Sparkles className="w-4 h-4 text-amber-400" />
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="h-[200px] w-[200px] animate-pulse rounded-full bg-slate-200/60 dark:bg-slate-800/60" />
          <div className="grid grid-cols-2 gap-3 w-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="shrink-0">
            <RadialGauge score={score} grade={grade} />
          </div>
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {factors.map((f) => (
              <FactorRow key={f.key} factor={f} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliverabilityHealth;
