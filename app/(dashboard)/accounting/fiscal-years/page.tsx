'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Lock, Unlock, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { accountingApi, type FiscalYearWithPeriods, type PeriodItem } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ closed }: { closed: boolean }) {
  return closed ? (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
      <Lock className="h-3 w-3" /> Closed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: 'var(--success, #16a34a)' }}>
      <Unlock className="h-3 w-3" /> Open
    </span>
  );
}

export default function FiscalYearsPage() {
  const t = useTranslations('accounting');
  const [years, setYears] = useState<FiscalYearWithPeriods[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newYearStart, setNewYearStart] = useState('');
  const [newYearEnd, setNewYearEnd] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await accountingApi.listFiscalYears();
      setYears(result);
      if (result.length > 0) {
        setExpandedYears(new Set([result[0].id]));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleYear = (id: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAction = async (action: () => Promise<any>, loadingKey: string) => {
    setActionLoading(loadingKey);
    try {
      await action();
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateYear = async () => {
    if (!newYearStart || !newYearEnd) return;
    await handleAction(
      () => accountingApi.createFiscalYear({ date_start: newYearStart, date_end: newYearEnd }),
      'create'
    );
    setShowCreateForm(false);
    setNewYearStart('');
    setNewYearEnd('');
  };

  const suggestNewYear = () => {
    const now = new Date();
    const nextYear = years.length > 0
      ? new Date(years[0].date_end).getFullYear() + 1
      : now.getFullYear();
    setNewYearStart(`${nextYear}-01-01`);
    setNewYearEnd(`${nextYear}-12-31`);
    setShowCreateForm(true);
  };

  if (loading) return <PageSkeleton hasStats={false} tableRows={4} tableColumns={4} />;

  return (
    <div>
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('fiscalYears')}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('fiscalYearsDescription')}
          </p>
        </div>
        <button
          onClick={suggestNewYear}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <Plus className="h-4 w-4" />
          {t('createFiscalYear')}
        </button>
      </div>

      {error && (
        <div className="card mb-6 p-4" style={{ borderColor: 'var(--danger, #dc2626)', backgroundColor: 'rgba(220, 38, 38, 0.05)' }}>
          <p className="text-sm" style={{ color: 'var(--danger, #dc2626)' }}>{error}</p>
        </div>
      )}

      {showCreateForm && (
        <div className="card mb-6 p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('createFiscalYear')}
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t('startDate')}
              </label>
              <input
                type="date"
                value={newYearStart}
                onChange={(e) => setNewYearStart(e.target.value)}
                className="px-3 py-2 rounded-lg"
                style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t('endDate')}
              </label>
              <input
                type="date"
                value={newYearEnd}
                onChange={(e) => setNewYearEnd(e.target.value)}
                className="px-3 py-2 rounded-lg"
                style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateYear}
                disabled={actionLoading === 'create'}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {actionLoading === 'create' ? 'Creating...' : t('create')}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {years.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={t('noFiscalYears')}
          message={t('noFiscalYearsMessage')}
        />
      ) : (
        <div className="space-y-4">
          {years.map((year) => {
            const yearLabel = `${formatDate(year.date_start)} — ${formatDate(year.date_end)}`;
            const isExpanded = expandedYears.has(year.id);
            const openPeriods = year.periods.filter((p) => !p.is_closed).length;
            const totalPeriods = year.periods.length;

            return (
              <div key={year.id} className="card overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:opacity-80"
                  style={{ borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
                  onClick={() => toggleYear(year.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    <div>
                      <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                        {yearLabel}
                      </span>
                      <span className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                        {openPeriods}/{totalPeriods} {t('periodsOpen')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge closed={year.is_closed} />
                    {!year.is_closed ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction(() => accountingApi.closeFiscalYear(year.id), `close-fy-${year.id}`); }}
                        disabled={actionLoading === `close-fy-${year.id}`}
                        className="px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      >
                        <Lock className="inline h-3 w-3 mr-1" />
                        {actionLoading === `close-fy-${year.id}` ? '...' : t('closeYear')}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction(() => accountingApi.reopenFiscalYear(year.id), `reopen-fy-${year.id}`); }}
                        disabled={actionLoading === `reopen-fy-${year.id}`}
                        className="px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      >
                        <Unlock className="inline h-3 w-3 mr-1" />
                        {actionLoading === `reopen-fy-${year.id}` ? '...' : t('reopenYear')}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 sm:p-5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                          <th className="text-left py-2 pr-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('period')}</th>
                          <th className="text-left py-2 pr-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('dateRange')}</th>
                          <th className="text-left py-2 pr-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('status')}</th>
                          <th className="text-right py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {year.periods.map((period) => (
                          <PeriodRow
                            key={period.id}
                            period={period}
                            actionLoading={actionLoading}
                            onClose={() => handleAction(() => accountingApi.closePeriod(period.id), `close-p-${period.id}`)}
                            onReopen={() => handleAction(() => accountingApi.reopenPeriod(period.id), `reopen-p-${period.id}`)}
                            t={t}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PeriodRow({
  period,
  actionLoading,
  onClose,
  onReopen,
  t,
}: {
  period: PeriodItem;
  actionLoading: string | null;
  onClose: () => void;
  onReopen: () => void;
  t: (key: string) => string;
}) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const periodLabel = `${t('period')} ${period.period_no} (${monthNames[period.period_no - 1] || period.period_no})`;

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td className="py-2.5 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{periodLabel}</td>
      <td className="py-2.5 pr-4" style={{ color: 'var(--text-secondary)' }}>
        {formatDate(period.date_start)} — {formatDate(period.date_end)}
      </td>
      <td className="py-2.5 pr-4"><StatusBadge closed={period.is_closed} /></td>
      <td className="py-2.5 text-right">
        {!period.is_closed ? (
          <button
            onClick={onClose}
            disabled={actionLoading === `close-p-${period.id}`}
            className="px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {actionLoading === `close-p-${period.id}` ? '...' : t('closePeriod')}
          </button>
        ) : (
          <button
            onClick={onReopen}
            disabled={actionLoading === `reopen-p-${period.id}`}
            className="px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {actionLoading === `reopen-p-${period.id}` ? '...' : t('reopenPeriod')}
          </button>
        )}
      </td>
    </tr>
  );
}
