import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DashboardStats {
  sent: number;
  delivered: number;
  bounced: number;
  failed: number;
  queued: number;
}

export interface EmailLog {
  _id: string;
  workspaceId: string;
  sender: string;
  recipient: string;
  subject: string;
  status:
    | 'queued'
    | 'processing'
    | 'accepted'
    | 'sent'
    | 'delivered'
    | 'deferred'
    | 'bounced'
    | 'complained'
    | 'failed';
  retryCount: number;
  messageId: string;
  processingTimeMs?: number;
  smtpResponse?: string;
  errorReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Domain {
  _id: string;
  name: string;
  status: 'pending' | 'verified' | 'failed';
  dkimSelector: string;
  dmarcPolicy: 'none' | 'quarantine' | 'reject';
  mailServerHost: string;
  mailServerIp: string;
  createdAt: string;
}

export interface SmtpCredential {
  _id: string;
  username?: string;
  smtpUsername?: string;
  description?: string;
  status: 'active' | 'disabled';
  lastUsedAt?: string;
  createdAt: string;
}

export interface ApiKeyEntry {
  _id: string;
  name: string;
  scopes: string[];
  status: 'active' | 'disabled' | 'revoked';
  createdAt: string;
}

export interface WebhookEntry {
  _id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  version: string;
  env: string;
  services?: { mongodb: { status: string; healthy: boolean } };
}

export interface DayBucket {
  sent: number;
  delivered: number;
  bounced: number;
  failed: number;
  queued: number;
  complained: number;
  retry: number;
}

// ─── Utility Functions ──────────────────────────────────────────────────────

/** Initialise last N days with zero counters. */
function initDayBuckets(days: number): Record<string, DayBucket> {
  const map: Record<string, DayBucket> = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    map[d.toISOString().slice(0, 10)] = {
      sent: 0,
      delivered: 0,
      bounced: 0,
      failed: 0,
      queued: 0,
      complained: 0,
      retry: 0,
    };
  }
  return map;
}

/** Group email logs into daily buckets for the last `days` days. */
export function groupLogsByDay(logs: EmailLog[], days: number): Record<string, DayBucket> {
  const buckets = initDayBuckets(days);
  logs.forEach((log) => {
    const key = log.createdAt.slice(0, 10);
    if (!buckets[key]) return;
    buckets[key].sent++;
    if (log.retryCount > 0) buckets[key].retry++;
    switch (log.status) {
      case 'delivered':
      case 'sent':
      case 'accepted':
        buckets[key].delivered++;
        break;
      case 'bounced':
        buckets[key].bounced++;
        break;
      case 'failed':
        buckets[key].failed++;
        break;
      case 'queued':
      case 'processing':
        buckets[key].queued++;
        break;
      case 'deferred':
        buckets[key].retry++;
        break;
      case 'complained':
        buckets[key].complained++;
        break;
      default:
        break;
    }
  });
  return buckets;
}

/** Compute overall deliverability score and letter grade. */
export function computeDeliverability(stats: DashboardStats): {
  score: number;
  grade: string;
} {
  const total = stats.sent + stats.delivered + stats.bounced + stats.failed;
  if (total === 0) return { score: 100, grade: 'A+' };

  const deliveryRate = (stats.delivered / total) * 100;
  const bouncePenalty = (stats.bounced / total) * 200;
  const failPenalty = (stats.failed / total) * 150;
  const score = Math.max(0, Math.min(100, deliveryRate - bouncePenalty - failPenalty));

  let grade = 'F';
  if (score >= 98) grade = 'A+';
  else if (score >= 95) grade = 'A';
  else if (score >= 90) grade = 'A-';
  else if (score >= 85) grade = 'B+';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';

  return { score: Math.round(score * 10) / 10, grade };
}

/** Derive bounce-rate severity color token. */
export function bounceRateSeverity(rate: number): 'success' | 'warning' | 'error' {
  if (rate < 2) return 'success';
  if (rate < 5) return 'warning';
  return 'error';
}

/** Derive complaint-rate severity color token. */
export function complaintRateSeverity(rate: number): 'success' | 'warning' | 'error' {
  if (rate < 0.1) return 'success';
  if (rate < 0.5) return 'warning';
  return 'error';
}

/** Average latency from email logs. */
export function avgLatency(logs: EmailLog[]): number {
  const withLatency = logs.filter((l) => l.processingTimeMs && l.processingTimeMs > 0);
  if (withLatency.length === 0) return 0;
  const sum = withLatency.reduce((acc, l) => acc + (l.processingTimeMs || 0), 0);
  return Math.round(sum / withLatency.length);
}

/** Derive an activity item from various data sources. */
export interface ActivityItem {
  id: string;
  type:
    | 'email_sent'
    | 'email_delivered'
    | 'email_bounced'
    | 'email_complaint'
    | 'email_failed'
    | 'domain_verified'
    | 'domain_pending'
    | 'domain_failed'
    | 'credential_created'
    | 'apikey_created'
    | 'webhook_added'
    | 'smtp_used';
  message: string;
  detail: string;
  timestamp: string;
}

/** Build a timeline from email logs + domain + credential data. */
export function buildActivityTimeline(
  logs: EmailLog[],
  domains: Domain[],
  credentials: SmtpCredential[],
  apiKeys: ApiKeyEntry[],
): ActivityItem[] {
  const items: ActivityItem[] = [];

  // Recent email events (max 20)
  logs.slice(0, 20).forEach((log) => {
    const ts = log.createdAt;
    switch (log.status) {
      case 'sent':
      case 'delivered':
      case 'accepted':
        items.push({
          id: log._id,
          type: log.status === 'delivered' ? 'email_delivered' : 'email_sent',
          message: `Email ${log.status === 'delivered' ? 'delivered' : 'sent'}`,
          detail: `To ${log.recipient} — "${log.subject}"`,
          timestamp: ts,
        });
        break;
      case 'bounced':
        items.push({
          id: log._id,
          type: 'email_bounced',
          message: 'Email bounced',
          detail: `${log.recipient} — ${log.errorReason || log.smtpResponse || 'No reason'}`,
          timestamp: ts,
        });
        break;
      case 'complained':
        items.push({
          id: log._id,
          type: 'email_complaint',
          message: 'Spam complaint',
          detail: `${log.recipient} reported "${log.subject}"`,
          timestamp: ts,
        });
        break;
      case 'failed':
        items.push({
          id: log._id,
          type: 'email_failed',
          message: 'Email failed',
          detail: `${log.recipient} — ${log.errorReason || 'Unknown error'}`,
          timestamp: ts,
        });
        break;
      default:
        break;
    }
  });

  // Domain events
  domains.forEach((d) => {
    items.push({
      id: `dom-${d._id}`,
      type:
        d.status === 'verified'
          ? 'domain_verified'
          : d.status === 'failed'
            ? 'domain_failed'
            : 'domain_pending',
      message: `Domain ${d.status === 'verified' ? 'verified' : d.status === 'failed' ? 'failed verification' : 'pending'}`,
      detail: d.name,
      timestamp: d.createdAt,
    });
  });

  // Credential events
  credentials.forEach((c) => {
    items.push({
      id: `cred-${c._id}`,
      type: 'credential_created',
      message: 'SMTP credential created',
      detail: c.description || c.username || 'SMTP key',
      timestamp: c.createdAt,
    });
  });

  // API key events
  apiKeys.forEach((k) => {
    items.push({
      id: `ak-${k._id}`,
      type: 'apikey_created',
      message: 'API key generated',
      detail: k.name,
      timestamp: k.createdAt,
    });
  });

  // Sort newest first
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, 50);
}

// ─── React Query Hooks ──────────────────────────────────────────────────────

export function useDashboardStats(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const res = await apiClient.get('/emails/stats');
      return res.data;
    },
    enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useEmailLogs(enabled: boolean) {
  return useQuery({
    queryKey: ['email-logs-all'],
    queryFn: async (): Promise<EmailLog[]> => {
      const res = await apiClient.get('/emails');
      return res.data;
    },
    enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useDomains(enabled: boolean) {
  return useQuery({
    queryKey: ['domains'],
    queryFn: async (): Promise<Domain[]> => {
      const res = await apiClient.get('/domains');
      return res.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useSmtpCredentials(enabled: boolean) {
  return useQuery({
    queryKey: ['credentials-smtp'],
    queryFn: async (): Promise<SmtpCredential[]> => {
      const res = await apiClient.get('/credentials/smtp');
      return res.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useApiKeys(enabled: boolean) {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async (): Promise<ApiKeyEntry[]> => {
      const res = await apiClient.get('/credentials/apikeys');
      return res.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useWebhooks(enabled: boolean) {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: async (): Promise<WebhookEntry[]> => {
      const res = await apiClient.get('/webhooks');
      return res.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useSystemHealth(enabled: boolean) {
  return useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthStatus> => {
      const res = await apiClient.get('/health');
      return res.data;
    },
    enabled,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}
