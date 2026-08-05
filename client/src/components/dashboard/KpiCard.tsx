import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─── Animated Number ────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ─── Sparkline SVG ──────────────────────────────────────────────────────────

function Sparkline({
  data,
  color = '#8b5cf6',
  height = 32,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const w = 100;
  const h = height;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - (v / max) * (h - 4) - 2,
  }));

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area =
    line + ` L${w},${h} L0,${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${color.replace('#', '')})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Trend Badge ────────────────────────────────────────────────────────────

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
        <Minus className="w-3 h-3" /> No data
      </span>
    );
  }

  const diff = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
  const rounded = Math.round(diff * 10) / 10;

  if (rounded > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
        <TrendingUp className="w-3 h-3" /> +{rounded}%
      </span>
    );
  }
  if (rounded < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
        <TrendingDown className="w-3 h-3" /> {rounded}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
      <Minus className="w-3 h-3" /> 0%
    </span>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  description?: string;
  icon: LucideIcon;
  trend?: { current: number; previous: number };
  sparkData?: number[];
  sparkColor?: string;
  badge?: { label: string; variant?: 'success' | 'warning' | 'error' | 'info' };
  loading?: boolean;
  children?: ReactNode;
}

export const KpiCard = ({
  title,
  value,
  suffix = '',
  prefix = '',
  description,
  icon: Icon,
  trend,
  sparkData,
  sparkColor = '#8b5cf6',
  badge,
  loading = false,
  children,
}: KpiCardProps) => {
  const animated = useCountUp(value);

  return (
    <div className="group relative rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/80 backdrop-blur-sm p-6 transition-all duration-300 hover:border-slate-300/80 dark:hover:border-slate-700/80 hover:shadow-lg hover:shadow-slate-200/20 dark:hover:shadow-slate-900/40 hover:-translate-y-0.5">
      {/* Icon + Trend */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 text-brand-500 dark:text-brand-400 transition-transform duration-300 group-hover:scale-110">
          <Icon className="w-5 h-5" />
        </div>
        {badge && (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              badge.variant === 'success'
                ? 'bg-emerald-500/10 text-emerald-400'
                : badge.variant === 'warning'
                  ? 'bg-amber-500/10 text-amber-400'
                  : badge.variant === 'error'
                    ? 'bg-rose-500/10 text-rose-400'
                    : 'bg-brand-500/10 text-brand-400'
            }`}
          >
            {badge.label}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
        {title}
      </p>

      {/* Value */}
      <div className="flex items-baseline gap-1 mb-1">
        {prefix && <span className="text-sm text-slate-400">{prefix}</span>}
        <span className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
          {loading ? '--' : animated.toLocaleString()}
        </span>
        {suffix && <span className="text-sm text-slate-400 ml-0.5">{suffix}</span>}
      </div>

      {/* Description + Trend */}
      <div className="flex items-center gap-2 mb-3">
        {description && (
          <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>
        )}
        {trend && <TrendBadge current={trend.current} previous={trend.previous} />}
      </div>

      {/* Sparkline */}
      {sparkData && sparkData.length >= 2 && (
        <div className="h-8 -mx-1">
          <Sparkline data={sparkData} color={sparkColor} height={32} />
        </div>
      )}

      {/* Extra content slot */}
      {children}
    </div>
  );
};

export default KpiCard;
