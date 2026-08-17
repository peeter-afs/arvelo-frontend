'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Calendar, BarChart3 } from 'lucide-react';
import { reportsApi, type BalanceSheetData, type BalanceSheetLine } from '@/lib/api/reports.api';
import { getErrorMessage } from '@/lib/api/client';
import { useClientDateInput } from '@/lib/hooks/useClientDateInput';
import { downloadCsv } from '@/lib/utils/csvExport';
import { getIsoToday, shiftYearsIso } from '@/lib/utils/date';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

type CompareMode = 'none' | 'previousYearEnd' | 'previousYear' | 'custom';

function formatCurrency(value: number): string {
  return value.toLocaleString('et-EE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function DiffCell({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  return (
    <span className="w-32 shrink-0 text-right font-medium" style={{ color: 'var(--text-primary)' }}>
      {diff > 0 ? '+' : ''}
      {formatCurrency(diff)}
    </span>
  );
}

function useLineName() {
  const t = useTranslations('reports');
  return (item: BalanceSheetLine) => {
    if (item.special === 'current_year_earnings') return t('currentYearEarnings');
    if (item.special === 'prior_period_earnings') return t('priorPeriodEarnings');
    return item.account_name;
  };
}

function SectionLineItems({ items, comparing }: { items: BalanceSheetLine[]; comparing: boolean }) {
  const lineName = useLineName();

  return (
    <>
      {/* Desktop rows */}
      <div className="hidden sm:block ml-4 space-y-2">
        {items.map((item) => (
          <div
            key={item.special || item.account_code}
            className="flex justify-between gap-4 pb-2"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="min-w-0 flex-1" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-mono text-xs mr-2" style={{ color: 'var(--text-muted)' }}>
                {item.account_code}
              </span>
              {lineName(item)}
            </span>
            <span className="w-32 shrink-0 text-right font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(item.balance)}
            </span>
            {comparing && (
              <>
                <span className="w-32 shrink-0 text-right" style={{ color: 'var(--text-secondary)' }}>
                  {formatCurrency(item.compare_balance ?? 0)}
                </span>
                <DiffCell current={item.balance} previous={item.compare_balance ?? 0} />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {items.map((item) => (
          <div
            key={item.special || item.account_code}
            className="card p-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {item.account_code}
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {lineName(item)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(item.balance)}
                </p>
                {comparing && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(item.compare_balance ?? 0)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SectionTotal({
  label,
  amount,
  compareAmount,
  comparing,
}: {
  label: string;
  amount: number;
  compareAmount: number;
  comparing: boolean;
}) {
  return (
    <div
      className="flex justify-between gap-4 pt-3 mt-3 font-bold text-lg p-3 rounded"
      style={{
        borderTop: '3px solid var(--text-primary)',
        backgroundColor: 'var(--surface)',
        color: 'var(--text-primary)',
      }}
    >
      <span className="min-w-0 flex-1">{label}</span>
      <span className="w-32 shrink-0 text-right">{formatCurrency(amount)}</span>
      {comparing && (
        <>
          <span className="hidden sm:inline w-32 shrink-0 text-right" style={{ color: 'var(--text-secondary)' }}>
            {formatCurrency(compareAmount)}
          </span>
          <span className="hidden sm:inline w-32 shrink-0 text-right">
            {amount - compareAmount > 0 ? '+' : ''}
            {formatCurrency(amount - compareAmount)}
          </span>
        </>
      )}
    </div>
  );
}

export default function BalanceSheetPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');

  const [asOfDate, setAsOfDate] = useClientDateInput(getIsoToday);
  const [compareMode, setCompareMode] = useState<CompareMode>('none');
  const [customCompareDate, setCustomCompareDate] = useState('');
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const compareDate = useMemo(() => {
    if (!asOfDate) return null;
    switch (compareMode) {
      case 'previousYearEnd':
        return `${Number(asOfDate.slice(0, 4)) - 1}-12-31`;
      case 'previousYear':
        return shiftYearsIso(asOfDate, -1);
      case 'custom':
        return customCompareDate || null;
      default:
        return null;
    }
  }, [compareMode, asOfDate, customCompareDate]);

  const fetchData = useCallback(async () => {
    if (!asOfDate) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getBalanceSheet(asOfDate, compareDate ?? undefined);
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [asOfDate, compareDate]);

  useEffect(() => {
    if (!asOfDate) {
      return;
    }

    fetchData();
  }, [asOfDate, fetchData]);

  const isEmpty =
    data &&
    data.assets.length === 0 &&
    data.liabilities.length === 0 &&
    data.equity.length === 0;

  if (!asOfDate) {
    return <PageSkeleton hasStats tableRows={8} tableColumns={3} />;
  }

  const comparing = !!(data && data.compareAsOfDate);
  const compareDateLabel = comparing ? String(data?.compareAsOfDate).slice(0, 10) : '';

  const inputStyle = {
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text-primary)',
  } as const;

  const columnHeader = comparing ? (
    <div
      className="hidden sm:flex ml-4 justify-between gap-4 mb-2 pb-2 text-xs font-medium"
      style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
    >
      <span className="min-w-0 flex-1" />
      <span className="w-32 shrink-0 text-right">{String(data?.asOfDate).slice(0, 10)}</span>
      <span className="w-32 shrink-0 text-right">{compareDateLabel}</span>
      <span className="w-32 shrink-0 text-right">{t('change')}</span>
    </div>
  ) : null;

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
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end sm:flex-wrap">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Calendar className="inline h-4 w-4 mr-1" />
              {tc('asOfDate')}
            </label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('comparison')}
            </label>
            <select
              value={compareMode}
              onChange={(e) => setCompareMode(e.target.value as CompareMode)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={inputStyle}
            >
              <option value="none">{t('comparisonNone')}</option>
              <option value="previousYearEnd">{t('previousYearEnd')}</option>
              <option value="previousYear">{t('sameDateLastYear')}</option>
              <option value="custom">{t('customPeriod')}</option>
            </select>
          </div>
          {compareMode === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                {t('comparisonPeriod')}
              </label>
              <input
                type="date"
                value={customCompareDate}
                onChange={(e) => setCustomCompareDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={inputStyle}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!data) return;
              const rows = [...data.assets, ...data.liabilities, ...data.equity].map((item) => ({
                account_code: item.account_code,
                account_name: item.account_name,
                balance: item.balance,
                ...(comparing
                  ? {
                      compare_balance: item.compare_balance ?? 0,
                      change: (item.balance - (item.compare_balance ?? 0)).toFixed(2),
                    }
                  : {}),
              }));
              downloadCsv(rows, `balance-sheet-${asOfDate}.csv`, [
                { key: 'account_code', label: t('accountCode') },
                { key: 'account_name', label: t('accountName') },
                { key: 'balance', label: tc('amount') },
                ...(comparing
                  ? [
                      { key: 'compare_balance', label: t('comparisonPeriod') },
                      { key: 'change', label: t('change') },
                    ]
                  : []),
              ]);
            }}
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
          title={t('balanceSheet')}
          message={t('noBalanceSheetData')}
        />
      )}

      {!loading && !error && data && !isEmpty && (
        <div className="card p-4 sm:p-8 overflow-x-auto">
          <div className={comparing ? 'sm:min-w-[640px]' : undefined}>
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('balanceSheet')}
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                {tc('asOfDate')} {String(data.asOfDate).slice(0, 10)}
              </p>
              {comparing && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('comparisonPeriod')}: {compareDateLabel}
                </p>
              )}
            </div>

            {columnHeader}

            {/* Assets Section */}
            <div className="mb-8">
              <h3
                className="text-lg sm:text-xl font-bold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('assets').toUpperCase()}
              </h3>
              <SectionLineItems items={data.assets} comparing={comparing} />
              <SectionTotal
                label={`${t('assets').toUpperCase()} - ${tc('total', { fallback: 'TOTAL' })}`}
                amount={data.totalAssets}
                compareAmount={data.compareTotalAssets ?? 0}
                comparing={comparing}
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
              <SectionLineItems items={data.liabilities} comparing={comparing} />
              <div
                className="hidden sm:flex ml-4 justify-between gap-4 pt-2 mt-2 font-semibold"
                style={{ borderTop: '2px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <span className="min-w-0 flex-1">{tc('total', { fallback: 'Total' })} {t('liabilities')}</span>
                <span className="w-32 shrink-0 text-right">{formatCurrency(data.totalLiabilities)}</span>
                {comparing && (
                  <>
                    <span className="w-32 shrink-0 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {formatCurrency(data.compareTotalLiabilities ?? 0)}
                    </span>
                    <DiffCell current={data.totalLiabilities} previous={data.compareTotalLiabilities ?? 0} />
                  </>
                )}
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
              <SectionLineItems items={data.equity} comparing={comparing} />
              <div
                className="hidden sm:flex ml-4 justify-between gap-4 pt-2 mt-2 font-semibold"
                style={{ borderTop: '2px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <span className="min-w-0 flex-1">{tc('total', { fallback: 'Total' })} {t('equity')}</span>
                <span className="w-32 shrink-0 text-right">{formatCurrency(data.totalEquity)}</span>
                {comparing && (
                  <>
                    <span className="w-32 shrink-0 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {formatCurrency(data.compareTotalEquity ?? 0)}
                    </span>
                    <DiffCell current={data.totalEquity} previous={data.compareTotalEquity ?? 0} />
                  </>
                )}
              </div>
            </div>

            {/* Liabilities & Equity Total */}
            <SectionTotal
              label={`${t('liabilities').toUpperCase()} & ${t('equity').toUpperCase()}`}
              amount={data.totalLiabilities + data.totalEquity}
              compareAmount={(data.compareTotalLiabilities ?? 0) + (data.compareTotalEquity ?? 0)}
              comparing={comparing}
            />

            {/* Balance check */}
            <div className="mt-4 text-sm text-center">
              <p
                style={{
                  color:
                    Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01
                      ? 'var(--text-muted)'
                      : 'var(--danger, #dc2626)',
                }}
              >
                {t('balanceCheck')}:{' '}
                {Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01
                  ? tc('balanced')
                  : `${tc('notBalanced')} (${formatCurrency(
                      data.totalAssets - (data.totalLiabilities + data.totalEquity)
                    )})`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
