interface HealthScoreProps {
  score?: number | null;
  size?: 'sm' | 'md';
}

const getScoreColor = (score: number) => {
  if (score >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-500' };
  if (score >= 60) return { bar: 'bg-amber-500', text: 'text-amber-500' };
  return { bar: 'bg-rose-500', text: 'text-rose-500' };
};

export const HealthScore = ({ score, size = 'md' }: HealthScoreProps) => {
  if (score === undefined || score === null) {
    return (
      <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
    );
  }

  const colors = getScoreColor(score);

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${colors.text}`}>{score}%</span>
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${score}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-lg font-bold ${colors.text}`}>{score}%</span>
      </div>
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
};

export default HealthScore;
