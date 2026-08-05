import { lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  useDashboardStats,
  useEmailLogs,
  useDomains,
  useSmtpCredentials,
  useApiKeys,
  useSystemHealth,
  groupLogsByDay,
  computeDeliverability,
  buildActivityTimeline,
} from '../hooks/useDashboardData';
import {
  buildDomainHealth,
  buildQueueSnapshot,
  buildInfrastructure,
  buildDeliverabilityFactors,
  buildNotifications,
} from '../hooks/useDashboardDerivations';
import {
  Section,
  WorkspaceHeader,
  KpiGrid,
  ActionCenter,
  DomainHealth,
  MailQueue,
  Infrastructure,
  DeliverabilityCenter,
  ActivityTimeline,
  RecentEmails,
  NotificationCenter,
  AiInsights,
  buildDeliveryChartData,
  ChartSkeleton,
} from '../components/dashboard';
import type { OverallHealth } from '../components/dashboard';
import { Globe, Server, ShieldCheck } from 'lucide-react';

// Lazy-load the heavy analytics chart so it doesn't block first paint.
const DeliveryAnalytics = lazy(() =>
  import('../components/dashboard/DeliveryAnalytics').then((m) => ({ default: m.DeliveryAnalytics })),
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const { activeWorkspace, loading: wsLoading } = useWorkspace();
  const enabled = !!activeWorkspace?.id && !wsLoading;

  // ── Queries ──────────────────────────────────────────────────────────────
  const statsQuery = useDashboardStats(enabled);
  const logsQuery = useEmailLogs(enabled);
  const domainsQuery = useDomains(enabled);
  const credsQuery = useSmtpCredentials(enabled);
  const apiKeysQuery = useApiKeys(enabled);
  const healthQuery = useSystemHealth(enabled);

  const stats = statsQuery.data;
  const logs = useMemo(() => logsQuery.data || [], [logsQuery.data]);
  const domains = useMemo(() => domainsQuery.data || [], [domainsQuery.data]);
  const credentials = useMemo(() => credsQuery.data || [], [credsQuery.data]);
  const apiKeys = useMemo(() => apiKeysQuery.data || [], [apiKeysQuery.data]);

  const loading = statsQuery.isLoading || logsQuery.isLoading || domainsQuery.isLoading;

  // ── Derived metrics ────────────────────────────────────────────────────────
  const totalProcessed =
    (stats?.sent || 0) + (stats?.delivered || 0) + (stats?.bounced || 0) + (stats?.failed || 0);
  const bounceRate = totalProcessed > 0 ? ((stats?.bounced || 0) / totalProcessed) * 100 : 0;
  const complaints = useMemo(() => logs.filter((l) => l.status === 'complained').length, [logs]);
  const complaintRate = totalProcessed > 0 ? (complaints / totalProcessed) * 100 : 0;

  const { score: delivScore, grade: delivGrade } = useMemo(
    () => computeDeliverability(stats || { sent: 0, delivered: 0, bounced: 0, failed: 0, queued: 0 }),
    [stats],
  );

  const chartData = useMemo(
    () => buildDeliveryChartData(groupLogsByDay(logs, 30)),
    [logs],
  );

  const domainRows = useMemo(() => buildDomainHealth(domains), [domains]);
  const queue = useMemo(() => buildQueueSnapshot(logs), [logs]);
  const services = useMemo(
    () => buildInfrastructure(healthQuery.data, queue),
    [healthQuery.data, queue],
  );
  const factors = useMemo(
    () => buildDeliverabilityFactors(domains, bounceRate, complaintRate),
    [domains, bounceRate, complaintRate],
  );
  const notifications = useMemo(
    () => buildNotifications(domains, logs, bounceRate, complaintRate, healthQuery.data),
    [domains, logs, bounceRate, complaintRate, healthQuery.data],
  );
  const activityItems = useMemo(
    () => buildActivityTimeline(logs, domains, credentials, apiKeys),
    [logs, domains, credentials, apiKeys],
  );

  // ── Overall workspace health ─────────────────────────────────────────────────
  const overallHealth: OverallHealth = useMemo(() => {
    if (healthQuery.data && healthQuery.data.status !== 'healthy') return 'down';
    if (bounceRate >= 5 || domains.some((d) => d.status === 'failed')) return 'degraded';
    return 'healthy';
  }, [healthQuery.data, bounceRate, domains]);

  const healthLabel =
    overallHealth === 'healthy'
      ? 'All systems operational'
      : overallHealth === 'degraded'
        ? 'Attention needed'
        : 'Service degraded';

  const goSend = () => navigate('/send-email');

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Section 1 — Workspace Header */}
      <WorkspaceHeader
        workspaceName={activeWorkspace?.name || 'Workspace'}
        plan={activeWorkspace?.plan || 'free'}
        health={overallHealth}
        healthLabel={healthLabel}
      />

      {/* Section 2 — Primary KPIs */}
      <KpiGrid stats={stats} logs={logs} domains={domains} loading={loading} />

      {/* Section 3 — Action Center */}
      <ActionCenter />

      {/* Section 4 — Domain Health */}
      <Section
        title="Domain Health"
        description="Authentication and delivery posture per sending domain"
        icon={<Globe className="h-5 w-5" />}
      >
        <DomainHealth rows={domainRows} loading={domainsQuery.isLoading} />
      </Section>

      {/* Section 5 — Delivery Analytics */}
      <Suspense fallback={<ChartSkeleton height={420} />}>
        <DeliveryAnalytics data={chartData} loading={loading} onSendTest={goSend} />
      </Suspense>

      {/* Section 6 + 11 — Mail Queue + Notifications */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <MailQueue queue={queue} loading={loading} />
        <NotificationCenter notifications={notifications} loading={loading} />
      </div>

      {/* Section 7 — Infrastructure */}
      <Section
        title="SMTP Infrastructure"
        description="Live status, latency and heartbeat across platform services"
        icon={<Server className="h-5 w-5" />}
      >
        <Infrastructure services={services} loading={healthQuery.isLoading} />
      </Section>

      {/* Section 8 — Deliverability Center */}
      <Section
        title="Deliverability Center"
        description="Authentication, reputation and transport security signals"
        icon={<ShieldCheck className="h-5 w-5" />}
      >
        <DeliverabilityCenter
          factors={factors}
          overallScore={delivScore}
          grade={delivGrade}
          loading={loading}
        />
      </Section>

      {/* Section 9 + 12 — Activity Timeline + AI Recommendations
          (both components render their own headers) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Section className="lg:col-span-1">
          <ActivityTimeline items={activityItems} loading={loading} />
        </Section>
        <Section className="lg:col-span-2">
          <AiInsights
            stats={stats}
            domains={domains}
            credentials={credentials}
            logs={logs}
            loading={loading}
          />
        </Section>
      </div>

      {/* Section 10 — Recent Emails (renders its own header) */}
      <Section>
        <RecentEmails logs={logs} loading={loading} />
      </Section>
    </div>
  );
};

export default Dashboard;
