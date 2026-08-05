import { Fragment, ReactNode, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Globe,
  FileText,
  Shield,
  CheckCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Rocket,
  Zap,
  Cloud,
  Feather,
  Server,
  Clock,
  Activity,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  LayoutDashboard,
  Send,
  Plug,
  CloudCog,
  Sparkles,
  Info,
  CopyPlus,
  CheckCheck,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Notification } from '../ui/notification';
import { DnsRecordCard } from '../DnsRecordCard';

interface AddDomainWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  createMutation: {
    mutate: (
      name: string,
      options?: {
        onSuccess?: (data: any) => void;
        onError?: (error: any) => void;
      }
    ) => void;
    isPending: boolean;
  };
}

type NotifyType = 'success' | 'warning' | 'error' | 'info';

interface NotifyState {
  show: boolean;
  title: string;
  message: string;
  type: NotifyType;
}

interface DomainRecord {
  type: string;
  host: string;
  value: string;
  priority?: number | string;
  ttl?: number | string;
  purpose?: string;
}

interface DomainDetails {
  domain: any;
  dnsRecords: Record<string, DomainRecord>;
  verification: any;
}

interface VerifyResult {
  status: string;
  domain: any;
  verification: any;
  results: Array<{ record: string; label: string; verified: boolean; error?: string }>;
}

interface DnsProviderDef {
  id: string;
  name: string;
  tagline: string;
  supported: boolean;
  icon: ReactNode;
  accent: string;
}

const STEPS = [
  { label: 'Domain', icon: Globe },
  { label: 'DNS Records', icon: FileText },
  { label: 'Auto Setup', icon: Rocket },
  { label: 'Verify', icon: Shield },
  { label: 'Complete', icon: CheckCircle },
];

const DNS_PROVIDERS: DnsProviderDef[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    tagline: 'Automatic zone management',
    supported: true,
    icon: <Zap className="w-5 h-5" />,
    accent: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  },
  {
    id: 'route53',
    name: 'Route53',
    tagline: 'AWS DNS service',
    supported: true,
    icon: <Cloud className="w-5 h-5" />,
    accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'godaddy',
    name: 'GoDaddy',
    tagline: 'Registrar + DNS',
    supported: true,
    icon: <Globe className="w-5 h-5" />,
    accent: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  },
  {
    id: 'namecheap',
    name: 'Namecheap',
    tagline: 'Registrar + DNS',
    supported: true,
    icon: <Feather className="w-5 h-5" />,
    accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    tagline: 'Cloud DNS',
    supported: false,
    icon: <CloudCog className="w-5 h-5" />,
    accent: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'powerdns',
    name: 'PowerDNS',
    tagline: 'Self-hosted DNS',
    supported: false,
    icon: <Server className="w-5 h-5" />,
    accent: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
];

const RECORD_ORDER = ['mx', 'spf', 'dkim', 'dmarc', 'tracking', 'bounce', 'returnPath', 'mailFrom', 'autoconfig', 'autodiscover'];

const RECORD_PRESENTATION: Record<string, { title: string; description: string }> = {
  mx: { title: 'MX', description: 'Routes email to the GhostSMTP mail server. Required for delivery.' },
  spf: { title: 'SPF', description: 'Authorizes GhostSMTP to send on behalf of your domain and prevents spoofing.' },
  dkim: { title: 'DKIM', description: 'Digitally signs outgoing mail with a 2048-bit RSA key so recipients can verify authenticity.' },
  dmarc: { title: 'DMARC', description: 'Tells receiving servers how to handle unauthenticated mail. Complements SPF + DKIM.' },
  tracking: { title: 'Tracking', description: 'Enables open and click tracking on your emails.' },
  bounce: { title: 'Bounce', description: 'Handles bounced messages at a dedicated subdomain.' },
  returnPath: { title: 'Return-Path', description: 'Envelope return-path domain for bounce and VERP handling.' },
  mailFrom: { title: 'MAIL FROM', description: 'Envelope sender subdomain used for bounce and VERP handling.' },
  autoconfig: { title: 'Autoconfig', description: 'Lets email clients auto-configure your mail settings.' },
  autodiscover: { title: 'Autodiscover', description: 'Lets Outlook automatically discover your mail server settings.' },
};

const validateDomain = (value: string) => {
  const v = value.trim();
  if (!v) return '';
  if (v.includes(' ')) return 'Domain names cannot contain spaces.';
  if (/^https?:\/\//i.test(v)) return 'Enter the domain only, without a protocol (e.g. https://).';
  if (v.includes('/')) return 'Enter the domain only, without a path.';
  if (!/^(?=.{4,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(v)) {
    return 'Enter a valid domain name (e.g. example.com).';
  }
  return '';
};

export const AddDomainWizard = ({ isOpen, onClose, onSuccess, createMutation }: AddDomainWizardProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [domainName, setDomainName] = useState('');
  const [domainError, setDomainError] = useState('');
  const [createdDomainId, setCreatedDomainId] = useState<string | null>(null);
  const [createdDomain, setCreatedDomain] = useState<any>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [autoProvider, setAutoProvider] = useState<string | null>(null);
  const [notify, setNotify] = useState<NotifyState>({ show: false, title: '', message: '', type: 'info' });

  const showToast = (title: string, message: string, type: NotifyType) => {
    setNotify({ show: true, title, message, type });
  };

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setDomainName('');
    setDomainError('');
    setCreatedDomainId(null);
    setCreatedDomain(null);
    setVerifyResult(null);
    setAutoProvider(null);
    setNotify({ show: false, title: '', message: '', type: 'info' });
  }, [isOpen]);

  const domainDetailsQuery = useQuery({
    queryKey: ['domain', createdDomainId],
    queryFn: async () => {
      if (!createdDomainId) return null;
      const res = await apiClient.get(`/domains/${createdDomainId}`);
      return res.data as DomainDetails;
    },
    enabled: isOpen && !!createdDomainId && step >= 1,
  });
  const domainDetails = domainDetailsQuery.data;

  const comprehensiveQuery = useQuery({
    queryKey: ['dns-comprehensive', createdDomainId],
    queryFn: async () => {
      const res = await apiClient.get(`/domains/${createdDomainId}/dns-comprehensive`);
      return res.data;
    },
    enabled: isOpen && !!createdDomainId && step === 3,
  });
  const comprehensive = comprehensiveQuery.data;

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/domains/${createdDomainId}/verify`);
      return res.data as VerifyResult;
    },
    onSuccess: (data) => {
      setVerifyResult(data);
      queryClient.invalidateQueries({ queryKey: ['domain', createdDomainId] });
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      const results = data.results || [];
      const verified = results.filter((r) => r.verified).length;
      if (data.status === 'verified') {
        showToast('Verified', 'All DNS records verified — your domain is ready to send.', 'success');
      } else if (data.status === 'failed') {
        showToast('In Progress', `${verified}/${results.length} records verified. DNS may still be propagating.`, 'warning');
      } else {
        showToast('Pending', 'DNS records have not propagated yet.', 'info');
      }
    },
    onError: (err: any) => {
      showToast('Verification Failed', err?.response?.data?.error || 'Verification lookup failed.', 'error');
    },
  });

  const autoSetupMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const res = await apiClient.post(`/domains/${createdDomainId}/dns-provider/auto-setup`, { providerType: providerId });
      return res.data;
    },
    onSuccess: () => {
      const name = DNS_PROVIDERS.find((p) => p.id === autoProvider)?.name || autoProvider || '';
      showToast('Setup Submitted', `DNS records pushed to ${name}. Run verification once they propagate.`, 'success');
    },
    onError: (err: any) => {
      showToast(
        'Setup Failed',
        err?.response?.data?.error || 'Provider setup failed. Connect your API credentials or configure records manually.',
        'error'
      );
    },
  });

  const busy =
    createMutation.isPending ||
    verifyMutation.isPending ||
    autoSetupMutation.isPending ||
    domainDetailsQuery.isLoading ||
    comprehensiveQuery.isLoading;

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, busy, onClose]);

  const handleCopy = async (text: string, label: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied', `${label || 'Value'} copied to clipboard.`, 'success');
    } catch {
      showToast('Error', `Failed to copy ${label || 'value'}.`, 'error');
    }
  };

  const handleCreate = () => {
    const err = validateDomain(domainName);
    if (err) {
      setDomainError(err);
      return;
    }
    createMutation.mutate(domainName.trim(), {
      onSuccess: (data: any) => {
        const id = data?.domain?._id || data?.domain?.id;
        if (!id) {
          showToast('Error', 'Domain created but no ID was returned.', 'error');
          return;
        }
        setCreatedDomainId(id);
        setCreatedDomain(data.domain || null);
        setStep(1);
      },
      onError: (error: any) => {
        showToast('Error', error?.response?.data?.error || 'Failed to create domain.', 'error');
      },
    });
  };

  const domainValid = domainName.trim().length > 0 && !validateDomain(domainName);

  const recordCards = useMemo(() => {
    const dns = domainDetails?.dnsRecords;
    if (!dns) return [];
    const items: Array<{ key: string; title: string; description: string; record: DomainRecord; verified?: boolean }> = [];
    RECORD_ORDER.forEach((key) => {
      const record = dns[key];
      if (!record || !record.value) return;
      const meta = RECORD_PRESENTATION[key];
      items.push({
        key,
        title: meta?.title || key,
        description: meta?.description || '',
        record,
        verified: domainDetails?.verification?.[`${key}Verified`],
      });
    });
    return items;
  }, [domainDetails]);

  const copyAllRecords = () => {
    if (!domainDetails?.dnsRecords) return;
    const lines = [`DNS Records for ${createdDomain?.name || domainName}`, ''];
    Object.entries(domainDetails.dnsRecords).forEach(([, r]: [string, any]) => {
      if (!r?.value) return;
      lines.push(`${r.type}  ${r.host || '@'}  ${r.value}`);
    });
    handleCopy(lines.join('\n'), 'All DNS Records');
  };

  const handleAutoSetup = (provider: DnsProviderDef) => {
    if (!createdDomainId) return;
    setAutoProvider(provider.id);
    autoSetupMutation.mutate(provider.id);
  };

  const handleVerify = () => {
    if (!createdDomainId || verifyMutation.isPending) return;
    verifyMutation.mutate();
  };

  const verification = verifyResult?.verification || comprehensive?.verification || domainDetails?.verification;

  const { verifiedCount, totalVerificationFlags } = useMemo(() => {
    if (!verification) return { verifiedCount: 0, totalVerificationFlags: 0 };
    const keys = Object.keys(verification).filter((k) => k.endsWith('Verified'));
    return {
      verifiedCount: keys.filter((k) => verification[k] === true).length,
      totalVerificationFlags: keys.length,
    };
  }, [verification]);

  const health = comprehensive?.health;
  const propagation = comprehensive?.propagation;
  const resultsList = verifyResult?.results || [];
  const domain = createdDomain || domainDetails?.domain;

  const smtp = {
    host: `smtp.${domainName}`,
    port: '587',
    username: `postmaster@${domainName}`,
    password: '••••••••',
    selector: domain?.dkimSelector || 'ghost',
    mailServer: domain?.mailServerHost || '—',
  };

  const copySmtpCredentials = () => {
    handleCopy(
      [
        `SMTP Host: ${smtp.host}`,
        `SMTP Port: ${smtp.port}`,
        `Username: ${smtp.username}`,
        `Password: <your SMTP password>`,
        `DKIM Selector: ${smtp.selector}`,
        `Mail Server: ${smtp.mailServer}`,
      ].join('\n'),
      'SMTP Credentials'
    );
  };

  const checklist = [
    {
      icon: Activity,
      label: 'DNS Health',
      value: health ? `${health.score}/100` : '—',
      percent: health?.score ?? 0,
      note: health ? `CPT Grade ${health.grade || '—'}` : 'Run verification to analyze',
      ready: !!health,
    },
    {
      icon: Globe,
      label: 'Propagation Status',
      value: propagation ? `${propagation.overallPropagationPercentage}%` : '—',
      percent: propagation?.overallPropagationPercentage ?? 0,
      note: 'Across global resolvers',
      ready: !!propagation,
    },
    {
      icon: Shield,
      label: 'Records Verified',
      value: totalVerificationFlags ? `${verifiedCount}/${totalVerificationFlags}` : '—',
      percent: totalVerificationFlags ? (verifiedCount / totalVerificationFlags) * 100 : 0,
      note: verifyResult ? 'Checked against live DNS' : 'Not checked yet',
      ready: !!verifyResult,
    },
    {
      icon: Clock,
      label: 'Estimated Propagation Time',
      value: '5–30 min',
      percent: 100,
      note: 'Up to 72 hours in rare cases',
      ready: true,
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={handleClose} />

      {/* Panel — wrapped in `dark` so every inner component renders in dark mode regardless of app theme */}
      <div
        className="dark relative flex w-full max-w-[min(1080px,90vw)] max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[20px] border border-slate-700/60 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)] animate-modal-in"
        role="dialog"
        aria-modal="true"
        aria-label="Add Sending Domain"
      >
        {/* Header */}
        <div className="flex-none px-6 sm:px-8 pt-6 pb-5 border-b border-slate-800/80">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-brand-400 text-[11px] font-semibold uppercase tracking-[0.2em]">
                <Sparkles className="w-3.5 h-3.5" />
                GhostSMTP Onboarding
              </div>
              <h2 className="text-2xl font-bold text-white mt-1.5">Add Sending Domain</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={busy}
              aria-label="Close"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="mt-6 flex items-center">
            {STEPS.map((s, i) => (
              <Fragment key={s.label}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                      i <= step
                        ? 'bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg shadow-brand-500/30 ring-4 ring-brand-500/20'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {i < step ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`text-xs font-semibold hidden md:block ${i <= step ? 'text-white' : 'text-slate-500'}`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 md:mx-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500 ease-out"
                      style={{ width: i < step ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-5 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 via-violet-500 to-emerald-500 transition-all duration-700 ease-out"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-7">
          <div key={step} className="animate-step-in">
            {/* STEP 0 — DOMAIN */}
            {step === 0 && (
              <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-lg shadow-brand-500/30 animate-glow-pulse">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-white mt-6">Add Sending Domain</h3>
                <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                  Connect your domain to GhostSMTP and we&apos;ll generate all required DNS records.
                </p>

                <div className="mt-8 text-left">
                  <Input
                    label="Domain Name"
                    placeholder="example.com"
                    value={domainName}
                    autoFocus
                    onChange={(e) => {
                      setDomainName(e.target.value);
                      setDomainError(validateDomain(e.target.value));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && domainValid && !createMutation.isPending) handleCreate();
                    }}
                    error={domainError || undefined}
                    className="!bg-slate-950/60 !border-slate-700 !text-slate-100 focus:!ring-brand-500 placeholder:!text-slate-600"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-500" /> Real domain only
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-500" /> No protocol
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-500" /> No spaces
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1 — DNS RECORDS */}
            {step === 1 && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-brand-400" /> Configure DNS Records
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Add these records to{' '}
                      <span className="font-mono text-slate-200">{createdDomain?.name || domainName}</span> in your
                      DNS provider to start sending.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={copyAllRecords} className="text-slate-300">
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy All
                  </Button>
                </div>

                {domainDetailsQuery.isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                    Generating DNS records...
                  </div>
                ) : recordCards.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <AlertTriangle className="w-8 h-8 opacity-60" />
                    <p className="text-sm">No DNS records are available for this domain yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {recordCards.map((c) => (
                      <DnsRecordCard
                        key={c.key}
                        title={c.title}
                        type={c.record.type}
                        host={c.record.host}
                        value={c.record.value}
                        ttl={c.record.ttl ?? 3600}
                        priority={c.record.priority}
                        purpose={c.record.purpose || (c.key === 'dkim' ? '2048-bit RSA key' : undefined)}
                        description={c.description}
                        verified={typeof c.verified === 'boolean' ? c.verified : undefined}
                        onCopy={handleCopy}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-6 flex items-start gap-3 rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3">
                  <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    These records are auto-generated for your domain and mail infrastructure. Large values like DKIM are
                    safe to copy in full — they belong inside the DNS value field.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 2 — AUTOMATIC SETUP */}
            {step === 2 && (
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-brand-400" /> Automatic Setup
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Connect your DNS provider to push these records automatically — no copy/paste required.
                </p>

                <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <Info className="w-4 h-4 text-brand-400 flex-shrink-0" />
                  <p className="text-xs text-slate-400">
                    We couldn&apos;t auto-detect your DNS provider. Select it below for one-click setup, or add the
                    records manually from the previous step.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {DNS_PROVIDERS.map((p) => (
                    <div
                      key={p.id}
                      className={`rounded-2xl border bg-slate-900/70 p-4 flex flex-col transition-all duration-200 ${
                        p.supported ? 'border-slate-700 hover:border-brand-500/40' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${p.accent}`}>
                          {p.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{p.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{p.tagline}</p>
                        </div>
                        {p.supported && (
                          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-1.5 py-0.5 flex-shrink-0">
                            <Plug className="w-2.5 h-2.5" /> API
                          </span>
                        )}
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
                        {p.supported ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs text-slate-300"
                              onClick={() => handleAutoSetup(p)}
                              isLoading={autoSetupMutation.isPending && autoProvider === p.id}
                            >
                              <Plug className="w-3 h-3 mr-1" /> Connect API
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              className="flex-1 text-xs"
                              onClick={() => handleAutoSetup(p)}
                              disabled={autoSetupMutation.isPending}
                            >
                              <Zap className="w-3 h-3 mr-1" /> One-click Setup
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full text-xs text-slate-300"
                            onClick={() => setStep(1)}
                          >
                            <FileText className="w-3 h-3 mr-1" /> Manual Setup
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3 — VERIFY */}
            {step === 3 && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-brand-400" /> Verify Your Domain
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Confirm your DNS records are live and your domain is ready to send.
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-lg px-2.5 py-1 border ${
                      verifyMutation.isPending
                        ? 'text-brand-400 bg-brand-500/10 border-brand-500/20'
                        : verifyResult
                          ? verifyResult.status === 'verified'
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : verifyResult.status === 'failed'
                              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                              : 'text-sky-400 bg-sky-500/10 border-sky-500/20'
                          : 'text-slate-400 bg-slate-800/60 border-slate-700'
                    }`}
                  >
                    {verifyMutation.isPending ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Checking DNS...
                      </>
                    ) : verifyResult ? (
                      <>
                        <CheckCircle className="w-3 h-3" /> {verifyResult.status}
                      </>
                    ) : (
                      <>
                        <Info className="w-3 h-3" /> Not checked yet
                      </>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {checklist.map((c) => (
                    <div key={c.label} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            c.ready ? 'bg-brand-500/10 text-brand-400' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          <c.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{c.label}</p>
                          <p className="text-xs text-slate-500 truncate">{c.note}</p>
                        </div>
                        <span className="ml-auto text-sm font-bold font-mono text-white">{c.value}</span>
                      </div>
                      <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            c.percent >= 100 ? 'bg-emerald-500' : c.percent >= 50 ? 'bg-brand-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, c.percent)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {resultsList.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-brand-400" />
                      <h4 className="text-sm font-semibold text-white">Record Check Results</h4>
                    </div>
                    <div className="divide-y divide-slate-800/70">
                      {resultsList.map((r, idx) => (
                        <div key={idx} className="px-4 py-2.5 flex items-center gap-3">
                          {r.verified ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          )}
                          <span className="text-sm text-slate-300 font-medium flex-1 truncate">{r.label}</span>
                          <span className="text-[11px] font-mono text-slate-500 truncate hidden sm:block">{r.record}</span>
                          <span className={`text-[11px] font-semibold ${r.verified ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {r.verified ? 'Verified' : r.error || 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    DNS changes can take up to 72 hours to fully propagate. If records aren&apos;t detected yet, wait a
                    few minutes and run Verify again.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 4 — COMPLETE */}
            {step === 4 && (
              <div className="mx-auto max-w-2xl">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-glow-pulse">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mt-5">You&apos;re all set!</h3>
                  <p className="text-sm text-slate-400 mt-1.5">
                    <span className="font-mono text-slate-200">{domainName}</span> is ready to send email through
                    GhostSMTP.
                  </p>
                </div>

                <div className="mt-7 rounded-2xl border border-slate-800 bg-slate-950/50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-brand-400" /> SMTP Credentials
                    </h4>
                    <Button variant="outline" size="sm" onClick={copySmtpCredentials} className="text-xs text-slate-300">
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy SMTP Credentials
                    </Button>
                  </div>
                  <div className="divide-y divide-slate-800/70">
                    {[
                      { label: 'SMTP Host', value: smtp.host, icon: Server },
                      { label: 'SMTP Port', value: smtp.port, icon: Zap },
                      { label: 'Username', value: smtp.username, icon: Globe },
                      { label: 'Password', value: smtp.password, icon: Shield },
                      { label: 'DKIM Selector', value: smtp.selector, icon: FileText },
                      { label: 'Mail Server', value: smtp.mailServer, icon: Cloud },
                    ].map((row) => (
                      <div key={row.label} className="px-4 py-2.5 flex items-center gap-3">
                        <row.icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="text-xs text-slate-500 w-28 flex-shrink-0">{row.label}</span>
                        <span className="text-sm font-mono text-slate-200 flex-1 truncate">{row.value}</span>
                        <button
                          onClick={() => handleCopy(row.value, row.label)}
                          className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
                          aria-label={`Copy ${row.label}`}
                        >
                          <CopyPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <CheckCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Use these credentials in your app or email client to send through GhostSMTP.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none border-t border-slate-800 px-6 sm:px-8 py-4 flex items-center justify-between gap-3">
          <div>
            {step > 0 && step < 4 && (
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                disabled={busy}
                className="text-slate-300 hover:bg-slate-800"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {step === 0 && (
              <>
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  disabled={busy}
                  className="text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleCreate} isLoading={createMutation.isPending} disabled={!domainValid}>
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            )}
            {step === 1 && (
              <Button variant="primary" onClick={() => setStep(2)} disabled={busy}>
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {step === 2 && (
              <Button variant="primary" onClick={() => setStep(3)} disabled={busy}>
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleVerify}
                  isLoading={verifyMutation.isPending}
                  className="text-slate-200"
                >
                  <Shield className="w-4 h-4 mr-1.5" /> Verify DNS
                </Button>
                <Button variant="ghost" onClick={handleVerify} disabled={verifyMutation.isPending} className="text-slate-300">
                  <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                </Button>
                <Button variant="primary" onClick={() => setStep(4)} disabled={busy}>
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            )}
            {step === 4 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigate('/send-email');
                    onClose();
                  }}
                  className="text-slate-200"
                >
                  <Send className="w-4 h-4 mr-1.5" /> Send Test Email
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    navigate('/dashboard');
                    onSuccess();
                  }}
                >
                  <LayoutDashboard className="w-4 h-4 mr-1.5" /> Go to Dashboard
                </Button>
              </>
            )}
          </div>
        </div>

        <Notification
          show={notify.show}
          title={notify.title}
          message={notify.message}
          type={notify.type}
          onClose={() => setNotify((n) => ({ ...n, show: false }))}
        />
      </div>
    </div>
  );
};

export default AddDomainWizard;
