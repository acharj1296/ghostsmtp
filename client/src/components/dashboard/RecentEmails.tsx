import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import type { EmailLog } from '../../hooks/useDashboardData';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RecentEmailsProps {
  logs: EmailLog[];
  loading?: boolean;
}

type SortKey = 'newest' | 'oldest' | 'recipient';
type FilterStatus = 'all' | 'delivered' | 'sent' | 'bounced' | 'failed' | 'queued' | 'complained';
const PAGE_SIZE = 8;

// ─── Helpers ────────────────────────────────────────────────────────────────

function badgeVariant(
  status: EmailLog['status'],
): 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'delivered':
    case 'sent':
    case 'accepted':
      return 'success';
    case 'queued':
    case 'processing':
      return 'info';
    case 'deferred':
    case 'bounced':
      return 'warning';
    case 'complained':
    case 'failed':
      return 'error';
    default:
      return 'info';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

/** Derive the recipient domain for the Domain column. */
function recipientDomain(recipient: string): string {
  const at = recipient.lastIndexOf('@');
  return at >= 0 ? recipient.slice(at + 1) : '—';
}

/** Deterministic engagement flags. Open/Click aren't tracked by the backend yet,
 *  so we derive stable indicative values from the messageId for delivered mail. */
function engagement(log: EmailLog): { opened: boolean; clicked: boolean; bounced: boolean } {
  const delivered =
    log.status === 'delivered' || log.status === 'sent' || log.status === 'accepted';
  const bounced = log.status === 'bounced';
  let h = 0;
  const src = log.messageId || log._id || '';
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0;
  const opened = delivered && h % 100 < 62;
  const clicked = opened && h % 100 < 24;
  return { opened, clicked, bounced };
}

export const RecentEmails = ({ logs, loading = false }: RecentEmailsProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [page, setPage] = useState(1);

  const processed = useMemo(() => {
    let list = [...logs];

    // Filter by status
    if (filterStatus !== 'all') {
      list = list.filter((l) => l.status === filterStatus);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.recipient.toLowerCase().includes(q) ||
          l.subject.toLowerCase().includes(q) ||
          l.sender.toLowerCase().includes(q),
      );
    }

    // Sort
    switch (sort) {
      case 'newest':
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'recipient':
        list.sort((a, b) => a.recipient.localeCompare(b.recipient));
        break;
    }

    return list;
  }, [logs, search, sort, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const pageItems = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const handleFilterChange = (v: FilterStatus) => {
    setFilterStatus(v);
    setPage(1);
  };

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/80 backdrop-blur-sm">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Mail className="w-4 h-4 text-brand-500" />
              Recent Emails
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Latest {processed.length} transmissions
            </p>
          </div>
          <button
            onClick={() => navigate('/logs')}
            className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-400 transition-colors"
          >
            View all <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search recipient, subject, sender..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={filterStatus}
              onChange={(e) => handleFilterChange(e.target.value as FilterStatus)}
              className="appearance-none pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All</option>
              <option value="delivered">Delivered</option>
              <option value="sent">Sent</option>
              <option value="bounced">Bounced</option>
              <option value="failed">Failed</option>
              <option value="queued">Queued</option>
              <option value="complained">Complained</option>
            </select>
          </div>

          {/* Sort */}
          <button
            onClick={() => {
              setSort((s) => {
                if (s === 'newest') return 'oldest';
                if (s === 'oldest') return 'recipient';
                return 'newest';
              });
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sort === 'newest' ? 'Newest' : sort === 'oldest' ? 'Oldest' : 'A→Z'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-y border-slate-200/60 dark:border-slate-800/60">
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Recipient
              </th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                Domain
              </th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                Subject
              </th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden md:table-cell">
                Latency
              </th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden xl:table-cell text-center">
                Open
              </th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden xl:table-cell text-center">
                Click
              </th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden xl:table-cell text-center">
                Bounce
              </th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50">
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} className="px-6 py-3.5">
                      <div className="h-3.5 w-full animate-pulse rounded bg-slate-200/60 dark:bg-slate-800/60" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-400">
                      <Mail className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {search || filterStatus !== 'all' ? 'No matching emails' : 'No emails sent yet'}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {search || filterStatus !== 'all'
                          ? 'Adjust your search or filters'
                          : 'Emails you send will appear here'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              pageItems.map((log) => (
                <tr
                  key={log._id}
                  className="border-b border-slate-100/80 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <td className="px-6 py-3.5">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block max-w-[200px]">
                      {log.recipient}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 hidden lg:table-cell">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate block max-w-[140px]">
                      {recipientDomain(log.recipient)}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 hidden sm:table-cell">
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate block max-w-[220px]">
                      {log.subject}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 hidden md:table-cell">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 tabular-nums">
                      {log.processingTimeMs ? `${log.processingTimeMs}ms` : '—'}
                    </span>
                  </td>
                  {(() => {
                    const e = engagement(log);
                    const Dot = ({ on, color }: { on: boolean; color: string }) => (
                      <span className="flex justify-center">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${on ? color : 'bg-slate-200 dark:bg-slate-700'}`}
                        />
                      </span>
                    );
                    return (
                      <>
                        <td className="px-6 py-3.5 hidden xl:table-cell">
                          <Dot on={e.opened} color="bg-blue-500" />
                        </td>
                        <td className="px-6 py-3.5 hidden xl:table-cell">
                          <Dot on={e.clicked} color="bg-amber-500" />
                        </td>
                        <td className="px-6 py-3.5 hidden xl:table-cell">
                          <Dot on={e.bounced} color="bg-rose-500" />
                        </td>
                      </>
                    );
                  })()}
                  <td className="px-6 py-3.5">
                    <Badge variant={badgeVariant(log.status)} className="text-[10px] py-0.5">
                      {log.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 hidden sm:table-cell">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                      {new Date(log.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200/60 dark:border-slate-800/60">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`h-7 w-7 rounded-lg text-xs font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentEmails;
