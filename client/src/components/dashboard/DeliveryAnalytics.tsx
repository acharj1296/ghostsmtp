import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Download, ZoomIn, Send } from 'lucide-react';
import { DeliveryChart, DELIVERY_SERIES } from './DeliveryChart';
import type { ChartSeriesKey, DeliveryChartDatum } from './DeliveryChart';
import { EmptyState } from './EmptyState';
import { fadeUp, revealViewport } from './motion';

// ─── DeliveryAnalytics (Section 5) ────────────────────────────────────────────
// Full-width professional analytics: 30/14/7-day range, series toggles, a zoom
// affordance (tighter range) and CSV export. Wraps the custom DeliveryChart.

interface DeliveryAnalyticsProps {
  data: DeliveryChartDatum[];
  loading?: boolean;
  onSendTest?: () => void;
}

type Range = 7 | 14 | 30;

function toCsv(rows: DeliveryChartDatum[]): string {
  const header = ['date', ...DELIVERY_SERIES.map((s) => s.key)].join(',');
  const body = rows
    .map((r) => [r.fullDate, ...DELIVERY_SERIES.map((s) => r[s.key])].join(','))
    .join('\n');
  return `${header}\n${body}`;
}

export const DeliveryAnalytics = ({ data, loading, onSendTest }: DeliveryAnalyticsProps) => {
  const [range, setRange] = useState<Range>(30);
  const [hidden, setHidden] = useState<Set<ChartSeriesKey>>(new Set());

  const ranged = useMemo(() => data.slice(-range), [data, range]);
  const visible = useMemo(
    () => DELIVERY_SERIES.map((s) => s.key).filter((k) => !hidden.has(k)),
    [hidden],
  );

  const totals = useMemo(() => {
    return ranged.reduce(
      (acc, d) => {
        acc.sent += d.sent;
        acc.delivered += d.delivered;
        acc.failed += d.failed;
        return acc;
      },
      { sent: 0, delivered: 0, failed: 0 },
    );
  }, [ranged]);

  const toggleSeries = (key: ChartSeriesKey) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(ranged)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery-analytics-${range}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasData = ranged.some((d) => d.sent > 0 || d.failed > 0 || d.queued > 0);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-900/80"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 dark:text-brand-400">
            <LineChart className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Delivery Analytics</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {totals.sent.toLocaleString()} sent · {totals.delivered.toLocaleString()} delivered ·{' '}
              {totals.failed.toLocaleString()} failed
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Range selector */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/60">
            {([7, 14, 30] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  range === r
                    ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-400'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
          <button
            onClick={() => setRange(range === 7 ? 30 : 7)}
            title="Toggle zoom"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:text-brand-600 dark:border-slate-700 dark:hover:text-brand-400"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-500/40 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-brand-400"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Series toggles */}
      <div className="flex flex-wrap gap-2 px-5 pt-4">
        {DELIVERY_SERIES.map((s) => {
          const off = hidden.has(s.key);
          return (
            <button
              key={s.key}
              onClick={() => toggleSeries(s.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                off
                  ? 'border-slate-200 text-slate-400 opacity-60 dark:border-slate-800'
                  : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: off ? '#94a3b8' : s.color }}
              />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Chart body */}
      <div className="p-5">
        {loading ? (
          <div className="h-[300px] animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
        ) : !hasData ? (
          <EmptyState
            icon={Send}
            title="No delivery data yet"
            description="Send your first emails to populate this chart with volume and engagement."
            actionLabel="Send Test Email"
            onAction={onSendTest}
          />
        ) : (
          <DeliveryChart data={ranged} height={300} visible={visible} />
        )}
      </div>
    </motion.div>
  );
};

export default DeliveryAnalytics;
