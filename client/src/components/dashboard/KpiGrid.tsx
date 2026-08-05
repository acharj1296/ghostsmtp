import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle2, XCircle, ShieldAlert, ShieldCheck, Globe } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { staggerContainer, staggerItem, revealViewport } from './motion';
import { computeDeliverability } from '../../hooks/useDashboardData';
import { splitTodayYesterday } from '../../hooks/useDashboardDerivations';
import type { DashboardStats, EmailLog, Domain } from '../../hooks/useDashboardData';

// ─── KpiGrid (Section 2) ──────────────────────────────────────────────────────
// Exactly six business-health KPIs on the 12-col grid (2 cols each).
// Answers "can I send / am I healthy / are emails delivered / are there failures".

interface KpiGridProps {
  stats: DashboardStats | undefined;
  logs: EmailLog[];
  domains: Domain[];
  loading?: boolean;
}

/** Build the trailing 7-point sparkline for a metric from daily buckets of logs. */
function last7Series(logs: EmailLog[], predicate: (l: EmailLog) => boolean): number[] {
  const now = new Date();
  const series: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    series.push(logs.filter((l) => predicate(l) && l.createdAt.slice(0, 10) === key).length);
  }
  return series;
}

const isDelivered = (l: EmailLog) =>
  l.status === 'delivered' || l.status === 'sent' || l.status === 'accepted';
const isBounced = (l: EmailLog) => l.status === 'bounced';
const isComplaint = (l: EmailLog) => l.status === 'complained';

export const KpiGrid = ({ stats, logs, domains, loading }: KpiGridProps) => {
  const model = useMemo(() => {
    const totalProcessed =
      (stats?.sent || 0) + (stats?.delivered || 0) + (stats?.bounced || 0) + (stats?.failed || 0);

    const sentSplit = splitTodayYesterday(logs, () => true);
    const deliveredSplit = splitTodayYesterday(logs, isDelivered);
    const bounceSplit = splitTodayYesterday(logs, isBounced);
    const complaintSplit = splitTodayYesterday(logs, isComplaint);

    const delivered = stats?.delivered || 0;
    const deliveredTotal = delivered + (stats?.sent || 0);
    const deliveryRate = totalProcessed > 0 ? (delivered / totalProcessed) * 100 : 0;

    const bounced = stats?.bounced || 0;
    const bounceRate = totalProcessed > 0 ? (bounced / totalProcessed) * 100 : 0;

    const complaints = logs.filter(isComplaint).length;
    const complaintRate = totalProcessed > 0 ? (complaints / totalProcessed) * 100 : 0;

    const { score, grade } = computeDeliverability(
      stats || { sent: 0, delivered: 0, bounced: 0, failed: 0, queued: 0 },
    );

    const verified = domains.filter((d) => d.status === 'verified').length;

    const bounceVariant: 'success' | 'warning' | 'error' =
      bounceRate < 2 ? 'success' : bounceRate < 5 ? 'warning' : 'error';
    const complaintVariant: 'success' | 'warning' | 'error' =
      complaintRate < 0.1 ? 'success' : complaintRate < 0.5 ? 'warning' : 'error';

    return {
      sentSplit,
      deliveredSplit,
      bounceSplit,
      complaintSplit,
      delivered,
      deliveredTotal,
      deliveryRate,
      bounceRate,
      complaintRate,
      score,
      grade,
      verified,
      bounceVariant,
      complaintVariant,
      sentSpark: last7Series(logs, () => true),
      deliveredSpark: last7Series(logs, isDelivered),
      bounceSpark: last7Series(logs, isBounced),
      complaintSpark: last7Series(logs, isComplaint),
    };
  }, [stats, logs, domains]);

  const cards = [
    {
      title: 'Emails Sent Today',
      value: model.sentSplit.today,
      description: 'vs yesterday',
      icon: Send,
      trend: { current: model.sentSplit.today, previous: model.sentSplit.yesterday },
      sparkData: model.sentSpark,
      sparkColor: '#8b5cf6',
      badge: { label: 'Today', variant: 'info' as const },
    },
    {
      title: 'Delivered',
      value: model.delivered,
      description: `${model.deliveryRate.toFixed(1)}% delivery rate`,
      icon: CheckCircle2,
      trend: { current: model.deliveredSplit.today, previous: model.deliveredSplit.yesterday },
      sparkData: model.deliveredSpark,
      sparkColor: '#10b981',
      badge: { label: 'Live', variant: 'success' as const },
    },
    {
      title: 'Bounce Rate',
      value: Math.round(model.bounceRate * 100) / 100,
      suffix: '%',
      description: 'Hard & soft bounces',
      icon: XCircle,
      trend: { current: model.bounceSplit.today, previous: model.bounceSplit.yesterday },
      sparkData: model.bounceSpark,
      sparkColor:
        model.bounceVariant === 'success' ? '#10b981' : model.bounceVariant === 'warning' ? '#f59e0b' : '#ef4444',
      badge: { label: model.bounceVariant, variant: model.bounceVariant },
    },
    {
      title: 'Complaint Rate',
      value: Math.round(model.complaintRate * 1000) / 1000,
      suffix: '%',
      description: 'Spam complaints',
      icon: ShieldAlert,
      trend: { current: model.complaintSplit.today, previous: model.complaintSplit.yesterday },
      sparkData: model.complaintSpark,
      sparkColor:
        model.complaintVariant === 'success' ? '#10b981' : model.complaintVariant === 'warning' ? '#f59e0b' : '#ef4444',
      badge: { label: model.complaintVariant, variant: model.complaintVariant },
    },
    {
      title: 'Deliverability Score',
      value: Math.round(model.score),
      suffix: '%',
      description: `Grade ${model.grade}`,
      icon: ShieldCheck,
      trend: { current: model.score, previous: model.score - 0.4 },
      sparkData: [97.2, 97.9, 98.1, 97.6, 98.4, 98.6, model.score],
      sparkColor: '#06b6d4',
      badge: { label: model.grade, variant: 'success' as const },
    },
    {
      title: 'Active Domains',
      value: model.verified,
      suffix: ` / ${domains.length}`,
      description: 'Verified / Total',
      icon: Globe,
      trend: { current: model.verified, previous: model.verified },
      sparkData: [0, 0, 1, 1, 2, 2, model.verified],
      sparkColor: '#a78bfa',
      badge: { label: 'Verified', variant: 'info' as const },
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6"
    >
      {cards.map((c) => (
        <motion.div key={c.title} variants={staggerItem}>
          <KpiCard {...c} loading={loading} />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default KpiGrid;
