'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Filter, Calendar, BarChart3 } from 'lucide-react';
import { reportsApi, type BalanceSheetData, type BalanceSheetLine } from '@/lib/api/reports.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatCurrency(value: number): string {
  return value.toLocaleString('et-EE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SectionLineItems({ items }: { items: BalanceSheetLine[] }) {
  return (
    <>
      {/* Desktop rows */}
      <div className="hidden sm:block ml-4 space-y-2">
        {items.map((item) => (
          <div
            key={item.account_code}
            className="flex justify-between pb-2"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>
              <span className="font-mono text-xs mr-2" style={{ color: 'var(--text-muted)' }}>
                {item.account_code}
              </span>
              {item.account_name}
            </span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(item.balance)}
            </span>
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {items.map((item) => (
          <div
            key={item.account_code}
            className="card p-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {item.account_code}
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {item.account_name}
                </p>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(item.balance)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SectionTotal({ label, amount }: { label: string; amount: number }) {
  return (
    <div
      className="flex justify-between pt-3 mt-3 font-bold text-lg p-3 rounded"
      style={{
        borderTop: '3px solid var(--text-primary)',
        backgroundColor: 'var(--surface)',
        color: 'var(--text-primary)',
      }}
    >
      <span>{label}</span>
      <span>{formatCurrency(amount)}</span>
    </div>
  );
}

export default function BalanceSheetPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');

  const [asOfDate, setAsOfDate] = useState(getTodayString);
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getBalanceSheet(asOfDate);
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

  const isEmpty =
    data &&
    data.assets.length === 0 &&
    data.liabilities.length === 0 &&
    data.equity.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('balanceSheet')}
        </h1>
        <p className="mt-1 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
          {t('balanceSheetDescription', { fallback: '' })}
        </p>
      </div>

      {/* Date Selector & Actions */}
      <div
        className="card mb-6 p-4 sm:p-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4"
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Calendar className="inline h-4 w-4 mr-1" />
              As of Date
            </label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 sm:flex-initial px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
            style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            <Filter className="h-5 w-5" />
            <span>{tc('filter')}</span>
          </button>
          <button
            className="flex-1 sm:flex-initial px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Download className="h-5 w-5" />
            <span>{tc('export')}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && <PageSkeleton hasStats tableRows={8} tableColumns={3} />}

      {!loading && error && <ErrorState message={error} onRetry={fetchData} />}

      {!loading && !error && isEmpty && (
        <EmptyState
          icon={BarChart3}
          title="No balance sheet data"
          message="There is no financial data available for the selected date."
        />
      )}

      {!loading && !error && data && !isEmpty && (
        <div className="card p-4 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('balanceSheet')}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              As of {data.asOfDate}
            </p>
          </div>

          {/* Assets Section */}
          <div className="mb-8">
            <h3
              className="text-lg sm:text-xl font-bold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('assets').toUpperCase()}
            </h3>
            <SectionLineItems items={data.assets} />
            <SectionTotal
              label={`${t('assets').toUpperCase()} - ${tc('total', { fallback: 'TOTAL' })}`}
              amount={data.totalAssets}
            />
          </div>

          {/* Liabilities Section */}
          <div className="mb-8">
            <h3
              className="text-lg sm:text-xl font-bold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('liabilities').toUpperCase()}
            </h3>
            <SectionLineItems items={data.liabilities} />
            <div
              className="hidden sm:flex ml-4 justify-between pt-2 mt-2 font-semibold"
              style={{ borderTop: '2px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <span>{tc('total', { fallback: 'Total' })} {t('liabilities')}</span>
              <span>{formatCurrency(data.totalLiabilities)}</span>
            </div>
          </div>

          {/* Equity Section */}
          <div className="mb-8">
            <h3
              className="text-lg sm:text-xl font-bold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('equity').toUpperCase()}
            </h3>
            <SectionLineItems items={data.equity} />
            <div
              className="hidden sm:flex ml-4 justify-between pt-2 mt-2 font-semibold"
              style={{ borderTop: '2px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <span>{tc('total', { fallback: 'Total' })} {t('equity')}</span>
              <span>{formatCurrency(data.totalEquity)}</span>
            </div>
          </div>

          {/* Liabilities & Equity Total */}
          <SectionTotal
            label={`${t('liabilities').toUpperCase()} & ${t('equity').toUpperCase()}`}
            amount={data.totalLiabilities + data.totalEquity}
          />

          {/* Balance check */}
          <div className="mt-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            <p>
              Balance Check:{' '}
              {Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01
                ? 'Balanced'
                : 'Not Balanced'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
