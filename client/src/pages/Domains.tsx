import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Notification } from '../components/ui/notification';
import { SummaryCards } from '../components/domains/SummaryCards';
import { StatusBadge } from '../components/domains/StatusBadge';
import { HealthScore } from '../components/domains/HealthScore';
import { DomainActionMenu } from '../components/domains/DomainActionMenu';
import { AddDomainWizard } from '../components/domains/AddDomainWizard';
import {
  Globe,
  Plus,
  Search,
  RefreshCw,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

type SortKey = 'newest' | 'oldest' | 'alphabetical' | 'health';
type FilterKey = 'all' | 'verified' | 'pending' | 'failed';
const PAGE_SIZE = 10;

export const Domains = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [notify, setNotify] = useState({ show: false, title: '', message: '', type: 'info' as any });

  const showNotification = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => {
    setNotify({ show: true, title, message, type });
  };

  // Fetch domain list
  const { data: domains = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const res = await apiClient.get('/domains');
      return res.data;
    },
  });

  // Fetch details for all domains (lightweight DB reads for per-row metrics)
  const { data: domainDetailsMap = {} } = useQuery({
    queryKey: ['domains-details-batch'],
    queryFn: async () => {
      if (!domains.length) return {};
      const results = await Promise.all(
        domains.map(async (d: any) => {
          try {
            const res = await apiClient.get(`/domains/${d._id}`);
            return { id: d._id, data: res.data };
          } catch {
            return { id: d._id, data: null };
          }
        })
      );
      const map: Record<string, any> = {};
      results.forEach((r) => {
        if (r.data) map[r.id] = r.data;
      });
      return map;
    },
    enabled: !!domains.length,
  });

  // Fetch email stats
  const { data: emailStats } = useQuery({
    queryKey: ['email-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/emails/stats');
      return res.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.post('/domains', { name });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to create domain.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/domains/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      showNotification('Success', 'Domain deleted successfully.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to delete domain.', 'error');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/domains/${id}/verify`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['domains-details-batch'] });
      if (data.domain.status === 'verified') {
        showNotification('Verified', 'Domain DNS records successfully verified and activated!', 'success');
      } else if (data.domain.status === 'failed') {
        showNotification('Unverified', 'Verification lookup failed. Ensure DNS updates have propagated.', 'warning');
      } else {
        showNotification('Pending', 'DNS records have not propagated yet.', 'info');
      }
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Verification lookup failed.', 'error');
    },
  });

  const regenerateDkimMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/domains/${id}/regenerate-dkim`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['domains-details-batch'] });
      showNotification('Success', 'DKIM key regenerated successfully.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to regenerate DKIM.', 'error');
    },
  });

  const handleDownloadDns = useCallback((domainId: string) => {
    const details = domainDetailsMap[domainId];
    if (!details?.dnsRecords) return;
    const lines: string[] = [`DNS Records for ${details.domain.name}`, '=' .repeat(40), ''];
    Object.entries(details.dnsRecords).forEach(([key, r]: [string, any]) => {
      if (!r || !r.value) return;
      lines.push(`${r.label || key} (${r.type})`);
      lines.push(`  Host:     ${r.host}`);
      if (r.priority) lines.push(`  Priority: ${r.priority}`);
      lines.push(`  Value:    ${r.value}`);
      lines.push(`  TTL:      ${r.ttl || 3600}`);
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dns-records-${details.domain.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Downloaded', 'DNS records exported.', 'success');
  }, [domainDetailsMap]);

  // Computed data
  const filteredAndSorted = useMemo(() => {
    let list = [...domains];

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d: any) => d.name?.toLowerCase().includes(q));
    }

    // Filter by status
    if (filter !== 'all') {
      list = list.filter((d: any) => d.status === filter);
    }

    // Sort
    list.sort((a: any, b: any) => {
      switch (sort) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'health': {
          const aScore = domainDetailsMap[a._id]?.verification?.healthScore ?? -1;
          const bScore = domainDetailsMap[b._id]?.verification?.healthScore ?? -1;
          return bScore - aScore;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [domains, searchQuery, filter, sort, domainDetailsMap]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const paginatedDomains = filteredAndSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 on filter/search/sort changes
  const resetPage = () => setPage(1);

  const avgHealthScore = useMemo(() => {
    const scores = Object.values(domainDetailsMap)
      .map((d: any) => d?.verification?.healthScore)
      .filter((s): s is number => s !== undefined && s !== null);
    if (!scores.length) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [domainDetailsMap]);

  const getVerifiedCount = (id: string) => {
    const v = domainDetailsMap[id]?.verification;
    if (!v) return { count: 0, total: 0 };
    const keys = ['mx', 'spf', 'dkim', 'dmarc', 'tracking', 'bounce', 'mtaSts', 'tlsRpt'];
    const verified = keys.filter((k) => v[`${k}Verified`] === true).length;
    return { count: verified, total: keys.length };
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Domains</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Manage and verify your sending domains.</p>
        </div>
        <Button variant="primary" onClick={() => setIsWizardOpen(true)} className="flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add Domain
        </Button>
      </div>

      {/* Summary Cards */}
      <SummaryCards
        domains={domains}
        emailSentToday={emailStats?.sent ?? null}
        avgHealthScore={avgHealthScore}
      />

      {/* Toolbar: Search + Filter + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search domains..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }}
            className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex gap-2">
          {/* Filter */}
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value as FilterKey); resetPage(); }}
              className="appearance-none pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <SlidersHorizontal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="appearance-none pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="health">Health Score</option>
            </select>
            <SlidersHorizontal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-slate-400">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center text-slate-500 gap-3">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading domains...
          </div>
        ) : isError ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-slate-500 gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            <p>Failed to load domain configurations.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : paginatedDomains.length === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Globe className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No domains added yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
              Add a domain to start sending emails. We'll automatically generate all the DNS records you need.
            </p>
            <Button variant="primary" onClick={() => setIsWizardOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Your First Domain
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Domain</TableHead>
                  <TableHead className="hidden md:table-cell">Mail Server</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Health Score</TableHead>
                  <TableHead className="hidden xl:table-cell">DNS Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Checked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDomains.map((d: any) => {
                  const details = domainDetailsMap[d._id];
                  const verification = details?.verification;
                  const verifiedCount = getVerifiedCount(d._id);
                  const lastChecked = verification?.lastVerifiedAt;

                  return (
                    <TableRow
                      key={d._id}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                            <Globe className="w-4 h-4 text-brand-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">{d.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 md:hidden">{d.mailServerHost || '—'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{d.mailServerHost || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={d.status} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <HealthScore score={verification?.healthScore} size="sm" />
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">{verifiedCount.count}/{verifiedCount.total}</span>
                          <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-500"
                              style={{ width: `${verifiedCount.total ? (verifiedCount.count / verifiedCount.total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {lastChecked ? new Date(lastChecked).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DomainActionMenu
                          onVerify={() => verifyMutation.mutate(d._id)}
                          onRefreshDns={() => verifyMutation.mutate(d._id)}
                          onRegenerateDkim={() => regenerateDkimMutation.mutate(d._id)}
                          onDownloadDns={() => handleDownloadDns(d._id)}
                          onDelete={() => {
                            if (window.confirm(`Delete ${d.name}? This cannot be undone.`)) {
                              deleteMutation.mutate(d._id);
                            }
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredAndSorted.length)} of {filteredAndSorted.length} domains
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        p === page
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Domain Wizard */}
      <AddDomainWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          setIsWizardOpen(false);
        }}
        createMutation={createMutation}
      />
    </div>
  );
};

export default Domains;
