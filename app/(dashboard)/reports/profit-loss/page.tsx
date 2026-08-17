'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, Download, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { reportsApi, type ProfitLossData, type ProfitLossLine } from '@/lib/api/reports.api';
import { getErrorMessage } from '@/lib/api/client';
import { useClientDateInput } from '@/lib/hooks/useClientDateInput';
import { downloadCsv } from '@/lib/utils/csvExport';
import {
  getIsoCurrentYearStart,
  getIsoToday,
  addDaysIso,
  shiftYearsIso,
  isFirstOfMonthIso,
  isLastOfMonthIso,
} from '@/lib/utils/date';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

type CompareMode = 'none' | 'previousPeriod' | 'previousYear' | 'custom';

function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y.slice(2)}`;
}

/** Comparison range for a preset: previous full month(s) for month-aligned
 *  ranges, otherwise a same-length window ending the day before the start. */
function previousPeriodRange(startDate: string, endDate: string) {
  const end = addDaysIso(startDate, -1);
  if (isFirstOfMonthIso(startDate) && isLastOfMonthIso(endDate)) {
    const months =
      (Number(endDate.slice(0, 4)) - Number(startDate.slice(0, 4))) * 12 +
      (Number(endDate.slice(5, 7)) - Number(startDate.slice(5, 7))) +
      1;
    const [y, m] = startDate.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1 - months, 1)).toISOString().slice(0, 10);
    return { startDate: start, endDate: end };
  }
  const days = (Date.parse(endDate) - Date.parse(startDate)) / 86400000 + 1;
  return { startDate: addDaysIso(end, -(days - 1)), endDate: end };
}

function DiffCell({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  const pct = previous !== 0 ? (diff / Math.abs(previous)) * 100 : null;
  return (
    <span className="w-28 shrink-0 text-right">
      <span className="block font-medium" style={{ color: 'var(--text-primary)' }}>
        {diff > 0 ? '+' : ''}
        {formatCurrency(diff)}
      </span>
      {pct !== null && (
        <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
          {pct > 0 ? '+' : ''}
          {pct.toFixed(1)}%
        </span>
      )}
    </span>
  );
}

function AmountCells({
  amount,
  compareAmount,
  comparing,
}: {
  amount: number;
  compareAmount: number;
  comparing: boolean;
}) {
  return (
    <>
      <span className="w-28 shrink-0 text-right font-medium" style={{ color: 'var(--text-primary)' }}>
        &euro;{formatCurrency(amount)}
      </span>
      {comparing && (
        <>
          <span className="w-28 shrink-0 text-right" style={{ color: 'var(--text-secondary)' }}>
            &euro;{formatCurrency(compareAmount)}
          </span>
          <DiffCell current={amount} previous={compareAmount} />
        </>
      )}
    </>
  );
}

export default function ProfitLossPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');

  const [startDate, setStartDate] = useClientDateInput(getIsoCurrentYearStart);
  const [endDate, setEndDate] = useClientDateInput(getIsoToday);
  const [compareMode, setCompareMode] = useState<CompareMode>('none');
  const [customCompareStart, setCustomCompareStart] = useState('');
  const [customCompareEnd, setCustomCompareEnd] = useState('');
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const compareRange = useMemo(() => {
    if (!startDate || !endDate) return null;
    switch (compareMode) {
      case 'previousPeriod':
        return previousPeriodRange(startDate, endDate);
      case 'previousYear':
        return { startDate: shiftYearsIso(startDate, -1), endDate: shiftYearsIso(endDate, -1) };
      case 'custom':
        return customCompareStart && customCompareEnd
          ? { startDate: customCompareStart, endDate: customCompareEnd }
          : null;
      default:
        return null;
    }
  }, [compareMode, startDate, endDate, customCompareStart, customCompareEnd]);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getProfitLoss(startDate, endDate, compareRange ?? undefined);
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, compareRange]);

  useEffect(() => {
    if (!startDate || !endDate) {
      return;
    }

    fetchData();
  }, [endDate, fetchData, startDate]);

  if (loading || !startDate || !endDate) {
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

  const comparing = !!(data && data.compareStartDate && data.compareEndDate);
  const periodLabel = `${shortDate(startDate)}–${shortDate(endDate)}`;
  const compareLabel =
    comparing && data
      ? `${shortDate(String(data.compareStartDate))}–${shortDate(String(data.compareEndDate))}`
      : '';

  const selectStyle = {
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--surface)',
  } as const;

  const dateSelector = (
    <div className="card mb-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end sm:flex-wrap">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              <Calendar className="inline h-4 w-4 mr-1" />
              {tc('startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              style={selectStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              <Calendar className="inline h-4 w-4 mr-1" />
              {tc('endDate')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              style={selectStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('comparison')}
            </label>
            <select
              value={compareMode}
              onChange={(e) => setCompareMode(e.target.value as CompareMode)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              style={selectStyle}
            >
              <option value="none">{t('comparisonNone')}</option>
              <option value="previousPeriod">{t('previousPeriod')}</option>
              <option value="previousYear">{t('samePeriodLastYear')}</option>
              <option value="custom">{t('customPeriod')}</option>
            </select>
          </div>
          {compareMode === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('comparisonPeriod')}: {tc('startDate')}
                </label>
                <input
                  type="date"
                  value={customCompareStart}
                  onChange={(e) => setCustomCompareStart(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  style={selectStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('comparisonPeriod')}: {tc('endDate')}
                </label>
                <input
                  type="date"
                  value={customCompareEnd}
                  onChange={(e) => setCustomCompareEnd(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  style={selectStyle}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!data) return;
              const mapRow = (item: ProfitLossLine) => ({
                account_code: item.account_code,
                account_name: item.account_name,
                amount: item.amount,
                ...(comparing
                  ? {
                      compare_amount: item.compare_amount ?? 0,
                      change: (item.amount - (item.compare_amount ?? 0)).toFixed(2),
                    }
                  : {}),
              });
              const rows = [...data.revenue.map(mapRow), ...data.expenses.map(mapRow)];
              const columns = [
                { key: 'account_code', label: t('accountCode') },
                { key: 'account_name', label: t('accountName') },
                { key: 'amount', label: tc('amount') },
                ...(comparing
                  ? [
                      { key: 'compare_amount', label: t('comparisonPeriod') },
                      { key: 'change', label: t('change') },
                    ]
                  : []),
              ];
              downloadCsv(rows, `profit-loss-${startDate}-to-${endDate}.csv`, columns);
            }}
            className="flex-1 sm:flex-none px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Download className="h-5 w-5" />
            <span>{tc('export')}</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (!data || (data.revenue.length === 0 && data.expenses.length === 0)) {
    return (
      <div>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('profitLoss')}
          </h1>
          <p className="mt-1 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {t('profitLossDescriptionDetailed')}
          </p>
        </div>
        {dateSelector}
        <EmptyState
          icon={TrendingUp}
          title={t('profitLoss')}
          message={t('noProfitLossData')}
        />
      </div>
    );
  }

  const { revenue, expenses, totalRevenue, totalExpenses, netIncome } = data;
  const compareTotalRevenue = data.compareTotalRevenue ?? 0;
  const compareTotalExpenses = data.compareTotalExpenses ?? 0;
  const compareNetIncome = data.compareNetIncome ?? 0;
  const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  const columnHeader = comparing ? (
    <div
      className="flex justify-between gap-4 mb-2 pb-2 text-xs font-medium"
      style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
    >
      <span className="min-w-0 flex-1" />
      <span className="w-28 shrink-0 text-right">{periodLabel}</span>
      <span className="w-28 shrink-0 text-right">{compareLabel}</span>
      <span className="w-28 shrink-0 text-right">{t('change')}</span>
    </div>
  ) : null;

  const lineRow = (item: ProfitLossLine) => (
    <div
      key={item.account_code}
      className="flex justify-between gap-4 pb-2"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span className="min-w-0 flex-1" style={{ color: 'var(--text-secondary)' }}>
        {item.account_name}
      </span>
      <AmountCells amount={item.amount} compareAmount={item.compare_amount ?? 0} comparing={comparing} />
    </div>
  );

  const totalRow = (label: string, amount: number, compareAmount: number) => (
    <div
      className="ml-4 flex justify-between gap-4 pt-2 mt-2 font-semibold"
      style={{ borderTop: '2px solid var(--border)' }}
    >
      <span className="min-w-0 flex-1" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <AmountCells amount={amount} compareAmount={compareAmount} comparing={comparing} />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('profitLoss')}
        </h1>
        <p className="mt-1 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
          {t('profitLossDescriptionDetailed')}
        </p>
      </div>

      {dateSelector}

      {/* P&L Report */}
      <div className="card p-4 sm:p-8 overflow-x-auto">
        <div className={comparing ? 'min-w-[560px]' : undefined}>
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('profitLoss')}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {t('periodRange', { startDate, endDate })}
            </p>
            {comparing && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('comparisonPeriod')}: {compareLabel}
              </p>
            )}
          </div>

          {columnHeader}

          {/* Revenue Section */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {t('revenue').toUpperCase()}
            </h3>
            <div className="ml-4 space-y-2">{revenue.map(lineRow)}</div>
            {totalRow(t('totalCategory', { category: t('revenue') }), totalRevenue, compareTotalRevenue)}
          </div>

          {/* Expenses Section */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {t('expenses').toUpperCase()}
            </h3>
            <div className="ml-4 space-y-2">{expenses.map(lineRow)}</div>
            {totalRow(t('totalCategory', { category: t('expenses') }), totalExpenses, compareTotalExpenses)}
          </div>

          {/* Net Income */}
          <div
            className="mb-6 sm:mb-8 flex justify-between gap-4 pt-3 font-bold text-lg p-3 rounded"
            style={{
              borderTop: '4px solid var(--text-primary)',
              backgroundColor: 'var(--surface-elevated)',
            }}
          >
            <span className="min-w-0 flex-1" style={{ color: 'var(--text-primary)' }}>
              {t('netIncome').toUpperCase()}
            </span>
            <span
              className="w-28 shrink-0 text-right"
              style={{ color: netIncome >= 0 ? 'var(--primary)' : 'var(--danger, #dc2626)' }}
            >
              &euro;{formatCurrency(netIncome)}
            </span>
            {comparing && (
              <>
                <span className="w-28 shrink-0 text-right" style={{ color: 'var(--text-secondary)' }}>
                  &euro;{formatCurrency(compareNetIncome)}
                </span>
                <DiffCell current={netIncome} previous={compareNetIncome} />
              </>
            )}
          </div>

          {/* Key Metrics */}
          <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="rounded p-4" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('profitMargin')}
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
                {t('totalCategory', { category: t('expenses') })}
              </p>
              <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                &euro;{formatCurrency(totalExpenses)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
