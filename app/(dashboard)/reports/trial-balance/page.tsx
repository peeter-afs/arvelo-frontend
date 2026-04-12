'use client';

import { useState, useEffect, useCallback } from 'react';
import { Scale, Download, Filter, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { reportsApi, type TrialBalanceData } from '@/lib/api/reports.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

function getToday(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export default function TrialBalancePage() {
  const t = useTranslations('reports');
  const tAccounting = useTranslations('accounting');
  const tCommon = useTranslations('common');

  const [asOfDate, setAsOfDate] = useState(getToday);
  const [data, setData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getTrialBalance(asOfDate);
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <PageSkeleton hasStats tableRows={10} tableColumns={4} />;
  }

  if (error) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('trialBalance')}
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            {tAccounting('debit')} &amp; {tAccounting('credit')}
          </p>
        </div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!data || data.accounts.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('trialBalance')}
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            {tAccounting('debit')} &amp; {tAccounting('credit')}
          </p>
        </div>
        <EmptyState
          icon={Scale}
          title={t('trialBalance')}
          message={tCommon('noData')}
        />
      </div>
    );
  }

  const { accounts, totalDebit, totalCredit, isBalanced } = data;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('trialBalance')}
        </h1>
        <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
          {tAccounting('debit')} &amp; {tAccounting('credit')}
        </p>
      </div>

      {/* Date Selector */}
      <div
        className="card mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6"
      >
        <div className="flex space-x-4 items-end">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Calendar className="inline h-4 w-4 mr-1" />
              {tCommon('date')}
            </label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            className="px-4 py-2 rounded-lg flex items-center space-x-2 hover:opacity-80 transition-opacity"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <Filter className="h-5 w-5" />
            <span>{tCommon('filter')}</span>
          </button>
          <button
            className="px-4 py-2 rounded-lg flex items-center space-x-2 text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Download className="h-5 w-5" />
            <span>{tCommon('export')}</span>
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="card overflow-hidden hidden md:block">
        <table className="min-w-full">
          <thead style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {tAccounting('accountCode')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {tAccounting('accountName')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {tAccounting('accountType')}
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {tAccounting('debit')}
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {tAccounting('credit')}
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr
                key={account.account_code}
                className="transition-colors hover:opacity-80"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {account.account_code}
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {account.account_name}
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {account.account_type}
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {account.debit > 0
                    ? account.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '-'}
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {account.credit > 0
                    ? account.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr
              className="font-bold"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderTop: '3px solid var(--text-primary)',
              }}
            >
              <td
                colSpan={3}
                className="px-6 py-4 text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                {tCommon('total')}
              </td>
              <td
                className="px-6 py-4 text-sm text-right"
                style={{ color: 'var(--text-primary)' }}
              >
                {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td
                className="px-6 py-4 text-sm text-right"
                style={{ color: 'var(--text-primary)' }}
              >
                {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {accounts.map((account) => (
          <div
            key={account.account_code}
            className="card p-4"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {account.account_code}
                </span>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {account.account_name}
                </p>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  color: 'var(--text-secondary)',
                }}
              >
                {account.account_type}
              </span>
            </div>
            <div
              className="flex justify-between text-sm pt-2"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{tAccounting('debit')}: </span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {account.debit > 0
                    ? account.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '-'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>{tAccounting('credit')}: </span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {account.credit > 0
                    ? account.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Mobile Totals Card */}
        <div
          className="card p-4 font-bold"
          style={{ borderTop: '3px solid var(--text-primary)' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
            {tCommon('total')}
          </p>
          <div className="flex justify-between text-sm">
            <div>
              <span style={{ color: 'var(--text-muted)' }}>{tAccounting('debit')}: </span>
              <span style={{ color: 'var(--text-primary)' }}>
                {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>{tAccounting('credit')}: </span>
              <span style={{ color: 'var(--text-primary)' }}>
                {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Status Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tAccounting('debit')}
          </p>
          <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
            {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card p-6">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tAccounting('credit')}
          </p>
          <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
            {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card p-6">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tCommon('status')}
          </p>
          <p
            className="text-2xl font-bold mt-2"
            style={{ color: isBalanced ? 'var(--success)' : 'var(--danger)' }}
          >
            {isBalanced
              ? t('trialBalance') + ' \u2713'
              : Math.abs(totalDebit - totalCredit).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
          </p>
        </div>
      </div>
    </div>
  );
}
