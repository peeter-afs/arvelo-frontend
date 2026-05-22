'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { reportsApi, type TurnoverReportData } from '@/lib/api/reports.api';
import { getErrorMessage } from '@/lib/api/client';
import { useClientDateInput } from '@/lib/hooks/useClientDateInput';
import { downloadCsv } from '@/lib/utils/csvExport';
import { getIsoCurrentYearStart, getIsoToday } from '@/lib/utils/date';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TurnoverReportPage() {
  const t = useTranslations('reports');
  const tAccounting = useTranslations('accounting');
  const tc = useTranslations('common');

  const [startDate, setStartDate] = useClientDateInput(getIsoCurrentYearStart);
  const [endDate, setEndDate] = useClientDateInput(getIsoToday);
  const [data, setData] = useState<TurnoverReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getTurnoverReport(startDate, endDate);
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    fetchData();
  }, [startDate, endDate, fetchData]);

  if (loading || !startDate || !endDate) {
    return <PageSkeleton hasStats tableRows={10} tableColumns={8} />;
  }

  if (error) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('turnoverReport')}</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{t('turnoverReportDescription')}</p>
        </div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!data || data.accounts.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('turnoverReport')}</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{t('turnoverReportDescription')}</p>
        </div>
        <EmptyState icon={BarChart3} title={t('turnoverReport')} message={tc('noData')} />
      </div>
    );
  }

  const { accounts, totals } = data;

  const handleExport = () => {
    const rows = accounts.map((a) => ({
      account_code: a.account_code,
      account_name: a.account_name,
      opening_debit: a.opening_debit,
      opening_credit: a.opening_credit,
      period_debit: a.period_debit,
      period_credit: a.period_credit,
      closing_debit: a.closing_debit,
      closing_credit: a.closing_credit,
    }));
    downloadCsv(rows, `turnover-report-${startDate}-${endDate}.csv`, [
      { key: 'account_code', label: 'Account Code' },
      { key: 'account_name', label: 'Account Name' },
      { key: 'opening_debit', label: 'Opening Debit' },
      { key: 'opening_credit', label: 'Opening Credit' },
      { key: 'period_debit', label: 'Period Debit' },
      { key: 'period_credit', label: 'Period Credit' },
      { key: 'closing_debit', label: 'Closing Debit' },
      { key: 'closing_credit', label: 'Closing Credit' },
    ]);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('turnoverReport')}</h1>
        <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{t('turnoverReportDescription')}</p>
      </div>

      <div className="card mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              <Calendar className="inline h-4 w-4 mr-1" />
              {tAccounting('startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              <Calendar className="inline h-4 w-4 mr-1" />
              {tAccounting('endDate')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg flex items-center space-x-2 text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <Download className="h-5 w-5" />
          <span>{tc('export')}</span>
        </button>
      </div>

      {/* Desktop Table */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }} rowSpan={2}>
                  {tAccounting('accountCode')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }} rowSpan={2}>
                  {tAccounting('accountName')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider border-l" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }} colSpan={2}>
                  {tc('openingBalance')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider border-l" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }} colSpan={2}>
                  {t('periodTurnover')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider border-l" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }} colSpan={2}>
                  {tc('closingBalance')}
                </th>
              </tr>
              <tr>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider border-l" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                  {tAccounting('debit')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {tAccounting('credit')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider border-l" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                  {tAccounting('debit')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {tAccounting('credit')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider border-l" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                  {tAccounting('debit')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {tAccounting('credit')}
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.account_code} className="transition-colors hover:opacity-80" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                    {a.account_code}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                    {a.account_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono tabular-nums border-l" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                    {a.opening_debit > 0 ? fmt(a.opening_debit) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {a.opening_credit > 0 ? fmt(a.opening_credit) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono tabular-nums border-l" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                    {a.period_debit > 0 ? fmt(a.period_debit) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {a.period_credit > 0 ? fmt(a.period_credit) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono tabular-nums border-l" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                    {a.closing_debit > 0 ? fmt(a.closing_debit) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {a.closing_credit > 0 ? fmt(a.closing_credit) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold" style={{ backgroundColor: 'var(--surface-elevated)', borderTop: '3px solid var(--text-primary)' }}>
                <td colSpan={2} className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                  {tc('total')}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono tabular-nums border-l" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                  {fmt(totals.opening_debit)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {fmt(totals.opening_credit)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono tabular-nums border-l" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                  {fmt(totals.period_debit)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {fmt(totals.period_credit)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono tabular-nums border-l" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                  {fmt(totals.closing_debit)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {fmt(totals.closing_credit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {accounts.map((a) => (
          <div key={a.account_code} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>{a.account_code}</span>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.account_name}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>{tc('openingBalance')}</span>
                <span className="font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {a.opening_debit > 0 ? `D ${fmt(a.opening_debit)}` : a.opening_credit > 0 ? `C ${fmt(a.opening_credit)}` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>{t('periodTurnover')}</span>
                <span className="font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  D {fmt(a.period_debit)} / C {fmt(a.period_credit)}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span style={{ color: 'var(--text-muted)' }}>{tc('closingBalance')}</span>
                <span className="font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {a.closing_debit > 0 ? `D ${fmt(a.closing_debit)}` : a.closing_credit > 0 ? `C ${fmt(a.closing_credit)}` : '-'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
