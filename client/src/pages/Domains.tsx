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
import {
  Globe,
  Plus,
  Trash2,
  Eye,
  ShieldAlert,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

// Domains Page Component
export const Domains = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [newDomainName, setNewDomainName] = useState('');

  // Notification states
  const [notify, setNotify] = useState({ show: false, title: '', message: '', type: 'info' as any });

  const showNotification = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => {
    setNotify({ show: true, title, message, type });
  };

  // Function to copy text to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);

      showNotification(
        "Copied",
        `${label} copied to clipboard.`,
        "success"
      );
    } catch {
      showNotification(
        "Error",
        `Failed to copy ${label}.`,
        "error"
      );
    }
  };

  // Queries
  const { data: domains = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const res = await apiClient.get('/domains');
      return res.data;
    },
  });

  // Fetch details for the selected domain
  const { data: domainDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['domain', selectedDomainId],
    queryFn: async () => {
      if (!selectedDomainId) return null;
      const res = await apiClient.get(`/domains/${selectedDomainId}`);
      return res.data;
    },
    enabled: !!selectedDomainId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.post('/domains', { name });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      setIsCreateOpen(false);
      setNewDomainName('');
      setSelectedDomainId(data.id || data._id); // Auto open details for the newly created domain
      showNotification('Success', 'Domain created successfully.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to create domain.', 'error');
    },
  });

  //
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/domains/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      if (selectedDomainId) setSelectedDomainId(null);
      showNotification('Success', 'Domain deleted successfully.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to delete domain.', 'error');
    },
  });

  // Verify DNS records mutation
  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/domains/${id}/verify`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['domain', selectedDomainId] });
      if (data.domain.status === "verified") {
        showNotification('Verified', 'Domain DNS records successfully verified and activated!', 'success');
      }
      else if (data.domain.status === "failed") {
        showNotification('Unverified', 'Verification lookup failed. Ensure DNS updates have propagated.', 'warning');
      }
      else {
        showNotification(
          "Pending",
          "DNS records have not propagated yet.",
          "info"
        );
      }
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Verification lookup failed.', 'error');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;
    createMutation.mutate(newDomainName.trim());
  };

  // MX record parsing
  const mxRecord = domainDetails?.dnsRecords?.mx?.value ?? "";
  const mxParts = mxRecord.split(" ");

  const mxPriority = mxParts[0] ?? "";
  const mxValue = mxParts.slice(1).join(" ");

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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Domains</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Configure SPF, DKIM, and DMARC parameters to send mail from custom hosts.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Domain
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Domains List */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configured Domains</CardTitle>
              <CardDescription>Verify DNS settings to activate sending permissions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="h-[250px] flex items-center justify-center text-slate-500 gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Loading domains...
                </div>
              ) : isError ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-500 gap-3">
                  <ShieldAlert className="w-8 h-8 text-rose-500" />
                  <p>Failed to load domain configurations.</p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
                </div>
              ) : domains.length === 0 ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 text-sm gap-4">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                    <Globe className="w-8 h-8" />
                  </div>
                  <p>No domain configurations found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {domains.map((d: any) => (
                      <TableRow key={d._id} className={selectedDomainId === d._id ? 'bg-slate-50 dark:bg-slate-800/40' : ''}>
                        <TableCell className="font-medium text-slate-900 dark:text-white">{d.name}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === 'verified' ? 'success' : 'warning'}>
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDomainId(d._id)}
                            className="flex items-center gap-1 text-slate-600 dark:text-slate-300"
                          >
                            <Eye className="w-4 h-4" />
                            Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(d._id)}
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

        {/* Right Side: DNS Details */}
        <div className="lg:col-span-1">
          {selectedDomainId ? (
            <Card className="border-slate-300/40 dark:border-slate-800">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold">{domainDetails?.domain?.name || 'Loading details...'}</CardTitle>
                    <CardDescription>DNS verification entries</CardDescription>
                  </div>
                  {domainDetails?.domain?.status === 'verified' && (
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                {isDetailsLoading ? (
                  <div className="py-12 flex items-center justify-center text-slate-500 gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Fetching DNS records...
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {/* DKIM */}
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">DKIM Records</span>
                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 rounded-lg text-xs space-y-2">
                            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3">

                              <div className="flex justify-between">

                                <h3 className="font-semibold">

                                  DKIM Record

                                </h3>

                                <Badge
                                  variant={
                                    domainDetails?.verification?.dkimVerified
                                      ? "success"
                                      : "warning"
                                  }
                                >
                                  {domainDetails?.verification?.dkimVerified
                                    ? "Verified"
                                    : "Pending"}
                                </Badge>

                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm">

                                <div>

                                  <p className="text-slate-400">

                                    Type

                                  </p>

                                  <p>

                                    TXT

                                  </p>

                                </div>

                                <div>

                                  <p className="text-slate-400">

                                    TTL

                                  </p>

                                  <p>

                                    Auto

                                  </p>

                                </div>

                                <div>

                                  <p className="text-slate-400">

                                    Host

                                  </p>

                                  <p className="font-mono break-all">

                                    {domainDetails?.dnsRecords?.dkim?.host}

                                  </p>

                                </div>

                              </div>

                              <div>

                                <p className="text-slate-400 mb-2">

                                  Value

                                </p>

                                <pre className="rounded-lg bg-black p-3 text-xs font-mono whitespace-pre-wrap break-all">

                                  {domainDetails?.dnsRecords?.dkim?.value}

                                </pre>

                              </div>

                              <div className="flex gap-2">

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    copyToClipboard(
                                      domainDetails?.dnsRecords?.dkim?.host ?? "",
                                      "DKIM Host"
                                    )
                                  }
                                >
                                  Copy Host
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    copyToClipboard(
                                      domainDetails?.dnsRecords?.dkim?.value ?? "",
                                      "DKIM Value"
                                    )
                                  }
                                >
                                  Copy Value
                                </Button>

                              </div>

                            </div>
                        </div>
                      </div>

                      {/* SPF */}
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">SPF Records</span>
                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 rounded-lg text-xs space-y-2">
                            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3">
                              <div className="flex justify-between">
                                <h3 className="font-semibold">SPF Record</h3>

                                <Badge
                                  variant={
                                    domainDetails?.verification?.spfVerified
                                      ? "success"
                                      : "warning"
                                  }
                                >
                                  {domainDetails?.verification?.spfVerified
                                    ? "Verified"
                                    : "Pending"}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-slate-400">Type</p>
                                  <p>TXT</p>
                                </div>

                                <div>
                                  <p className="text-slate-400">TTL</p>
                                  <p>Auto</p>
                                </div>

                                <div className="col-span-2">
                                  <p className="text-slate-400">Host</p>
                                  <p className="font-mono">
                                    {domainDetails?.dnsRecords?.spf?.host}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="text-slate-400 mb-2">Value</p>

                                <pre className="rounded-lg bg-black p-3 text-xs font-mono whitespace-pre-wrap break-all">
                                  {domainDetails?.dnsRecords?.spf?.value}
                                </pre>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    copyToClipboard(
                                      domainDetails?.dnsRecords?.spf?.host ?? "",
                                      "SPF Host"
                                    )
                                  }
                                >
                                  Copy Host
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    copyToClipboard(
                                      domainDetails?.dnsRecords?.spf?.value ?? "",
                                      "SPF Value"
                                    )
                                  }
                                >
                                  Copy Value
                                </Button>
                              </div>
                            </div>
                        </div>
                      </div>

                      {/* DMARC */}
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">DMARC Records</span>
                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 rounded-lg text-xs space-y-2">
                            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3">
                              <div className="flex justify-between">
                                <h3 className="font-semibold">DMARC Record</h3>

                                <Badge
                                  variant={
                                    domainDetails?.verification?.dmarcVerified
                                      ? "success"
                                      : "warning"
                                  }
                                >
                                  {domainDetails?.verification?.dmarcVerified
                                    ? "Verified"
                                    : "Pending"}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-slate-400">Type</p>
                                  <p>TXT</p>
                                </div>

                                <div>
                                  <p className="text-slate-400">TTL</p>
                                  <p>Auto</p>
                                </div>

                                <div className="col-span-2">
                                  <p className="text-slate-400">Host</p>

                                  <p className="font-mono break-all">
                                    {domainDetails?.dnsRecords?.dmarc?.host}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="text-slate-400 mb-2">Value</p>

                                <pre className="rounded-lg bg-black p-3 text-xs font-mono whitespace-pre-wrap break-all">
                                  {domainDetails?.dnsRecords?.dmarc?.value}
                                </pre>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    copyToClipboard(
                                      domainDetails?.dnsRecords?.dmarc?.host ?? "",
                                      "DMARC Host"
                                    )
                                  }
                                >
                                  Copy Host
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    copyToClipboard(
                                      domainDetails?.dnsRecords?.dmarc?.value ?? "",
                                      "DMARC Value"
                                    )
                                  }
                                >
                                  Copy Value
                                </Button>
                              </div>
                            </div>
                        </div>
                      </div>

                      {/* MX */}
                      <div className="space-y-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            MX Records
                          </span>

                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 rounded-lg text-xs space-y-2">
                            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3">

                              <div className="flex justify-between">
                                <h3 className="font-semibold">MX Record</h3>

                                <Badge
                                  variant={
                                    domainDetails?.verification?.mxVerified
                                      ? "success"
                                      : "warning"
                                  }
                                >
                                  {domainDetails?.verification?.mxVerified
                                    ? "Verified"
                                    : "Pending"}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-slate-400">Type</p>
                                  <p>MX</p>
                                </div>

                                <div>
                                  <p className="text-slate-400">TTL</p>
                                  <p>Auto</p>
                                </div>

                                <div>
                                  <p className="text-slate-400">Priority</p>
                                  <p>{mxPriority}</p>
                                </div>

                                <div>
                                  <p className="text-slate-400">Host</p>
                                  <p className="font-mono break-all">
                                    {domainDetails?.dnsRecords?.mx?.host}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="text-slate-400 mb-2">Value</p>

                                <pre className="rounded-lg bg-black p-3 text-xs font-mono whitespace-pre-wrap break-all">
                                  {mxValue}
                                </pre>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    copyToClipboard(
                                      domainDetails?.dnsRecords?.mx?.host ?? "",
                                      "MX Host"
                                    )
                                  }
                                >
                                  Copy Host
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    copyToClipboard(
                                      mxValue,
                                      "MX Value"
                                    )
                                  }
                                >
                                  Copy Value
                                </Button>
                              </div>

                            </div>
                        </div>
                      </div>
                    </div>

                      <Button
                        variant="primary"
                      onClick={() => verifyMutation.mutate(selectedDomainId)}
                      isLoading={verifyMutation.isPending}
                      className="w-full flex justify-center items-center gap-2"
                      disabled={domainDetails?.domain?.status === 'verified'}
                    >
                      <RefreshCw className="w-4 h-4" />
                      {domainDetails?.domain?.status === 'verified' ? 'Verified' : 'Verify DNS Records'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 text-sm text-center">
              <Globe className="w-8 h-8 mb-2" />
              <p>Select a domain from the list to view its DNS records & verify configurations.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register Send Domain">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Domain Name"
            placeholder="e.g. yourcompany.com"
            value={newDomainName}
            onChange={(e) => setNewDomainName(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>Add Domain</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default Domains;