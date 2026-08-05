import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface DnsRecordCardProps {
  title: string;
  type: string;
  host: string;
  value: string;
  verified?: boolean;
  error?: string;
  onCopy: (text: string, label: string) => void;
  extra?: { label: string; value: string }[];
}

/**
 * A single DNS record row for the Domains page. Renders the record the customer
 * must publish (host + value) entirely from the backend response — the frontend
 * never synthesizes DNS values.
 */
export const DnsRecordCard = ({
  title,
  type,
  host,
  value,
  verified,
  error,
  onCopy,
  extra = [],
}: DnsRecordCardProps) => {
  const hasStatus = typeof verified === 'boolean';

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3">
      <div className="flex justify-between items-center gap-2">
        <h3 className="font-semibold text-sm">{title}</h3>
        {hasStatus && (
          <Badge variant={verified ? 'success' : 'warning'}>
            {verified ? 'Verified' : 'Pending'}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-400">Type</p>
          <p>{type}</p>
        </div>
        <div>
          <p className="text-slate-400">TTL</p>
          <p>Auto</p>
        </div>
        {extra.map((e) => (
          <div key={e.label} className={extra.length === 1 ? 'col-span-2' : undefined}>
            <p className="text-slate-400">{e.label}</p>
            <p className="font-mono">{e.value}</p>
          </div>
        ))}
        <div className={host ? 'col-span-2' : undefined}>
          <p className="text-slate-400 mb-2">Host</p>
          <p className="font-mono break-all">{host || '—'}</p>
        </div>
      </div>

      <div>
        <p className="text-slate-400 mb-2">Value</p>
        <pre className="rounded-lg bg-black p-3 text-xs font-mono whitespace-pre-wrap break-all">
          {value || '—'}
        </pre>
        {error && !verified && (
          <p className="mt-2 text-xs text-amber-400">{error}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCopy(host || '', `${title} Host`)}
          disabled={!host}
        >
          Copy Host
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCopy(value || '', `${title} Value`)}
          disabled={!value}
        >
          Copy Value
        </Button>
      </div>
    </div>
  );
};

export default DnsRecordCard;
