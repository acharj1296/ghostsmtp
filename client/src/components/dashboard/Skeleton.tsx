interface SkeletonPulseProps {
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonPulse = ({ className = '', style }: SkeletonPulseProps) => (
  <div
    className={`animate-pulse rounded-lg bg-slate-200/60 dark:bg-slate-800/60 ${className}`}
    style={style}
  />
);

export const KpiSkeleton = () => (
  <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/80 p-6 space-y-4">
    <div className="flex items-center justify-between">
      <SkeletonPulse className="h-10 w-10 rounded-xl" />
      <SkeletonPulse className="h-4 w-16 rounded-full" />
    </div>
    <SkeletonPulse className="h-8 w-28 rounded-lg" />
    <SkeletonPulse className="h-3 w-36 rounded-full" />
    <SkeletonPulse className="h-8 w-full rounded-lg" />
  </div>
);

export const ChartSkeleton = ({ height = 320 }: { height?: number }) => (
  <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/80 p-6">
    <div className="flex items-center justify-between mb-6">
      <div className="space-y-2">
        <SkeletonPulse className="h-5 w-48 rounded-lg" />
        <SkeletonPulse className="h-3 w-32 rounded-full" />
      </div>
      <div className="flex gap-2">
        <SkeletonPulse className="h-7 w-16 rounded-full" />
        <SkeletonPulse className="h-7 w-16 rounded-full" />
      </div>
    </div>
    <SkeletonPulse className={`w-full rounded-xl`} style={{ height }} />
  </div>
);

export const TableSkeleton = () => (
  <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/80 p-6">
    <SkeletonPulse className="h-5 w-48 rounded-lg mb-4" />
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <SkeletonPulse className="h-4 flex-1 rounded-lg" />
          <SkeletonPulse className="h-4 flex-1 rounded-lg" />
          <SkeletonPulse className="h-4 w-20 rounded-lg" />
          <SkeletonPulse className="h-4 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);
