import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog } from '../components/ui/dialog';
import { Notification } from '../components/ui/notification';
import { Webhook as WebhookIcon, Plus, Trash2, RefreshCw, Eye, ToggleLeft, ToggleRight, Copy, Check, ShieldAlert, Send } from 'lucide-react';

const AVAILABLE_EVENTS = [
  'queued',
  'processing',
  'sent',
  'delivered',
  'deferred',
  'bounced',
  'complained',
  'suppressed'
];

export const Webhooks = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  
  // Create webhook input fields
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['delivered', 'bounced']);

  // Clipboard copy state
  const [copied, setCopied] = useState(false);

  // Plaintext signing secret is revealed exactly once (create/rotate response).
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  // Notification states
  const [notify, setNotify] = useState({ show: false, title: '', message: '', type: 'info' as any });

  const showNotification = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => {
    setNotify({ show: true, title, message, type });
  };

  // Queries
  const { data: webhooks = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const res = await apiClient.get('/webhooks');
      return res.data;
    },
  });

  const selectedWebhook = webhooks.find((w: any) => w._id === selectedWebhookId);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: { url: string; events: string[] }) => {
      const res = await apiClient.post('/webhooks', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setIsCreateOpen(false);
      setUrl('');
      setSelectedEvents(['delivered', 'bounced']);
      setSelectedWebhookId(data._id); // Auto select new webhook to show secret key
      setRevealedSecret(data.secret); // Reveal the plaintext signing secret once
      showNotification('Success', 'Webhook registered successfully.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to register webhook.', 'error');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await apiClient.patch(`/webhooks/${id}/status`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      showNotification('Updated', 'Webhook status updated.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to update status.', 'error');
    },
  });

  const rotateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/webhooks/${id}/rotate`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setRevealedSecret(data.secret); // Reveal the new plaintext signing secret once
      showNotification('Rotated', 'Webhook signing secret rotated.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to rotate secret.', 'error');
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/webhooks/${id}/test`);
      return res.data;
    },
    onSuccess: () => {
      showNotification('Success', 'Test webhook payload enqueued successfully.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to dispatch test webhook.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      if (selectedWebhookId) setSelectedWebhookId(null);
      setRevealedSecret(null);
      showNotification('Success', 'Webhook deleted successfully.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to delete webhook.', 'error');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || selectedEvents.length === 0) return;
    createMutation.mutate({ url: url.trim(), events: selectedEvents });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2050);
  };

  const handleSelectWebhook = (id: string) => {
    setRevealedSecret(null); // Only ever show a plaintext secret once
    setSelectedWebhookId(id);
  };

  const handleEventToggle = (eventName: string) => {
    if (selectedEvents.includes(eventName)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== eventName));
    } else {
      setSelectedEvents([...selectedEvents, eventName]);
    }
  };

  return (
    <div className="space-y-6">
      <Notification
        show={notify.show}
        title={notify.title}
        message={notify.message}
        type={notify.type}
        onClose={() => setNotify({ ...notify, show: false })}
      />

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Webhooks</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Configure callback targets to receive real-time updates for delivery events.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Table Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Listeners</CardTitle>
              <CardDescription>Each webhook event payload carries a signature hash to verify origin integrity.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="h-[250px] flex items-center justify-center text-slate-500 gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Loading webhooks...
                </div>
              ) : isError ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-500 gap-3">
                  <ShieldAlert className="w-8 h-8 text-rose-500" />
                  <p>Failed to load webhook configurations.</p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
                </div>
              ) : webhooks.length === 0 ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 text-sm gap-4">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                    <WebhookIcon className="w-8 h-8" />
                  </div>
                  <p>No endpoints configured.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL Endpoint</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((w: any) => (
                      <TableRow key={w._id} className={selectedWebhookId === w._id ? 'bg-slate-50 dark:bg-slate-800/40' : ''}>
                        <TableCell className="font-semibold text-slate-900 dark:text-white max-w-[200px] truncate">{w.url}</TableCell>
                        <TableCell>
                          <Badge variant={w.active ? 'success' : 'warning'}>
                            {w.active ? 'active' : 'disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleSelectWebhook(w._id)}
                            className="flex items-center gap-1 text-slate-600 dark:text-slate-300"
                          >
                            <Eye className="w-4 h-4" />
                            Details
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleStatusMutation.mutate({ id: w._id, active: !w.active })}
                            className="flex items-center gap-1 text-slate-600 dark:text-slate-300"
                          >
                            {w.active ? (
                              <>
                                <ToggleRight className="w-4 h-4 text-emerald-500" />
                                Disable
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 text-slate-400" />
                                Enable
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteMutation.mutate(w._id)}
                            className="flex items-center gap-1 text-rose-500 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-1">
          {selectedWebhook ? (
            <Card className="border-slate-300/40 dark:border-slate-800">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-bold">Webhook Details</CardTitle>
                <CardDescription>HMAC Security & Events subscription</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Endpoint URL</span>
                    <p className="text-xs break-all bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg mt-1 text-slate-800 dark:text-slate-200 font-medium">
                      {selectedWebhook.url}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">HMAC Signature Secret</span>
                    <div className="flex items-center gap-2 mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs font-mono break-all justify-between text-slate-800 dark:text-slate-200">
                      <span className="truncate mr-2">{revealedSecret ?? 'whsec_••••••••••••••••••••••••••••••'}</span>
                      {revealedSecret && (
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(revealedSecret)} className="p-1">
                          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        </Button>
                      )}
                    </div>
                    {!revealedSecret && (
                      <p className="text-[10px] text-slate-400 mt-1">Secret is masked for security. Rotate to reveal a new one.</p>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Subscribed Events</span>
                    <div className="flex gap-1.5 flex-wrap mt-1.5">
                      {selectedWebhook.events.map((e: string) => (
                        <Badge key={e} variant="neutral" className="capitalize text-[10px]">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => rotateMutation.mutate(selectedWebhook._id)}
                    isLoading={rotateMutation.isPending}
                    className="flex justify-center items-center gap-1 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Rotate Secret
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => testMutation.mutate(selectedWebhook._id)}
                    isLoading={testMutation.isPending}
                    className="flex justify-center items-center gap-1 text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Test Endpoint
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 text-sm text-center">
              <WebhookIcon className="w-8 h-8 mb-2" />
              <p>Select a webhook listener to show detail secrets, key rotations, or trigger connectivity testing calls.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register Webhook Endpoint">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Webhook Destination Endpoint URL"
            placeholder="https://api.yourcompany.com/webhook"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Events Subscriptions</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {AVAILABLE_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer capitalize">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(ev)}
                    onChange={() => handleEventToggle(ev)}
                    className="rounded border-slate-300 dark:border-slate-800 text-brand-600 focus:ring-brand-500"
                  />
                  {ev}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>Add Webhook</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default Webhooks;
