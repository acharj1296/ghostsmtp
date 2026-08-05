import { useEffect, useMemo, useState } from 'react';
import { Globe } from 'lucide-react';
import type { EmailLog } from '../../hooks/useDashboardData';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RegionPoint {
  id: string;
  label: string;
  x: number; // percentage across map
  y: number; // percentage down map
  count: number;
  intensity: number; // 0-1
}

interface WorldMapProps {
  logs: EmailLog[];
  loading?: boolean;
}

// ─── Region inference ───────────────────────────────────────────────────────

// Approximate geographic mapping of common TLDs → world coordinates (percent).
const TLD_MAP: Record<string, { x: number; y: number; label: string }> = {
  com: { x: 30, y: 44, label: 'United States' },
  net: { x: 30, y: 44, label: 'United States' },
  org: { x: 32, y: 45, label: 'United States' },
  io: { x: 30, y: 44, label: 'United States' },
  dev: { x: 30, y: 44, label: 'United States' },
  us: { x: 30, y: 40, label: 'United States' },
  ca: { x: 27, y: 32, label: 'Canada' },
  mx: { x: 26, y: 54, label: 'Mexico' },
  br: { x: 32, y: 74, label: 'Brazil' },
  co: { x: 32, y: 52, label: 'Colombia' },
  ar: { x: 33, y: 82, label: 'Argentina' },
  uk: { x: 52, y: 32, label: 'United Kingdom' },
  de: { x: 54, y: 38, label: 'Germany' },
  fr: { x: 52, y: 42, label: 'France' },
  es: { x: 49, y: 48, label: 'Spain' },
  it: { x: 55, y: 46, label: 'Italy' },
  nl: { x: 53, y: 36, label: 'Netherlands' },
  se: { x: 56, y: 30, label: 'Sweden' },
  no: { x: 55, y: 26, label: 'Norway' },
  fi: { x: 57, y: 24, label: 'Finland' },
  pl: { x: 57, y: 36, label: 'Poland' },
  ch: { x: 54, y: 42, label: 'Switzerland' },
  at: { x: 55, y: 41, label: 'Austria' },
  be: { x: 52, y: 38, label: 'Belgium' },
  dk: { x: 55, y: 31, label: 'Denmark' },
  ie: { x: 49, y: 35, label: 'Ireland' },
  pt: { x: 47, y: 50, label: 'Portugal' },
  gr: { x: 58, y: 46, label: 'Greece' },
  tr: { x: 60, y: 48, label: 'Turkey' },
  ru: { x: 64, y: 30, label: 'Russia' },
  ua: { x: 60, y: 35, label: 'Ukraine' },
  in: { x: 70, y: 56, label: 'India' },
  cn: { x: 76, y: 44, label: 'China' },
  jp: { x: 82, y: 42, label: 'Japan' },
  kr: { x: 79, y: 44, label: 'South Korea' },
  sg: { x: 78, y: 56, label: 'Singapore' },
  hk: { x: 77, y: 50, label: 'Hong Kong' },
  tw: { x: 79, y: 50, label: 'Taiwan' },
  au: { x: 84, y: 76, label: 'Australia' },
  nz: { x: 88, y: 78, label: 'New Zealand' },
  za: { x: 55, y: 76, label: 'South Africa' },
  ng: { x: 54, y: 62, label: 'Nigeria' },
  eg: { x: 58, y: 52, label: 'Egypt' },
  il: { x: 60, y: 48, label: 'Israel' },
  ae: { x: 63, y: 54, label: 'UAE' },
  sa: { x: 61, y: 52, label: 'Saudi Arabia' },
  id: { x: 77, y: 60, label: 'Indonesia' },
  my: { x: 76, y: 56, label: 'Malaysia' },
  th: { x: 75, y: 58, label: 'Thailand' },
  vn: { x: 74, y: 56, label: 'Vietnam' },
  ph: { x: 79, y: 58, label: 'Philippines' },
};

function getTld(recipient: string): string {
  const parts = recipient.split('@');
  const domain = parts[parts.length - 1] || '';
  const segments = domain.split('.');
  return segments.length >= 2 ? segments[segments.length - 1].toLowerCase() : '';
}

function inferRegions(logs: EmailLog[]): RegionPoint[] {
  const counts = new Map<string, { x: number; y: number; label: string; count: number }>();

  logs.forEach((log) => {
    const tld = getTld(log.recipient);
    const loc = TLD_MAP[tld];
    if (!loc) return;
    const key = loc.label;
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, { x: loc.x, y: loc.y, label: loc.label, count: 1 });
    }
  });

  const maxCount = Math.max(1, ...Array.from(counts.values()).map((v) => v.count));
  return Array.from(counts.values())
    .map(({ x, y, label, count }) => ({
      id: label,
      label,
      x,
      y,
      count,
      intensity: count / maxCount,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Component ──────────────────────────────────────────────────────────────

export const WorldMap = ({ logs, loading = false }: WorldMapProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  const regions = useMemo(() => inferRegions(logs), [logs]);
  const topRegions = regions.slice(0, 6);
  const totalDelivered = regions.reduce((acc, r) => acc + r.count, 0);

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/80 backdrop-blur-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Globe className="w-4 h-4 text-brand-500" />
            Global Delivery Map
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Countries reached by your sending volume
          </p>
        </div>
        {!loading && totalDelivered > 0 && (
          <span className="rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-[10px] font-bold text-brand-400 uppercase tracking-wider">
            {topRegions.length} regions
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-64 w-full animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
        </div>
      ) : (
        <>
          {/* Map canvas */}
          <div className="relative flex-1 min-h-[240px] rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-b from-slate-50/80 to-slate-100/80 dark:from-slate-900 dark:to-slate-950 overflow-hidden">
            {/* Grid texture */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, rgba(100,116,139,0.25) 1px, transparent 0)',
                backgroundSize: '22px 22px',
              }}
            />
            {/* Equator line */}
            <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-200/70 dark:bg-slate-800/70" />

            {/* Simplified continent silhouettes */}
            <div className="absolute left-[8%] top-[30%] h-[22%] w-[22%] rounded-full bg-brand-500/10 dark:bg-brand-500/10 blur-xl" />
            <div className="absolute left-[48%] top-[28%] h-[20%] w-[18%] rounded-full bg-slate-400/10 dark:bg-slate-500/10 blur-xl" />
            <div className="absolute left-[62%] top-[40%] h-[24%] w-[22%] rounded-full bg-slate-400/10 dark:bg-slate-500/10 blur-xl" />
            <div className="absolute left-[70%] top-[68%] h-[16%] w-[20%] rounded-full bg-slate-400/10 dark:bg-slate-500/10 blur-xl" />

            {/* Animated region markers */}
            {regions.map((r, i) => (
              <div
                key={r.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${r.x}%`, top: `${r.y}%` }}
              >
                {/* Ripple */}
                <span
                  className="absolute inline-flex h-4 w-4 rounded-full animate-ping"
                  style={{
                    backgroundColor: '#8b5cf6',
                    opacity: 0.25 * r.intensity,
                    transitionDelay: `${i * 100}ms`,
                  }}
                />
                {/* Core dot */}
                <span
                  className={`relative inline-flex rounded-full transition-all duration-1000 ${
                    visible ? 'scale-100' : 'scale-0'
                  }`}
                  style={{
                    width: 6 + r.intensity * 8,
                    height: 6 + r.intensity * 8,
                    backgroundColor: r.intensity > 0.6 ? '#f59e0b' : '#8b5cf6',
                    boxShadow: `0 0 ${4 + r.intensity * 12}px ${
                      r.intensity > 0.6 ? 'rgba(245,158,11,0.6)' : 'rgba(139,92,246,0.6)'
                    }`,
                  }}
                />
                {/* Count badge on high volume */}
                {r.count >= 3 && (
                  <span className="absolute -top-4 -right-5 rounded-full bg-slate-900 dark:bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums">
                    {r.count}
                  </span>
                )}
              </div>
            ))}

            {/* Empty state */}
            {regions.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <Globe className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  No delivery data yet
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[240px]">
                  Send your first email and we'll plot global delivery heat here.
                </p>
              </div>
            )}
          </div>

          {/* Region list */}
          {topRegions.length > 0 && (
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {topRegions.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-800/30 px-3 py-2"
                >
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate mr-2">
                    {r.label}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums shrink-0">
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WorldMap;
