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
import { Key, Plus, Trash2, ShieldAlert, RefreshCw, ToggleLeft, ToggleRight, Copy, Check } from 'lucide-react';

export const SmtpCredentials = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [description, setDescription] = useState('');
  
  // Newly generated credential display states
  const [showCredentialInfo, setShowCredentialInfo] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Notification states
  const [notify, setNotify] = useState({ show: false, title: '', message: '', type: 'info' as any });

  const showNotification = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => {
    setNotify({ show: true, title, message, type });
  };

  // Queries
  const { data: credentials = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['credentials'],
    queryFn: async () => {
      const res = await apiClient.get('/credentials/smtp');
      console.log(JSON.stringify(res.data, null, 2));
      return res.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (desc: string) => {
      const res = await apiClient.post('/credentials/smtp', { description: desc });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });

      setIsCreateOpen(false);
      setDescription('');

      setShowCredentialInfo({
        username: data.credential.username,
        password: data.plaintextPassword,
        description: data.credential.description,
        isRegen: false,
      });

      showNotification(
        'Success',
        'SMTP credential created successfully.',
        'success'
      );
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to create SMTP key.', 'error');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'disabled' }) => {
      await apiClient.patch(`/credentials/smtp/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      showNotification('Updated', 'Credential status updated.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to update status.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/credentials/smtp/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      showNotification('Success', 'Credential deleted successfully.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to delete key.', 'error');
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/credentials/smtp/${id}/regenerate`);
      return res.data;
    },
    onSuccess: (data, id) => {
      // Find original description
      const orig = credentials.find((c: any) => c.id === id);
      setShowCredentialInfo({
        username: orig?.username || orig?.smtpUsername || 'Username',
        password: data.plaintextPassword,
        description: orig?.description || 'Regenerated Key',
        isRegen: true,
      });
      showNotification('Success', 'Password regenerated successfully.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to regenerate password.', 'error');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    createMutation.mutate(description.trim());
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(type);
    setTimeout(() => setCopiedKey(null), 2000);
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">SMTP Credentials</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Configure SMTP login keys to relay outgoing mail from traditional mail clients.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create SMTP Key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SMTP Relay Credentials</CardTitle>
          <CardDescription>Hashed security tokens. Raw password will display only once.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-[250px] flex items-center justify-center text-slate-500 gap-3">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading credentials...
            </div>
          ) : isError ? (
            <div className="h-[250px] flex flex-col items-center justify-center text-slate-500 gap-3">
              <ShieldAlert className="w-8 h-8 text-rose-500" />
              <p>Failed to load SMTP relay credentials.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : credentials.length === 0 ? (
            <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 text-sm gap-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                <Key className="w-8 h-8" />
              </div>
              <p>No SMTP login keys provisioned.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>SMTP Username</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold text-slate-900 dark:text-white">{c.description}</TableCell>
                    <TableCell className="font-mono text-xs">{c.username || c.smtpUsername || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'active' ? 'success' : 'warning'}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {c.lastUsedAt ? new Date(c.lastUsedAt).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleStatusMutation.mutate({ id: c.id, status: c.status === 'active' ? 'disabled' : 'active' })}
                        className="flex items-center gap-1 text-slate-600 dark:text-slate-300"
                      >
                        {c.status === 'active' ? (
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
                        onClick={() => regenerateMutation.mutate(c.id)}
                        className="flex items-center gap-1 text-slate-600 dark:text-slate-300"
                      >
                        <RefreshCw className="w-4 h-4 text-brand-500" />
                        Regenerate
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteMutation.mutate(c.id)}
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

      {/* Create Dialog */}
      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create SMTP Credential Key">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Credential Key Description"
            placeholder="e.g. My Website App"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>Generate Key</Button>
          </div>
        </form>
      </Dialog>

      {/* Newly Created Credential Dialog */}
      <Dialog 
        isOpen={!!showCredentialInfo} 
        onClose={() => setShowCredentialInfo(null)} 
        title={showCredentialInfo?.isRegen ? "SMTP Password Regenerated" : "SMTP Credential Generated"}
      >
        <div className="space-y-5">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs rounded-xl">
            <strong>WARNING:</strong> Make sure to copy the password credentials now. It will not be shown again for security reasons.
          </div>

          <div className="space-y-3">
            {!showCredentialInfo?.isRegen && (
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">SMTP Username</span>
                <div className="flex items-center gap-2 mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs font-mono break-all justify-between">
                  <span>{showCredentialInfo?.username}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(showCredentialInfo?.username, 'user')} className="p-1">
                    {copiedKey === 'user' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </Button>
                </div>
              </div>
            )}
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">SMTP Password (Secret)</span>
              <div className="flex items-center gap-2 mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs font-mono break-all justify-between">
                <span>{showCredentialInfo?.password}</span>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(showCredentialInfo?.password, 'pass')} className="p-1">
                  {copiedKey === 'pass' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="primary" onClick={() => setShowCredentialInfo(null)}>Done</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default SmtpCredentials;
