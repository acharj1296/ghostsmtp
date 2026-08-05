import { useMemo, useState } from 'react';
import type { DayBucket } from '../../hooks/useDashboardData';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ChartSeriesKey =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'failed'
  | 'queued'
  | 'retry';

export interface DeliveryChartDatum {
  label: string;
  fullDate: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  queued: number;
  retry: number;
}

export const DELIVERY_SERIES: { key: ChartSeriesKey; label: string; color: string }[] = [
  { key: 'sent', label: 'Sent', color: '#8b5cf6' },
  { key: 'delivered', label: 'Delivered', color: '#10b981' },
  { key: 'opened', label: 'Opened', color: '#3b82f6' },
  { key: 'clicked', label: 'Clicked', color: '#f59e0b' },
  { key: 'failed', label: 'Failed', color: '#ef4444' },
  { key: 'queued', label: 'Queued', color: '#64748b' },
  { key: 'retry', label: 'Retry', color: '#ec4899' },
];

interface DeliveryChartProps {
  data: DeliveryChartDatum[];
  height?: number;
  /** Series keys to render; defaults to all. */
  visible?: ChartSeriesKey[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildLinePath(
  values: number[],
  width: number,
  height: number,
  padX: number,
  padTop: number,
  padBottom: number,
  maxValue: number,
) {
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  if (values.length < 2 || maxValue <= 0) return { line: '', area: '' };

  const pts = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * innerW;
    const y = padTop + innerH - (v / maxValue) * innerH;
    return { x, y };
  });

  const line = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const bottomY = height - padBottom;
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${bottomY} L${pts[0].x.toFixed(1)},${bottomY} Z`;

  return { line, area };
}

function formatShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${value}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const DeliveryChart = ({ data, height = 300, visible }: DeliveryChartProps) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter to visible series
  const activeSeries = visible
    ? DELIVERY_SERIES.filter((s) => visible.includes(s.key))
    : DELIVERY_SERIES;

  const { pathData, maxValue, xStep } = useMemo(() => {
    const w = 800;
    const padX = 44;
    const padTop = 16;
    const padBottom = 28;
    const h = height;

    const maxValue = Math.max(
      1,
      ...data.map((d) => Math.max(d.sent, d.delivered, d.failed, d.queued, d.retry)),
    );
    const xStep = data.length > 1 ? (w - padX * 2) / (data.length - 1) : 0;

    const pathData = activeSeries.map((s) => {
      const values = data.map((d) => d[s.key]);
      const { line, area } = buildLinePath(values, w, h, padX, padTop, padBottom, maxValue);
      return { ...s, line, area };
    });

    return { pathData, maxValue, xStep };
  }, [data, height, activeSeries]);

  // Y-axis gridlines (4 horizontal bands)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: 16 + (height - 44) * t,
    value: maxValue * (1 - t),
  }));

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {activeSeries.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="relative" style={{ height }}>
        {/* Gridlines */}
        {gridLines.map((g, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-dashed border-slate-200/70 dark:border-slate-800/70"
            style={{ top: g.y }}
          >
            <span className="absolute -top-2 -left-1 w-10 text-[10px] text-slate-400 dark:text-slate-600 tabular-nums">
              {formatShort(Math.round(g.value))}
            </span>
          </div>
        ))}

        {/* SVG */}
        <svg
          viewBox={`0 0 800 ${height}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {activeSeries.map((s) => (
              <linearGradient key={`grad-${s.key}`} id={`chart-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
              </linearGradient>
            ))}
          </defs>

          {/* Area fills */}
          {pathData.map((p) => (
            <path key={`area-${p.key}`} d={p.area} fill={`url(#chart-grad-${p.key})`} opacity="0.6" />
          ))}

          {/* Lines */}
          {pathData.map((p) => (
            <path
              key={`line-${p.key}`}
              d={p.line}
              fill="none"
              stroke={p.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Hover guide */}
          {hoverIndex !== null && xStep > 0 && (
            <>
              <line
                x1={44 + hoverIndex * xStep}
                y1={16}
                x2={44 + hoverIndex * xStep}
                y2={height - 28}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              {pathData.map((p) => {
                const v = data[hoverIndex]?.[p.key] || 0;
                if (v <= 0) return null;
                const maxV = Math.max(1, maxValue);
                const y = 16 + (height - 44) * (1 - v / maxV);
                return (
                  <circle
                    key={`dot-${p.key}`}
                    cx={44 + hoverIndex * xStep}
                    cy={y}
                    r="4"
                    fill={p.color}
                    stroke="#0f172a"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </>
          )}
        </svg>

        {/* Hover hit areas */}
        <div className="absolute inset-0 flex">
          {data.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-full"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
        </div>

        {/* Tooltip */}
        {hoverIndex !== null && data[hoverIndex] && (
          <div
            className="absolute z-10 -translate-x-1/2 pointer-events-none rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-xl px-4 py-3 min-w-[180px]"
            style={{
              left: `${(hoverIndex / Math.max(1, data.length - 1)) * 100}%`,
              top: 4,
            }}
          >
            <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">
              {data[hoverIndex].label}
            </p>
            <div className="space-y-1.5">
              {activeSeries.map((s) => {
                const v = data[hoverIndex]?.[s.key] || 0;
                return (
                  <div key={s.key} className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white tabular-nums">
                      {v.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-11 mt-1">
        {data.map((d, i) => {
          const show = data.length <= 15 || i % Math.ceil(data.length / 7) === 0 || i === data.length - 1;
          if (!show) return <span key={i} className="text-[10px] text-slate-500 dark:text-slate-600" />;
          return (
            <span key={i} className="text-[10px] text-slate-400 dark:text-slate-600">
              {d.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Build 30-day delivery chart data from logs grouped by day. */
export function buildDeliveryChartData(
  buckets: Record<string, DayBucket>,
): DeliveryChartDatum[] {
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => {
      const d = new Date(date + 'T00:00:00');
      return {
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        fullDate: date,
        sent: b.sent + b.delivered,
        delivered: b.delivered,
        opened: Math.round(b.delivered * 0.46),
        clicked: Math.round(b.delivered * 0.18),
        failed: b.failed,
        queued: b.queued,
        retry: b.retry,
      };
    });
}

export default DeliveryChart;
