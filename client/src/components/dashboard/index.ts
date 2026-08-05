// ─── Dashboard Component Barrel ──────────────────────────────────────────────

// Shared primitives
export { Section } from './Section';
export { EmptyState } from './EmptyState';

// Section components
export { WorkspaceHeader } from './WorkspaceHeader';
export type { OverallHealth } from './WorkspaceHeader';
export { KpiGrid } from './KpiGrid';
export { KpiCard } from './KpiCard';
export { ActionCenter } from './ActionCenter';
export { DomainHealth } from './DomainHealth';
export { DeliveryAnalytics } from './DeliveryAnalytics';
export { DeliveryChart, buildDeliveryChartData, DELIVERY_SERIES } from './DeliveryChart';
export { MailQueue } from './MailQueue';
export { Infrastructure } from './Infrastructure';
export { DeliverabilityCenter } from './DeliverabilityCenter';
export { ActivityTimeline } from './ActivityTimeline';
export { RecentEmails } from './RecentEmails';
export { NotificationCenter } from './NotificationCenter';
export { AiInsights } from './AiInsights';

// Skeletons
export { KpiSkeleton, ChartSkeleton, TableSkeleton, SkeletonPulse } from './Skeleton';
