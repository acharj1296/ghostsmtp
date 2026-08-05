import { Mail, ShieldCheck, KeyRound, ShieldAlert, TrendingUp, Undo2, Lock, Image, LockKeyhole, Server, AlertTriangle, Copy as CopyIcon } from 'lucide-react';
import { Button } from './ui/button';
import { CopyButton } from './domains/CopyButton';

interface DnsRecordCardProps {
  title: string;
  type: string;
  host: string;
  value: string;
  verified?: boolean;
  error?: string;
  ttl?: number | string;
  priority?: number | string;
  purpose?: string;
  description?: string;
  docsUrl?: string;
  onCopy: (text: string, label: string) => void;
  onVerify?: () => void;
  isVerifying?: boolean;
  extra?: { label: string; value: string }[];
}

interface RecordMeta {
  icon: React.ReactNode;
  color: string; // icon + accent color
  badge: string; // type label shown in the type badge
  description: string;
  docs: string;
}

const RECORD_META: Record<string, RecordMeta> = {
  MX: {
    icon: <Mail className="w-4 h-4" />,
    color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    badge: 'MX',
    description: 'Routes email to your mail server. Required for receiving mail.',
    docs: 'https://en.wikipedia.org/wiki/MX_record',
  },
  SPF: {
    icon: <ShieldCheck className="w-4 h-4" />,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    badge: 'SPF',
    description: 'Prevents spoofing by listing authorized senders. Improves deliverability.',
    docs: 'https://en.wikipedia.org/wiki/Sender_Policy_Framework',
  },
  DKIM: {
    icon: <KeyRound className="w-4 h-4" />,
    color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    badge: 'DKIM',
    description: 'Digitally signs your email with a private key so recipients can verify authenticity.',
    docs: 'https://en.wikipedia.org/wiki/DomainKeys_Identified_Mail',
  },
  DMARC: {
    icon: <ShieldAlert className="w-4 h-4" />,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    badge: 'DMARC',
    description: 'Tells receiving servers how to handle failed authentication. Completes SPF + DKIM.',
    docs: 'https://en.wikipedia.org/wiki/DMARC',
  },
  TRACKING: {
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    badge: 'CNAME',
    description: 'Used for open and click tracking in your emails.',
    docs: 'https://www.postmarkapp.com/',
  },
  BOUNCE: {
    icon: <Undo2 className="w-4 h-4" />,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    badge: 'CNAME',
    description: 'Handles bounced email (non-deliverable messages) at a dedicated subdomain.',
    docs: 'https://en.wikipedia.org/wiki/Variable_envelope_return_path',
  },
  'RETURN-PATH': {
    icon: <Undo2 className="w-4 h-4" />,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    badge: 'CNAME',
    description: 'Envelope return-path domain for bounce and VERP handling.',
    docs: 'https://en.wikipedia.org/wiki/Variable_envelope_return_path',
  },
  'MTA-STS': {
    icon: <Lock className="w-4 h-4" />,
    color: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
    badge: 'MTA-STS',
    description: 'Enforces TLS for inbound mail, protecting messages from downgrade attacks.',
    docs: 'https://tools.ietf.org/html/rfc8461',
  },
  'TLS-RPT': {
    icon: <LockKeyhole className="w-4 h-4" />,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    badge: 'TLS-RPT',
    description: 'Collects reports on TLS delivery problems to your mail server.',
    docs: 'https://tools.ietf.org/html/rfc8460',
  },
  BIMI: {
    icon: <Image className="w-4 h-4" />,
    color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
    badge: 'BIMI',
    description: 'Shows your brand logo next to authenticated email in supported clients.',
    docs: 'https://bimilookup.org/',
  },
  AUTODISCOVER: {
    icon: <Server className="w-4 h-4" />,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    badge: 'SRV',
    description: 'Lets Outlook automatically discover your mail server settings.',
    docs: 'https://en.wikipedia.org/wiki/Autodiscover',
  },
  AUTOCONFIG: {
    icon: <Server className="w-4 h-4" />,
    color: 'text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20',
    badge: 'CNAME',
    description: 'Lets email clients auto-configure your mail settings.',
    docs: 'https://wiki.mozilla.org/Autoconfiguration',
  },
  CAA: {
    icon: <LockKeyhole className="w-4 h-4" />,
    color: 'text-lime-500 bg-lime-500/10 border-lime-500/20',
    badge: 'CAA',
    description: 'Authorizes which certificate authorities can issue certificates for your domain.',
    docs: 'https://en.wikipedia.org/wiki/DNS_Certification_Authority_Authorization',
  },
};

const DEFAULT_META: RecordMeta = {
  icon: <CopyIcon className="w-4 h-4" />,
  color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
  badge: 'TXT',
  description: 'DNS record required for email configuration.',
  docs: 'https://en.wikipedia.org/wiki/Domain_Name_System',
};

const STATUS_CONFIG = {
  verified: {
    label: 'Verified',
    dot: 'bg-emerald-500',
    text: 'text-emerald-500',
    ring: 'border-emerald-500/30',
  },
  pending: {
    label: 'Pending',
    dot: 'bg-amber-500',
    text: 'text-amber-500',
    ring: 'border-amber-500/30',
  },
  missing: {
    label: 'Missing',
    dot: 'bg-slate-400',
    text: 'text-slate-400',
    ring: 'border-slate-400/30',
  },
} as const;

/**
 * Premium DNS record card. Renders the record the customer must publish (host +
 * value) entirely from the backend response — the frontend never synthesizes
 * DNS values. Long values render in a scrollable monospace code block so they
 * never break the layout.
 */
export const DnsRecordCard = ({
  title,
  type,
  host,
  value,
  verified,
  error,
  ttl,
  priority,
  purpose,
  description,
  docsUrl,
  onCopy,
  onVerify,
  isVerifying,
  extra = [],
}: DnsRecordCardProps) => {
  const meta = RECORD_META[title.toUpperCase()] || DEFAULT_META;
  const hasStatus = typeof verified === 'boolean';
  const statusKey = !hasStatus ? 'missing' : verified ? 'verified' : 'pending';
  const status = STATUS_CONFIG[statusKey];

  const fullRecord = [
    `Type: ${type}`,
    `Host: ${host}`,
    ...(priority !== undefined ? [`Priority: ${priority}`] : []),
    `Value: ${value}`,
  ].join('\n');

  const docsLink = docsUrl || meta.docs;

  return (
    <div
      className={`group rounded-xl border bg-white dark:bg-slate-900 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/40 dark:hover:shadow-slate-950/50 ${
        statusKey === 'verified' ? 'border-emerald-500/20' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${meta.color}`}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {meta.badge}
            </span>
          </div>
          {purpose && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{purpose}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {priority !== undefined && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              P:{priority}
            </span>
          )}
          {hasStatus && (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">Type</p>
            <p className="font-mono text-slate-700 dark:text-slate-300">{type}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">TTL</p>
            <p className="font-mono text-slate-700 dark:text-slate-300">{ttl !== undefined ? `${ttl}s` : 'Auto'}</p>
          </div>
          <div className="col-span-1 sm:col-span-2">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">Host</p>
            <p className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all">{host || '—'}</p>
          </div>
          {extra.map((e) => (
            <div key={e.label} className="col-span-1 sm:col-span-2">
              <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">{e.label}</p>
              <p className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all">{e.value}</p>
            </div>
          ))}
        </div>

        {/* Value — scrollable code block, never breaks layout */}
        <div>
          <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Value</p>
          <div className="relative">
            <pre className="rounded-lg bg-slate-950 border border-slate-800 p-3 pr-14 text-[11px] font-mono text-slate-200 whitespace-pre-wrap break-all max-h-44 overflow-y-auto leading-relaxed">
              {value || '—'}
            </pre>
            <CopyButton
              text={value}
              label=""
              onCopy={onCopy}
              className="absolute top-2 right-2 !px-2 !py-1 bg-slate-900/90 border-slate-700"
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {description || meta.description}
        </p>

        {error && !verified && (
          <p className="flex items-center gap-1.5 text-[11px] text-amber-500">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <CopyButton text={host || ''} label="Host" onCopy={onCopy} />
          <CopyButton text={value || ''} label="Value" onCopy={onCopy} />
          <CopyButton text={fullRecord} label="Record" onCopy={onCopy} />
          <a
            href={docsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            Learn More
            <span aria-hidden>↗</span>
          </a>
          {onVerify && (
            <Button size="sm" variant="outline" onClick={onVerify} isLoading={isVerifying} className="ml-auto">
              Verify
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DnsRecordCard;
