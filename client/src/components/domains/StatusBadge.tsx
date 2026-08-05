import { Badge } from '../ui/badge';
import { CheckCircle, Clock, XCircle, Globe, Ban } from 'lucide-react';

type DomainStatus = 'verified' | 'pending' | 'failed' | 'dns_missing' | 'suspended';

const STATUS_CONFIG: Record<
  DomainStatus,
  { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; icon: React.ReactNode }
> = {
  verified: {
    label: 'Verified',
    variant: 'success',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  pending: {
    label: 'Pending',
    variant: 'warning',
    icon: <Clock className="w-3 h-3" />,
  },
  failed: {
    label: 'Failed',
    variant: 'error',
    icon: <XCircle className="w-3 h-3" />,
  },
  dns_missing: {
    label: 'DNS Missing',
    variant: 'info',
    icon: <Globe className="w-3 h-3" />,
  },
  suspended: {
    label: 'Suspended',
    variant: 'neutral',
    icon: <Ban className="w-3 h-3" />,
  },
};

export const StatusBadge = ({ status }: { status: string }) => {
  const config = STATUS_CONFIG[status as DomainStatus] || STATUS_CONFIG.pending;

  return (
    <Badge variant={config.variant} className="gap-1.5 py-1 px-2.5">
      {config.icon}
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
