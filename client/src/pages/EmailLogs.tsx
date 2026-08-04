import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { RefreshCw, Search, ShieldAlert, FileText } from 'lucide-react';

export const EmailLogs = () => {
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);

  // Queries
  const { data: logs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['email-logs'],
    queryFn: async () => {
      const res = await apiClient.get('/emails');
      return res.data;
    },
  });

  const { data: eventHistory = [], isLoading: isEventsLoading } = useQuery({
    queryKey: ['email-events', selectedMsgId],
    queryFn: async () => {
      if (!selectedMsgId) return [];
      const res = await apiClient.get(`/emails/${encodeURIComponent(selectedMsgId)}/events`);
      return res.data;
    },
    enabled: !!selectedMsgId,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Delivery Logs</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Real-time audit logs tracking transactional email deliveries, bounces, and complain events.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="flex items-center gap-2 self-start sm:self-auto">
          <RefreshCw className="w-4 h-4" />
          Refresh Logs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transmission Audit History</CardTitle>
          <CardDescription>Review outbound SMTP deliveries across this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500 gap-3">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading logs...
            </div>
          ) : isError ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-slate-500 gap-3">
              <ShieldAlert className="w-8 h-8 text-rose-500" />
              <p>Failed to load delivery logs.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 text-sm gap-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                <FileText className="w-8 h-8" />
              </div>
              <p>No transmission logs found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log._id}>
                    <TableCell className="font-semibold text-slate-900 dark:text-white">{log.recipient}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{log.sender}</TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300 text-xs font-medium max-w-[200px] truncate">{log.subject}</TableCell>
                    <TableCell>
                      <Badge variant={
                        log.status === 'delivered' || log.status === 'sent' || log.status === 'accepted' ? 'success' :
                        log.status === 'queued' || log.status === 'processing' ? 'info' :
                        log.status === 'deferred' ? 'warning' : 'error'
                      }>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedMsgId(log.messageId)}
                        className="flex items-center gap-1 text-brand-500 hover:underline"
                      >
                        <Search className="w-4 h-4" />
                        Trace Path
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Trace History Dialog */}
      <Dialog 
        isOpen={!!selectedMsgId} 
        onClose={() => setSelectedMsgId(null)} 
        title="Delivery Event Trace History"
      >
        {isEventsLoading ? (
          <div className="py-12 flex items-center justify-center text-slate-500 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading trace path...
          </div>
        ) : eventHistory.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No tracking events recorded for this message.
          </div>
        ) : (
          <div className="space-y-6 py-2">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Message-ID</span>
              <p className="text-xs font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 break-all">
                {selectedMsgId}
              </p>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transition States progression</span>
              <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-6">
                {eventHistory.map((ev: any, index: number) => (
                  <div key={ev._id || index} className="relative">
                    {/* Bullet marker */}
                    <div className="absolute -left-[30px] top-1 bg-white dark:bg-slate-900 p-0.5 rounded-full">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                        ev.status === 'delivered' || ev.status === 'sent' ? 'bg-emerald-500 border-emerald-500' :
                        ev.status === 'failed' || ev.status === 'bounced' ? 'bg-rose-500 border-rose-500' :
                        'bg-slate-300 dark:bg-slate-700 border-slate-300 dark:border-slate-700'
                      }`} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold capitalize text-slate-900 dark:text-white">
                          {ev.status}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {ev.smtpResponse && (
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2 rounded">
                          {ev.smtpResponse}
                        </p>
                      )}

                      {(ev.remoteServer || ev.responseCode) && (
                        <div className="flex gap-4 text-[10px] text-slate-400 font-mono">
                          {ev.responseCode && <span>Code: {ev.responseCode}</span>}
                          {ev.remoteServer && <span>Target MX: {ev.remoteServer}</span>}
                          {ev.retryCount > 0 && <span>Attempt: {ev.retryCount + 1}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default EmailLogs;
