interface ProgressRingProps {
  /** 0–100 percentage */
  value: number;
  /** Outer diameter in px */
  size?: number;
  /** Stroke width in px */
  strokeWidth?: number;
  /** Color class for the stroke (tailwind text-like) */
  color?: string;
  /** Font weight of the center label */
  showLabel?: boolean;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
};

export const ProgressRing = ({
  value,
  size = 80,
  strokeWidth = 6,
  color,
  showLabel = true,
}: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;
  const strokeColor = color || getScoreColor(clamped);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-700"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.6s ease-out',
          }}
        />
      </svg>
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900 dark:text-white">
          {clamped}
        </span>
      )}
    </div>
  );
};

export default ProgressRing;
