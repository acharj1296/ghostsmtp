import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface DnsStatusBadgesProps {
  verification: Record<string, boolean> | null | undefined;
}

const DNS_RECORDS = [
  { key: 'mx', label: 'MX' },
  { key: 'spf', label: 'SPF' },
  { key: 'dkim', label: 'DKIM' },
  { key: 'dmarc', label: 'DMARC' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'bounce', label: 'Bounce' },
  { key: 'mtaSts', label: 'MTA-STS' },
  { key: 'tlsRpt', label: 'TLS-RPT' },
] as const;

type RecordStatus = 'verified' | 'pending' | 'missing';

const getRecordStatus = (
  verification: Record<string, boolean> | null | undefined,
  key: string
): RecordStatus => {
  if (!verification) return 'missing';
  const verified = verification[`${key}Verified`];
  if (verified === true) return 'verified';
  if (verified === false) return 'pending';
  return 'missing';
};

const STATUS_STYLES: Record<RecordStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  verified: {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-500',
    icon: <CheckCircle className="w-2.5 h-2.5" />,
  },
  pending: {
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-500',
    icon: <Clock className="w-2.5 h-2.5" />,
  },
  missing: {
    bg: 'bg-slate-500/10 border-slate-500/20',
    text: 'text-slate-400',
    icon: <XCircle className="w-2.5 h-2.5" />,
  },
};

export const DnsStatusBadges = ({ verification }: DnsStatusBadgesProps) => {
  const verifiedCount = DNS_RECORDS.filter(
    (r) => getRecordStatus(verification, r.key) === 'verified'
  ).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="font-medium">{verifiedCount}/{DNS_RECORDS.length}</span>
        <span>verified</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DNS_RECORDS.map((record) => {
          const status = getRecordStatus(verification, record.key);
          const styles = STATUS_STYLES[status];
          return (
            <span
              key={record.key}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${styles.bg} ${styles.text}`}
              title={`${record.label}: ${status}`}
            >
              {styles.icon}
              {record.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default DnsStatusBadges;
