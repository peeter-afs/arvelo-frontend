'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { auditLogApi, type AuditEvent } from '@/lib/api/auditLog.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { downloadCsv } from '@/lib/utils/csvExport';

const PAGE_SIZE = 50;

const ACTION_COLORS: Record<string, string> = {
  create: '#16a34a',
  update: '#3b82f6',
  delete: '#ef4444',
  post: '#8b5cf6',
  send: '#06b6d4',
  confirm: '#16a34a',
  approve: '#16a34a',
  reject: '#ef4444',
  login: '#6366f1',
  logout: '#9ca3af',
};

export default function AuditLogPage() {
  const t = useTranslations('auditLog');
  const tc = useTranslations('common');

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    resource_type: '',
    user_email: '',
    from_date: '',
    to_date: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await auditLogApi.list({
        action: filters.action || undefined,
        resource_type: filters.resource_type || undefined,
        user_email: filters.user_email || undefined,
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setEvents(result.events);
      setTotal(result.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && events.length === 0) return <PageSkeleton hasStats={false} tableRows={10} tableColumns={6} />;

  if (error && !events.length) {
    return (
      <div>
        <div className="mb-6"><h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('title')}</h1></div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  const inputStyle = { border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('description')}</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('action')}</label>
            <select
              value={filters.action}
              onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(0); }}
              className="px-3 py-1.5 rounded text-sm"
              style={inputStyle}
            >
              <option value="">{t('all')}</option>
              {['create', 'update', 'delete', 'post', 'reverse', 'send', 'confirm', 'approve', 'reject', 'login', 'logout'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('resourceType')}</label>
            <select
              value={filters.resource_type}
              onChange={e => { setFilters(f => ({ ...f, resource_type: e.target.value })); setPage(0); }}
              className="px-3 py-1.5 rounded text-sm"
              style={inputStyle}
            >
              <option value="">{t('all')}</option>
              {['invoice', 'journal_entry', 'account', 'partner', 'payment', 'bank_transaction', 'fixed_asset', 'fiscal_year', 'user'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('user')}</label>
            <input
              type="text"
              placeholder="email..."
              value={filters.user_email}
              onChange={e => { setFilters(f => ({ ...f, user_email: e.target.value })); setPage(0); }}
              className="px-3 py-1.5 rounded text-sm w-40"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{tc('startDate')}</label>
            <input type="date" value={filters.from_date} onChange={e => { setFilters(f => ({ ...f, from_date: e.target.value })); setPage(0); }} className="px-3 py-1.5 rounded text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{tc('endDate')}</label>
            <input type="date" value={filters.to_date} onChange={e => { setFilters(f => ({ ...f, to_date: e.target.value })); setPage(0); }} className="px-3 py-1.5 rounded text-sm" style={inputStyle} />
          </div>
          {events.length > 0 && (
            <button
              onClick={() => {
                const rows = events.map(e => ({
                  timestamp: new Date(e.created_at).toISOString(),
                  user: e.user_email || '',
                  action: e.action,
                  resource_type: e.resource_type,
                  resource_id: e.resource_id || '',
                  ip: e.ip_address || '',
                }));
                downloadCsv(rows, 'audit-log.csv');
              }}
              className="px-3 py-1.5 rounded text-sm inline-flex items-center gap-1"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {events.length === 0 ? (
        <EmptyState icon={Shield} title={t('title')} message={t('noEvents')} />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-elevated)' }}>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('timestamp')}</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('user')}</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('action')}</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('resourceType')}</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('resourceId')}</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('ip')}</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 px-4 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-xs" style={{ color: 'var(--text-primary)' }}>
                      {event.user_email || '—'}
                    </td>
                    <td className="py-2 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                        backgroundColor: `${ACTION_COLORS[event.action] || '#6b7280'}15`,
                        color: ACTION_COLORS[event.action] || '#6b7280',
                      }}>
                        {event.action}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{event.resource_type}</td>
                    <td className="py-2 px-4 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {event.resource_id ? event.resource_id.slice(0, 8) : '—'}
                    </td>
                    <td className="py-2 px-4 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {event.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('showing', { from: page * PAGE_SIZE + 1, to: Math.min((page + 1) * PAGE_SIZE, total), total })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded text-sm disabled:opacity-50"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded text-sm disabled:opacity-50"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
