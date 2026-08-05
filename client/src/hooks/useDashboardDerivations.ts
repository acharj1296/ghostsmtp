// ─── Dashboard derivations ────────────────────────────────────────────────────
// Turns the raw API data (domains, logs, health, credentials) into the richer
// view-models the enterprise dashboard sections need. Where the backend does not
// expose a signal (per-domain auth pass-state, per-service latency, region), we
// derive a realistic, deterministic placeholder from stable inputs (domain id,
// name) so values are consistent across renders rather than random noise.

import type { Domain, EmailLog, HealthStatus } from './useDashboardData';

// ─── Deterministic pseudo-random ──────────────────────────────────────────────
// Stable hash so a given domain always yields the same placeholder metrics.
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295; // 0..1
}

function seeded(seed: string, min: number, max: number): number {
  return min + hashString(seed) * (max - min);
}

// ─── Domain health ─────────────────────────────────────────────────────────────

export type CheckState = 'pass' | 'warn' | 'fail';

export interface DomainHealthRow {
  id: string;
  name: string;
  status: Domain['status'];
  verification: CheckState;
  dns: CheckState;
  spf: CheckState;
  dkim: CheckState;
  dmarc: CheckState;
  tls: CheckState;
  deliverability: number; // 0-100
  dkimSelector: string;
  dmarcPolicy: Domain['dmarcPolicy'];
  mailServerHost: string;
  mailServerIp: string;
  createdAt: string;
}

/** Build per-domain health rows. Verified domains pass their auth checks;
 *  pending/failed domains surface realistic partial states. */
export function buildDomainHealth(domains: Domain[]): DomainHealthRow[] {
  return domains.map((d) => {
    const verified = d.status === 'verified';
    const failed = d.status === 'failed';
    const seed = hashString(d._id + d.name);

    const passIfVerified: CheckState = verified ? 'pass' : failed ? 'fail' : 'warn';
    // DMARC is the most commonly-missing record even on verified domains.
    const dmarc: CheckState = verified ? (seed > 0.7 ? 'warn' : 'pass') : failed ? 'fail' : 'warn';

    const deliverability = verified
      ? Math.round(seeded(d._id, 92, 99.5) * 10) / 10
      : failed
        ? Math.round(seeded(d._id, 40, 65) * 10) / 10
        : Math.round(seeded(d._id, 70, 85) * 10) / 10;

    return {
      id: d._id,
      name: d.name,
      status: d.status,
      verification: verified ? 'pass' : failed ? 'fail' : 'warn',
      dns: passIfVerified,
      spf: passIfVerified,
      dkim: passIfVerified,
      dmarc,
      tls: verified ? 'pass' : 'warn',
      deliverability,
      dkimSelector: d.dkimSelector,
      dmarcPolicy: d.dmarcPolicy,
      mailServerHost: d.mailServerHost,
      mailServerIp: d.mailServerIp,
      createdAt: d.createdAt,
    };
  });
}

// ─── Yesterday / today split ────────────────────────────────────────────────────

export interface DaySplit {
  today: number;
  yesterday: number;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Count logs matching a predicate for today vs yesterday for trend comparisons. */
export function splitTodayYesterday(
  logs: EmailLog[],
  predicate: (l: EmailLog) => boolean,
): DaySplit {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  let today = 0;
  let y = 0;
  logs.forEach((l) => {
    if (!predicate(l)) return;
    const d = new Date(l.createdAt);
    if (isSameDay(d, now)) today++;
    else if (isSameDay(d, yesterday)) y++;
  });
  return { today, yesterday: y };
}

// CONTINUE_DERIVATIONS

// ─── Mail queue ─────────────────────────────────────────────────────────────────

export interface QueueSnapshot {
  queued: number;
  processing: number;
  deferred: number;
  retry: number;
  completed: number;
  failed: number;
  inFlight: number;
}

/** Classify current logs into a live queue snapshot. */
export function buildQueueSnapshot(logs: EmailLog[]): QueueSnapshot {
  let queued = 0;
  let processing = 0;
  let deferred = 0;
  let retry = 0;
  let completed = 0;
  let failed = 0;

  logs.forEach((l) => {
    switch (l.status) {
      case 'queued':
        queued++;
        break;
      case 'processing':
        processing++;
        break;
      case 'deferred':
        deferred++;
        break;
      case 'sent':
      case 'accepted':
      case 'delivered':
        completed++;
        break;
      case 'bounced':
      case 'failed':
        failed++;
        break;
      default:
        break;
    }
    if (l.retryCount > 0 && (l.status === 'queued' || l.status === 'processing' || l.status === 'deferred')) {
      retry++;
    }
  });

  return {
    queued,
    processing,
    deferred,
    retry,
    completed,
    failed,
    inFlight: queued + processing + deferred,
  };
}

// ─── Infrastructure services ─────────────────────────────────────────────────────

export type ServiceState = 'operational' | 'degraded' | 'down';

export interface ServiceCard {
  key: string;
  name: string;
  category: string;
  state: ServiceState;
  latencyMs: number;
  lastHeartbeat: string; // ISO
}

/** Build the infra service cards. MongoDB + API derive from /health; the rest are
 *  realistic placeholders (the backend does not expose per-service telemetry). */
export function buildInfrastructure(
  health: HealthStatus | null | undefined,
  queue: QueueSnapshot,
): ServiceCard[] {
  const healthy = health?.status === 'healthy';
  const mongoHealthy = health?.services?.mongodb?.healthy ?? healthy;
  const nowIso = new Date().toISOString();

  const def = (
    key: string,
    name: string,
    category: string,
    state: ServiceState,
    latMin: number,
    latMax: number,
  ): ServiceCard => ({
    key,
    name,
    category,
    state,
    latencyMs: Math.round(seeded(key, latMin, latMax)),
    lastHeartbeat: nowIso,
  });

  // Queue backlog nudges the queue/worker cards to "degraded" when large.
  const queuePressure: ServiceState = queue.inFlight > 500 ? 'degraded' : 'operational';

  return [
    def('smtp', 'SMTP Server', 'Ingress', healthy ? 'operational' : 'degraded', 8, 22),
    def('postfix', 'Postfix MTA', 'Delivery', 'operational', 10, 28),
    def('rspamd', 'Rspamd', 'Filtering', 'operational', 12, 40),
    def('redis', 'Redis', 'Cache', 'operational', 1, 4),
    {
      ...def('mongodb', 'MongoDB', 'Database', mongoHealthy ? 'operational' : 'down', 3, 9),
    },
    def('queue', 'Queue', 'Pipeline', queuePressure, 5, 18),
    def('webhook', 'Webhook Relay', 'Integrations', 'operational', 20, 60),
    {
      ...def('api', 'REST API', 'Ingress', healthy ? 'operational' : 'down', 15, 45),
    },
    def('worker', 'Delivery Worker', 'Pipeline', queuePressure, 6, 20),
  ];
}

// ─── Deliverability factors (10) ────────────────────────────────────────────────

export interface DeliverabilityFactor {
  key: string;
  label: string;
  value: number; // 0-100
  status: 'ok' | 'warning' | 'error';
  hint: string;
}

/** Ten-factor deliverability center. Auth factors track verified-domain coverage;
 *  advanced factors (BIMI, MTA-STS, TLS-RPT) are realistic partial-adoption states. */
export function buildDeliverabilityFactors(
  domains: Domain[],
  bounceRate: number,
  complaintRate: number,
): DeliverabilityFactor[] {
  const verified = domains.filter((d) => d.status === 'verified').length;
  const total = domains.length || 1;
  const coverage = verified / total; // 0..1
  const hasVerified = verified > 0;

  const cov = (base: number) => Math.round(base * coverage);
  const st = (v: number): DeliverabilityFactor['status'] =>
    v >= 80 ? 'ok' : v >= 50 ? 'warning' : 'error';

  const inbox = Math.round(
    Math.max(0, Math.min(100, 92 - bounceRate * 3 - complaintRate * 20)) * coverage,
  );
  const spam = Math.round(Math.max(0, Math.min(100, 6 + bounceRate + complaintRate * 10)));

  const factors: Array<Omit<DeliverabilityFactor, 'status'>> = [
    { key: 'inbox', label: 'Inbox Placement', value: inbox, hint: 'Estimated inbox vs spam-folder rate' },
    { key: 'spam', label: 'Spam Score', value: 100 - spam, hint: 'Lower spam signature is better' },
    { key: 'spf', label: 'SPF', value: cov(98), hint: 'Sender Policy Framework alignment' },
    { key: 'dkim', label: 'DKIM', value: cov(97), hint: 'DomainKeys signature coverage' },
    { key: 'dmarc', label: 'DMARC', value: cov(88), hint: 'Domain-based policy enforcement' },
    { key: 'ptr', label: 'Reverse DNS', value: hasVerified ? 96 : 40, hint: 'PTR record for sending IP' },
    { key: 'bimi', label: 'BIMI', value: cov(45), hint: 'Brand indicators for message identification' },
    { key: 'tls', label: 'TLS', value: hasVerified ? 99 : 60, hint: 'Opportunistic + enforced TLS' },
    { key: 'mtasts', label: 'MTA-STS', value: cov(72), hint: 'SMTP MTA Strict Transport Security' },
    { key: 'tlsrpt', label: 'TLS-RPT', value: cov(64), hint: 'TLS reporting endpoint configured' },
  ];

  return factors.map((f) => ({ ...f, status: st(f.value) }));
}

// CONTINUE_NOTIFICATIONS

// ─── Notifications ───────────────────────────────────────────────────────────────

export type NoteLevel = 'error' | 'warning' | 'info' | 'success';

export interface DashboardNotification {
  id: string;
  level: NoteLevel;
  title: string;
  message: string;
  timestamp: string;
}

/** Derive grouped notifications from real workspace signals. */
export function buildNotifications(
  domains: Domain[],
  logs: EmailLog[],
  bounceRate: number,
  complaintRate: number,
  health: HealthStatus | null | undefined,
): DashboardNotification[] {
  const notes: DashboardNotification[] = [];
  const now = new Date().toISOString();

  const pending = domains.filter((d) => d.status === 'pending');
  const failedDomains = domains.filter((d) => d.status === 'failed');
  const verified = domains.filter((d) => d.status === 'verified');

  if (failedDomains.length > 0) {
    notes.push({
      id: 'dom-failed',
      level: 'error',
      title: 'Domain verification failed',
      message: `${failedDomains.map((d) => d.name).join(', ')} failed DNS verification. Re-check records.`,
      timestamp: now,
    });
  }
  if (bounceRate >= 5) {
    notes.push({
      id: 'bounce-high',
      level: 'error',
      title: 'High bounce rate',
      message: `Bounce rate is ${bounceRate.toFixed(1)}% — above the 5% safe threshold.`,
      timestamp: now,
    });
  } else if (bounceRate >= 2) {
    notes.push({
      id: 'bounce-warn',
      level: 'warning',
      title: 'Elevated bounce rate',
      message: `Bounce rate is ${bounceRate.toFixed(1)}%. Consider list hygiene.`,
      timestamp: now,
    });
  }
  if (complaintRate >= 0.1) {
    notes.push({
      id: 'complaint',
      level: 'warning',
      title: 'Spam complaints detected',
      message: `Complaint rate is ${complaintRate.toFixed(2)}%. Keep it under 0.1%.`,
      timestamp: now,
    });
  }
  if (pending.length > 0) {
    notes.push({
      id: 'dom-pending',
      level: 'warning',
      title: 'Domains awaiting verification',
      message: `${pending.length} domain${pending.length > 1 ? 's' : ''} pending DNS propagation.`,
      timestamp: now,
    });
  }
  if (health && health.status !== 'healthy') {
    notes.push({
      id: 'health',
      level: 'error',
      title: 'Service degradation',
      message: 'One or more platform services are reporting unhealthy.',
      timestamp: now,
    });
  }
  if (verified.length > 0) {
    notes.push({
      id: 'dom-ok',
      level: 'success',
      title: 'Domains healthy',
      message: `${verified.length} domain${verified.length > 1 ? 's are' : ' is'} verified and ready to send.`,
      timestamp: now,
    });
  }
  if (logs.length > 0) {
    notes.push({
      id: 'sending-ok',
      level: 'info',
      title: 'Sending pipeline active',
      message: `${logs.length} messages processed in the current window.`,
      timestamp: now,
    });
  }

  return notes;
}

// ─── AI recommendations ──────────────────────────────────────────────────────────

export interface AiRecommendation {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  detail: string;
  action?: string;
}

/** Rule-based recommendation engine over the real workspace state. */
export function buildRecommendations(
  domains: Domain[],
  factors: DeliverabilityFactor[],
  bounceRate: number,
  hasCredentials: boolean,
): AiRecommendation[] {
  const recs: AiRecommendation[] = [];
  const byKey = (k: string) => factors.find((f) => f.key === k);

  if (domains.length === 0) {
    recs.push({
      id: 'add-domain',
      severity: 'critical',
      title: 'Add a sending domain',
      detail: 'You have no domains configured. Add and verify one to start sending authenticated mail.',
      action: 'Add Domain',
    });
  }

  const dmarc = byKey('dmarc');
  if (dmarc && dmarc.status !== 'ok') {
    recs.push({
      id: 'dmarc',
      severity: 'warning',
      title: 'DMARC policy incomplete',
      detail: 'Publish a DMARC record with at least p=none to unlock reporting and improve placement.',
      action: 'Verify DNS',
    });
  }

  const spf = byKey('spf');
  if (spf && spf.status === 'error') {
    recs.push({
      id: 'spf',
      severity: 'critical',
      title: 'SPF missing',
      detail: 'SPF is not aligned on all domains. Receivers may reject or spam-folder your mail.',
      action: 'Verify DNS',
    });
  }

  if (bounceRate >= 2) {
    recs.push({
      id: 'bounce',
      severity: bounceRate >= 5 ? 'critical' : 'warning',
      title: 'Bounce rate increased',
      detail: `Your bounce rate is ${bounceRate.toFixed(1)}%. Clean invalid recipients and enable double opt-in.`,
    });
  }

  const tls = byKey('tls');
  if (tls && tls.value < 90) {
    recs.push({
      id: 'tls',
      severity: 'info',
      title: 'TLS enforcement recommended',
      detail: 'Enforce TLS for outbound delivery to protect message confidentiality in transit.',
    });
  }

  const bimi = byKey('bimi');
  if (bimi && bimi.status !== 'ok') {
    recs.push({
      id: 'bimi',
      severity: 'info',
      title: 'Add BIMI for brand trust',
      detail: 'Publish a BIMI record to display your logo in supporting inboxes and boost recognition.',
    });
  }

  const ptr = byKey('ptr');
  if (ptr && ptr.value < 80) {
    recs.push({
      id: 'ptr',
      severity: 'warning',
      title: 'Reverse DNS missing',
      detail: 'Configure a PTR record for your sending IP — many receivers require it for inbox placement.',
    });
  }

  if (domains.some((d) => d.status === 'verified')) {
    recs.push({
      id: 'warmup',
      severity: 'info',
      title: 'Mailbox warm-up recommended',
      detail: 'Gradually ramp sending volume on new domains to build a positive sender reputation.',
    });
  }

  if (!hasCredentials) {
    recs.push({
      id: 'creds',
      severity: 'warning',
      title: 'No SMTP credentials',
      detail: 'Generate SMTP credentials to connect your application to the sending pipeline.',
      action: 'Generate SMTP Credentials',
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: 'all-good',
      severity: 'success',
      title: 'Everything looks healthy',
      detail: 'No configuration issues detected. Your sending setup follows best practices.',
    });
  }

  return recs;
}


