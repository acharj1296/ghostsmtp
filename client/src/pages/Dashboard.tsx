import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { TrendingUp, Globe, ShieldAlert, RefreshCw } from 'lucide-react';

export const Dashboard = () => {
  const { activeWorkspace } = useWorkspace();

  // Queries
  const { data: stats = { sent: 0, delivered: 0, bounced: 0, failed: 0, queued: 0 }, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats', activeWorkspace?.id],
    queryFn: async () => {
      const res = await apiClient.get('/emails/stats');
      return res.data;
    },
    enabled: !!activeWorkspace?.id,
  });

  const { data: domains = [], isLoading: isDomainsLoading } = useQuery({
    queryKey: ['domains', activeWorkspace?.id],
    queryFn: async () => {
      const res = await apiClient.get('/domains');
      return res.data;
    },
    enabled: !!activeWorkspace?.id,
  });

  const { data: recentLogs = [], isLoading: isLogsLoading } = useQuery({
    queryKey: ['email-logs-recent', activeWorkspace?.id],
    queryFn: async () => {
      const res = await apiClient.get('/emails');
      return res.data.slice(0, 5); // display only top 5 recent logs
    },
    enabled: !!activeWorkspace?.id,
  });

  const verifiedDomainsCount = domains.filter((d: any) => d.status === 'verified').length;
  
  // Calculate Bounce Rate %
  const totalSent = stats.sent || 0;
  const totalBounced = stats.bounced || 0;
  const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(2) : '0.00';

  const handleRefreshAll = () => {
    refetchStats();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Workspace Overview</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Active Workspace: <span className="font-semibold text-brand-600 dark:text-brand-400">{activeWorkspace?.name || 'Default Workspace'}</span>
          </p>
        </div>
        <Button variant="outline" onClick={handleRefreshAll} className="flex items-center gap-2 self-start sm:self-auto">
          <RefreshCw className="w-4 h-4" />
          Refresh Stats
        </Button>
      </div>

      {/* Grid items */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Sent Volume</CardTitle>
              <CardDescription>All outbound messages</CardDescription>
            </div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.sent}</div>
                <span className="text-xs text-slate-400 mt-1 block">Queue Status: {stats.queued} sending</span>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Active Domains</CardTitle>
              <CardDescription>Verified sending hosts</CardDescription>
            </div>
            <Globe className="w-5 h-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            {isDomainsLoading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{verifiedDomainsCount} / {domains.length}</div>
                <span className="text-xs text-slate-400 mt-1 block">Pending DNS resolve checks</span>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Bounce Rate</CardTitle>
              <CardDescription>Delivery health metrics</CardDescription>
            </div>
            <ShieldAlert className="w-5 h-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{bounceRate}%</div>
                <span className="text-xs text-slate-400 mt-1 block">Total Bounced: {stats.bounced}</span>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Feed</CardTitle>
          <CardDescription>Outbound SMTP transactional logs</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLogsLoading ? (
            <div className="h-[150px] flex items-center justify-center text-slate-500 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading feed...
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="h-[150px] flex items-center justify-center text-slate-400 text-sm">
              No recent logs found. Send transactional emails to populate statistics.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log: any) => (
                  <TableRow key={log._id}>
                    <TableCell className="font-semibold text-slate-900 dark:text-white text-xs">{log.recipient}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300 text-xs font-medium truncate max-w-[250px]">{log.subject}</TableCell>
                    <TableCell>
                      <Badge variant={
                        log.status === 'delivered' || log.status === 'sent' ? 'success' :
                        log.status === 'queued' || log.status === 'processing' ? 'info' :
                        log.status === 'deferred' ? 'warning' : 'error'
                      }>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs font-mono">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
