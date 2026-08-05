import { CheckCircle, Clock, XCircle, Globe, Mail, TrendingUp } from 'lucide-react';

interface SummaryCardsProps {
  domains: any[];
  emailSentToday?: number | null;
  avgHealthScore?: number | null;
}

export const SummaryCards = ({ domains, emailSentToday, avgHealthScore }: SummaryCardsProps) => {
  const verified = domains.filter((d: any) => d.status === 'verified').length;
  const pending = domains.filter((d: any) => d.status === 'pending').length;
  const failed = domains.filter((d: any) => d.status === 'failed').length;
  const total = domains.length;

  const cards = [
    {
      label: 'Verified Domains',
      value: verified,
      icon: CheckCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Pending Verification',
      value: pending,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Failed Verification',
      value: failed,
      icon: XCircle,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
    },
    {
      label: 'Total Domains',
      value: total,
      icon: Globe,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Emails Sent Today',
      value: emailSentToday ?? '—',
      icon: Mail,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Avg Deliverability',
      value: avgHealthScore !== null && avgHealthScore !== undefined ? `${avgHealthScore}%` : '—',
      icon: TrendingUp,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 space-y-3"
        >
          <div className={`p-2 rounded-lg w-fit ${card.bg}`}>
            <card.icon className={`w-4 h-4 ${card.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
