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
import { ShieldCheck, Plus, RefreshCw, ToggleLeft, ToggleRight, Trash2, Copy, Check, ShieldAlert } from 'lucide-react';

export const ApiKeys = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['send']); // Default to sending scope

  // Generated secret display
  const [showSecretInfo, setShowSecretInfo] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Notification states
  const [notify, setNotify] = useState({ show: false, title: '', message: '', type: 'info' as any });

  const showNotification = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => {
    setNotify({ show: true, title, message, type });
  };

  // Queries
  const { data: apiKeys = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['apikeys'],
    queryFn: async () => {
      const res = await apiClient.get('/credentials/apikeys');
      return res.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; scopes: string[] }) => {
      const res = await apiClient.post('/credentials/apikeys', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apikeys'] });

      setIsCreateOpen(false);
      setKeyName('');
      setScopes(['send']);

      setShowSecretInfo({
        rawKey: data.rawKey,
        apiKey: data.apiKey,
      });

      showNotification(
        'Success',
        'API Key created successfully.',
        'success'
      );
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to create API key.', 'error');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'disabled' | 'revoked' }) => {
      await apiClient.patch(`/credentials/apikeys/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apikeys'] });
      showNotification('Updated', 'API Key status updated.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to update API key status.', 'error');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    createMutation.mutate({ name: keyName.trim(), scopes });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey('secret');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleScopeToggle = (scope: string) => {
    if (scopes.includes(scope)) {
      setScopes(scopes.filter((s) => s !== scope));
    } else {
      setScopes([...scopes, scope]);
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">API Keys</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Programmatic tokens to authenticate sending emails via REST API gateways.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
          <CardDescription>SHA-256 hashed keys. Show raw value only once upon generation.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-[250px] flex items-center justify-center text-slate-500 gap-3">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading API keys...
            </div>
          ) : isError ? (
            <div className="h-[250px] flex flex-col items-center justify-center text-slate-500 gap-3">
              <ShieldAlert className="w-8 h-8 text-rose-500" />
              <p>Failed to load API keys.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 text-sm gap-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <p>No programmatic API Keys found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key Name</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key: any) => (
                  <TableRow key={key.id ?? key._id}>
                    <TableCell className="font-semibold text-slate-900 dark:text-white">{key.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap">
                        {key.scopes.map((s: string) => (
                          <Badge key={s} variant="neutral" className="capitalize text-[10px] py-0.5">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.status === 'active' ? 'success' : key.status === 'disabled' ? 'warning' : 'error'}>
                        {key.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      {key.status !== 'revoked' && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleStatusMutation.mutate({ id: key.id ?? key._id, status: key.status === 'active' ? 'disabled' : 'active' })}
                            className="flex items-center gap-1 text-slate-600 dark:text-slate-300"
                          >
                            {key.status === 'active' ? (
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
                            onClick={() => toggleStatusMutation.mutate({ id: key.id ?? key._id, status: 'revoked' })}
                            className="flex items-center gap-1 text-rose-500 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                            Revoke
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Programmatic API Key">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="API Key Identification Description"
            placeholder="e.g. Production Billing App"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Permissions Scopes</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scopes.includes('send')}
                  onChange={() => handleScopeToggle('send')}
                  className="rounded border-slate-300 dark:border-slate-800 text-brand-600 focus:ring-brand-500"
                />
                Email Sending (`send`)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scopes.includes('admin')}
                  onChange={() => handleScopeToggle('admin')}
                  className="rounded border-slate-300 dark:border-slate-800 text-brand-600 focus:ring-brand-500"
                />
                Admin Management (`admin`)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>Generate API Key</Button>
          </div>
        </form>
      </Dialog>

      {/* Newly Created API Key Secret Dialog */}
      <Dialog 
        isOpen={!!showSecretInfo} 
        onClose={() => setShowSecretInfo(null)} 
        title="API Key Created"
      >
        <div className="space-y-5">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs rounded-xl">
            <strong>WARNING:</strong> Make sure to copy the API secret now. It will not be shown again for security reasons.
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">REST Bearer Secret Token</span>
            <div className="flex items-center gap-2 mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs font-mono break-all justify-between">
              <span>{showSecretInfo?.rawKey}</span>
              <Button variant="ghost" size="sm" onClick={() => handleCopy(showSecretInfo?.rawKey)} className="p-1">
                {copiedKey === 'secret' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="primary" onClick={() => setShowSecretInfo(null)}>Done</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ApiKeys;
