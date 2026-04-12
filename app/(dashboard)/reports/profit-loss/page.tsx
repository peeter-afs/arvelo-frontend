'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Download, Filter, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { reportsApi, type ProfitLossData } from '@/lib/api/reports.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

function getDefaultStartDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProfitLossPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');

  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getProfitLoss(startDate, endDate);
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <PageSkeleton hasStats tableRows={8} tableColumns={2} />;
  }

  if (error) {
    return (
      <div>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('profitLoss')}
          </h1>
        </div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!data || (data.revenue.length === 0 && data.expenses.length === 0)) {
    return (
      <div>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('profitLoss')}
          </h1>
        </div>
        <EmptyState
          icon={TrendingUp}
          title={t('profitLoss')}
          message="No profit & loss data available for the selected period."
        />
      </div>
    );
  }

  const { revenue, expenses, totalRevenue, totalExpenses, netIncome } = data;
  const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('profitLoss')}
        </h1>
        <p className="mt-1 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
          Review your company&apos;s income and expenses for the period
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="card mb-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Calendar className="inline h-4 w-4 mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--surface)',
                }}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Calendar className="inline h-4 w-4 mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--surface)',
                }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
              style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <Filter className="h-5 w-5" />
              <span>{tc('filter')}</span>
            </button>
            <button
              className="flex-1 sm:flex-none px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Download className="h-5 w-5" />
              <span>{tc('export')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* P&L Report */}
      <div className="card p-4 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('profitLoss')}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            For the period {startDate} to {endDate}
          </p>
        </div>

        {/* Revenue Section */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('revenue').toUpperCase()}
          </h3>
          <div className="ml-4 space-y-2">
            {revenue.map((item) => (
              <div
                key={item.account_code}
                className="flex justify-between pb-2"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{item.account_name}</span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  &euro;{formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
          <div
            className="ml-4 flex justify-between pt-2 mt-2 font-semibold"
            style={{ borderTop: '2px solid var(--border)' }}
          >
            <span style={{ color: 'var(--text-primary)' }}>Total {t('revenue')}</span>
            <span style={{ color: 'var(--text-primary)' }}>&euro;{formatCurrency(totalRevenue)}</span>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('expenses').toUpperCase()}
          </h3>
          <div className="ml-4 space-y-2">
            {expenses.map((item) => (
              <div
                key={item.account_code}
                className="flex justify-between pb-2"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{item.account_name}</span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  &euro;{formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
          <div
            className="ml-4 flex justify-between pt-2 mt-2 font-semibold"
            style={{ borderTop: '2px solid var(--border)' }}
          >
            <span style={{ color: 'var(--text-primary)' }}>Total {t('expenses')}</span>
            <span style={{ color: 'var(--text-primary)' }}>&euro;{formatCurrency(totalExpenses)}</span>
          </div>
        </div>

        {/* Net Income */}
        <div
          className="mb-6 sm:mb-8 flex justify-between pt-3 font-bold text-lg p-3 rounded"
          style={{
            borderTop: '4px solid var(--text-primary)',
            backgroundColor: 'var(--surface-elevated)',
          }}
        >
          <span style={{ color: 'var(--text-primary)' }}>{t('netIncome').toUpperCase()}</span>
          <span style={{ color: netIncome >= 0 ? 'var(--primary)' : 'var(--danger, #dc2626)' }}>
            &euro;{formatCurrency(netIncome)}
          </span>
        </div>

        {/* Key Metrics */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="rounded p-4" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Profit Margin
            </p>
            <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
              {profitMargin.toFixed(2)}%
            </p>
          </div>
          <div className="rounded p-4" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('revenue')}
            </p>
            <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
              &euro;{formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="rounded p-4" style={{ backgroundColor: 'var(--surface-elevated)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Total {t('expenses')}
            </p>
            <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
              &euro;{formatCurrency(totalExpenses)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
