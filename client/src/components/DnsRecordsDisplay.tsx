import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Copy, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface DnsRecordsDisplayProps {
  records: any[];
  healthScore?: number;
  propagationPercentage?: number;
  deliverabilityStatus?: string;
  onCopy: (text: string, label: string) => void;
}

export const DnsRecordsDisplay = ({
  records,
  healthScore,
  propagationPercentage,
  deliverabilityStatus,
  onCopy,
}: DnsRecordsDisplayProps) => {
  const getStatusIcon = (verified: boolean) => {
    if (verified) {
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    }
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const getStatusBadge = (verified: boolean) => {
    return (
      <Badge variant={verified ? 'success' : 'warning'}>
        {verified ? 'Verified' : 'Pending'}
      </Badge>
    );
  };

  const getPropagationColor = (percentage: number) => {
    if (percentage === 100) return 'bg-emerald-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getHealthGrade = (score: number) => {
    if (score >= 90) return { grade: 'A', color: 'text-emerald-500' };
    if (score >= 80) return { grade: 'B', color: 'text-blue-500' };
    if (score >= 70) return { grade: 'C', color: 'text-amber-500' };
    if (score >= 60) return { grade: 'D', color: 'text-rose-500' };
    return { grade: 'F', color: 'text-red-500' };
  };

  const getDeliverabilityColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200';
      case 'good':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-200';
      case 'needs_improvement':
        return 'bg-amber-500/20 border-amber-500/50 text-amber-200';
      case 'critical':
        return 'bg-rose-500/20 border-rose-500/50 text-rose-200';
      default:
        return 'bg-slate-500/20 border-slate-500/50 text-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      {(healthScore !== undefined || propagationPercentage !== undefined || deliverabilityStatus) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {healthScore !== undefined && (
            <div className="border border-slate-700 bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">DNS Health Score</p>
                  <p className="text-2xl font-bold mt-1">{healthScore}</p>
                </div>
                <div className={`text-3xl font-bold ${getHealthGrade(healthScore).color}`}>
                  {getHealthGrade(healthScore).grade}
                </div>
              </div>
            </div>
          )}

          {propagationPercentage !== undefined && (
            <div className="border border-slate-700 bg-slate-900/50 rounded-lg p-4">
              <div>
                <p className="text-slate-400 text-sm">DNS Propagation</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold">{propagationPercentage}%</p>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getPropagationColor(propagationPercentage)}`}
                      style={{ width: `${propagationPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {deliverabilityStatus && (
            <div className={`border rounded-lg p-4 ${getDeliverabilityColor(deliverabilityStatus)}`}>
              <p className="text-slate-300 text-sm mb-2">Deliverability</p>
              <div className="flex items-center gap-2">
                {deliverabilityStatus === 'excellent' && (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                )}
                {deliverabilityStatus === 'critical' && (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                )}
                <p className="font-semibold capitalize">{deliverabilityStatus.replace('_', ' ')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DNS Records Table */}
      <div className="border border-slate-700 bg-slate-900/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Host</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Priority</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">TTL</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Value (Preview)</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => (
                <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <Badge variant="outline">{record.type}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{record.host || '@'}</td>
                  <td className="px-4 py-3 text-center">{record.priority || '—'}</td>
                  <td className="px-4 py-3">{record.ttl || 3600}s</td>
                  <td className="px-4 py-3 max-w-xs">
                    <code className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 truncate block">
                      {record.value?.substring(0, 50)}
                      {record.value && record.value.length > 50 ? '...' : ''}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(record.verified)}
                      {getStatusBadge(record.verified)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => onCopy(record.host || '@', `${record.type} Host`)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => onCopy(record.value, `${record.type} Value`)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {records.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No DNS records available</p>
        </div>
      )}
    </div>
  );
};

export default DnsRecordsDisplay;
