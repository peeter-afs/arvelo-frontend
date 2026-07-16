'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, Lock, Unlock, Play, Check, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  monthEndApi,
  type MonthEndEntry,
  type MonthEndPeriod,
  type MonthEndRuleResult,
} from '@/lib/api/monthEnd.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';

function defaultMonth(): { year: number; month: number } {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: prev.getFullYear(), month: prev.getMonth() + 1 };
}

function StatusBadge({ status, t }: { status: MonthEndEntry['status']; t: (key: string) => string }) {
  const styles: Record<MonthEndEntry['status'], { bg: string; color: string }> = {
    draft: { bg: 'rgba(202, 138, 4, 0.1)', color: 'var(--warning, #ca8a04)' },
    posted: { bg: 'rgba(22, 163, 74, 0.1)', color: 'var(--success, #16a34a)' },
    reversed: { bg: 'var(--surface-elevated)', color: 'var(--text-secondary)' },
  };
  const s = styles[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {t(`monthEndStatus_${status}`)}
    </span>
  );
}

export default function MonthEndPage() {
  const t = useTranslations('accounting');
  const initial = defaultMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [period, setPeriod] = useState<MonthEndPeriod | null>(null);
  const [entries, setEntries] = useState<MonthEndEntry[]>([]);
  const [runResults, setRunResults] = useState<MonthEndRuleResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await monthEndApi.getStatus(year, month);
      setPeriod(status.period);
      setEntries(status.entries);
    } catch (err) {
      setPeriod(null);
      setEntries([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    setRunResults(null);
    fetchData();
  }, [fetchData]);

  const handleAction = async (action: () => Promise<unknown>, loadingKey: string) => {
    setActionLoading(loadingKey);
    setError(null);
    try {
      await action();
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRun = () =>
    handleAction(async () => {
      const result = await monthEndApi.run(year, month);
      setRunResults(result.results);
    }, 'run');

  const handleReverse = (entry: MonthEndEntry) => {
    const reason = window.prompt(t('monthEndReversePrompt'));
    if (reason === null) return;
    handleAction(() => monthEndApi.reverse(entry.id, reason || undefined), `reverse-${entry.id}`);
  };

  const monthLabel = `${year}-${String(month).padStart(2, '0')}`;
  const liveEntries = entries.filter((e) => e.status !== 'reversed');
  const reversedEntries = entries.filter((e) => e.status === 'reversed');

  return (
    <div>
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('monthEnd')}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('monthEndDescription')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={monthLabel}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map((v) => parseInt(v, 10));
              if (y && m) {
                setYear(y);
                setMonth(m);
              }
            }}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
          />
          <button
            onClick={handleRun}
            disabled={!period || period.is_closed || actionLoading === 'run'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Play className="h-4 w-4" />
            {actionLoading === 'run' ? t('monthEndRunning') : t('monthEndRun')}
          </button>
        </div>
      </div>

      {error && (
        <div className="card mb-6 p-4" style={{ borderColor: 'var(--danger, #dc2626)', backgroundColor: 'rgba(220, 38, 38, 0.05)' }}>
          <p className="text-sm" style={{ color: 'var(--danger, #dc2626)' }}>{error}</p>
        </div>
      )}

      {loading ? (
        <PageSkeleton hasStats={false} tableRows={3} tableColumns={5} />
      ) : !period ? (
        <EmptyState icon={CalendarCheck} title={t('monthEndNoPeriod')} message={t('monthEndNoPeriodMessage')} />
      ) : (
        <>
          <div className="card mb-6 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('period')} {monthLabel}
              </span>
            </div>
            {period.is_closed ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                <Lock className="h-3 w-3" /> {t('monthEndPeriodClosed')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: 'var(--success, #16a34a)' }}>
                <Unlock className="h-3 w-3" /> {t('monthEndPeriodOpen')}
              </span>
            )}
          </div>

          {runResults && (
            <div className="card mb-6 p-4">
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                {t('monthEndRunResults')}
              </h3>
              <ul className="space-y-1">
                {runResults.map((r) => (
                  <li key={r.rule_type} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t(`monthEndRule_${r.rule_type}`)}: {t(`monthEndRunStatus_${r.status}`)}
                    {r.message ? ` — ${r.message}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {liveEntries.length === 0 && reversedEntries.length === 0 ? (
            <EmptyState icon={CalendarCheck} title={t('monthEndNoEntries')} message={t('monthEndNoEntriesMessage')} />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th className="text-left py-2.5 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('monthEndRule')}</th>
                    <th className="text-left py-2.5 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('status')}</th>
                    <th className="text-left py-2.5 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('monthEndCreatedAt')}</th>
                    <th className="text-right py-2.5 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...liveEntries, ...reversedEntries].map((entry) => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="py-2.5 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {t(`monthEndRule_${entry.rule_type}`)}
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={entry.status} t={t} />
                      </td>
                      <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(entry.created_at).toLocaleString('et-EE')}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex gap-2">
                          {entry.status === 'draft' && (
                            <button
                              onClick={() => handleAction(() => monthEndApi.approve(entry.id), `approve-${entry.id}`)}
                              disabled={actionLoading === `approve-${entry.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
                              style={{ border: '1px solid var(--border)', color: 'var(--success, #16a34a)' }}
                            >
                              <Check className="h-3 w-3" />
                              {actionLoading === `approve-${entry.id}` ? '...' : t('monthEndApprove')}
                            </button>
                          )}
                          {entry.status !== 'reversed' && (
                            <button
                              onClick={() => handleReverse(entry)}
                              disabled={actionLoading === `reverse-${entry.id}` || period.is_closed}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
                              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            >
                              <Undo2 className="h-3 w-3" />
                              {actionLoading === `reverse-${entry.id}` ? '...' : t('monthEndReverse')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
