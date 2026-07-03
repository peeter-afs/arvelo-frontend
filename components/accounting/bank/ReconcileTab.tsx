'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  CheckCircle2,
  Landmark,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Scale,
} from 'lucide-react';
import {
  bankingApi,
  type BankAccountRecord,
  type BankReconciliationItem,
  type BankReconciliationSummary,
} from '@/lib/api/banking.api';
import { getErrorMessage } from '@/lib/api/client';
import { BankFilterRow, BankFooterBar, BankProgress, BankSummaryStrip } from './shared';

type ReconciledFilter = 'all' | 'reconciled' | 'unreconciled';

const EMPTY_SUMMARY: BankReconciliationSummary = {
  reconciled_count: 0,
  unreconciled_count: 0,
  reconciled_amount: 0,
  unreconciled_amount: 0,
  net_amount: 0,
  opening_balance: null,
  closing_balance: null,
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function formatAmount(value: number, currency: string) {
  return `${value.toFixed(2)} ${currency}`;
}

export function ReconcileTab({
  onUnreconciledCountChange,
}: {
  onUnreconciledCountChange?: (count: number) => void;
}) {
  const t = useTranslations('accounting');
  const [bankAccounts, setBankAccounts] = useState<BankAccountRecord[]>([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [reconciledFilter, setReconciledFilter] = useState<ReconciledFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [items, setItems] = useState<BankReconciliationItem[]>([]);
  const [summary, setSummary] = useState<BankReconciliationSummary>(EMPTY_SUMMARY);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statementBalance, setStatementBalance] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currency = items[0]?.currency || bankAccounts.find((a) => a.id === bankAccountId)?.currency || 'EUR';

  useEffect(() => {
    const load = async () => {
      try {
        const accounts = await bankingApi.listBankAccounts();
        const active = accounts.filter((account) => account.is_active);
        setBankAccounts(active);
        setBankAccountId((current) => current || active[0]?.id || '');
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    };

    void load();
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await bankingApi.getReconciliation({
        bank_account_id: bankAccountId || undefined,
        reconciled: reconciledFilter === 'all' ? undefined : reconciledFilter === 'reconciled',
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setItems(result.items);
      setSummary(result.summary);
      setSelected(new Set());
      onUnreconciledCountChange?.(result.summary.unreconciled_count);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [bankAccountId, reconciledFilter, dateFrom, dateTo, onUnreconciledCountChange]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const allSelected = items.length > 0 && items.every((item) => selected.has(item.transaction_id));

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((item) => item.transaction_id)));
  };

  const toggleSelectRow = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleRow = async (item: BankReconciliationItem) => {
    setPendingRowId(item.transaction_id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await bankingApi.reconcileTransactions({
        transaction_ids: [item.transaction_id],
        is_reconciled: !item.is_reconciled,
      });
      await loadData();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingRowId(null);
    }
  };

  const handleBulk = async (isReconciled: boolean) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    setIsBulkUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await bankingApi.reconcileTransactions({ transaction_ids: ids, is_reconciled: isReconciled });
      await loadData();
      setSuccessMessage(t('reconciledRowsUpdated', { count: result.updated_count }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const statusLabel = (status: string) => {
    if (status === 'matched_invoice') return t('statusMatchedInvoice');
    if (status === 'matched_manual') return t('statusMatchedManual');
    return t('statusUnmatched');
  };

  // Statement balance math. When the backend has statement balances for the
  // selected account, the difference is automatic (closing vs book position);
  // otherwise fall back to the manually typed statement balance.
  const totalCount = summary.reconciled_count + summary.unreconciled_count;
  const openingBalance = summary.opening_balance ?? null;
  const statementClosing =
    summary.closing_balance ?? (openingBalance != null ? round2(openingBalance + summary.net_amount) : null);
  const usingManualBalance = statementClosing == null;

  const manualClosing = useMemo(() => {
    const parsed = Number(statementBalance.replace(',', '.'));
    if (!statementBalance.trim() || !Number.isFinite(parsed)) return null;
    return round2(parsed);
  }, [statementBalance]);

  const closingBalance = usingManualBalance ? manualClosing : statementClosing;
  const bookBalance = usingManualBalance
    ? summary.reconciled_amount
    : round2((openingBalance ?? 0) + summary.reconciled_amount);
  const difference = closingBalance != null ? round2(closingBalance - bookBalance) : null;
  const balanced = difference !== null && Math.abs(difference) < 0.005;

  const fmt = (value: number | null) => (value == null ? '—' : formatAmount(value, currency));

  // Running statement balance: display rows in chronological order anchored
  // between the statement opening and closing balances.
  const showRunningBalance = openingBalance != null;
  const displayRows = useMemo(() => {
    if (openingBalance == null) {
      return items.map((item) => ({ item, running: null as number | null }));
    }
    const sorted = [...items].sort((a, b) =>
      String(a.value_date || a.tx_date || '').localeCompare(String(b.value_date || b.tx_date || ''))
    );
    let running = openingBalance;
    return sorted.map((item) => {
      running = round2(running + item.amount);
      return { item, running: running as number | null };
    });
  }, [items, openingBalance]);

  const openingRowDate =
    dateFrom || displayRows[0]?.item.value_date || displayRows[0]?.item.tx_date || '';
  const closingRowDate =
    dateTo
    || displayRows[displayRows.length - 1]?.item.value_date
    || displayRows[displayRows.length - 1]?.item.tx_date
    || '';

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="card border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      <BankSummaryStrip
        icon={Scale}
        tone="neutral"
        cells={[
          { label: t('statementClosingBalance'), value: fmt(closingBalance), sub: t('perStatement') },
          {
            label: t('bookReconciledBalance'),
            value: fmt(bookBalance),
            sub: t('reconciledCountOfTotal', { done: summary.reconciled_count, total: totalCount }),
          },
          {
            label: t('reconciliationDifference'),
            value: fmt(difference),
            color: balanced ? 'var(--pos, #0e7b5a)' : 'var(--warning)',
          },
        ]}
        trailing={
          balanced ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t('reconciledStatus')}
            </span>
          ) : (
            <BankProgress
              label={t('reconciledStatus')}
              done={summary.reconciled_count}
              total={totalCount}
              tone="accent"
            />
          )
        }
      />

      <BankFilterRow>
        <select
          value={bankAccountId}
          onChange={(event) => setBankAccountId(event.target.value)}
          aria-label={t('bankAccount')}
          className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700"
        >
          <option value="">{t('filterAll')}</option>
          {bankAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} {account.iban ? `· ${account.iban}` : ''}
            </option>
          ))}
        </select>
        <select
          value={reconciledFilter}
          onChange={(event) => setReconciledFilter(event.target.value as ReconciledFilter)}
          aria-label={t('status')}
          className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700"
        >
          <option value="all">{t('filterAll')}</option>
          <option value="unreconciled">{t('filterUnreconciled')}</option>
          <option value="reconciled">{t('filterReconciled')}</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          aria-label={t('reconDateFrom')}
          className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          aria-label={t('reconDateTo')}
          className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700"
        />
        {usingManualBalance && (
          <label className="ml-auto inline-flex items-center gap-2 text-xs text-slate-500">
            <span>{t('statementBalance')}</span>
            <input
              type="text"
              inputMode="decimal"
              value={statementBalance}
              onChange={(event) => setStatementBalance(event.target.value)}
              placeholder="0.00"
              title={t('statementBalanceHint')}
              className="h-9 w-32 rounded-lg border border-slate-200 px-2.5 text-right font-mono text-sm tabular-nums text-slate-900"
            />
          </label>
        )}
      </BankFilterRow>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Landmark className="h-4 w-4 text-slate-400" />
            {selected.size > 0 ? (
              <span className="font-medium text-slate-900">{t('selectedForReconcile', { count: selected.size })}</span>
            ) : (
              <span>{t('bankReconciliation')}</span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('reconcilingData')}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-sm text-slate-500">{t('noTransactionsToReconcile')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">{t('date')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">{t('counterparty')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">{t('reference')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">{t('status')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">{t('amount')}</th>
                  {showRunningBalance && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">{t('statementRunningBalance')}</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">{t('reconciledStatus')}</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {showRunningBalance && (
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-sm text-slate-600">{openingRowDate || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700" colSpan={3}>
                      {t('statementOpeningBalanceRow')}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-slate-700">
                      {fmt(openingBalance)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                )}
                {displayRows.map(({ item, running }) => (
                  <tr key={item.transaction_id} className="border-b border-slate-100 align-top">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(item.transaction_id)}
                        onChange={() => toggleSelectRow(item.transaction_id)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.tx_date || item.value_date || '-'}</td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-slate-900">{item.counterparty_name || '-'}</div>
                      {item.description && <div className="mt-1 text-xs text-slate-500">{item.description}</div>}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{item.reference || '-'}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{statusLabel(item.matched_status)}</td>
                    <td className="px-4 py-4 text-right font-mono text-sm tabular-nums text-slate-900">
                      {formatAmount(item.amount, item.currency)}
                    </td>
                    {showRunningBalance && (
                      <td className="px-4 py-4 text-right font-mono text-sm tabular-nums text-slate-500">
                        {running != null ? formatAmount(running, item.currency) : '-'}
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => void handleToggleRow(item)}
                        disabled={pendingRowId === item.transaction_id || isBulkUpdating}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50 ${
                          item.is_reconciled
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {pendingRowId === item.transaction_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : item.is_reconciled ? (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        ) : (
                          <ShieldOff className="h-3.5 w-3.5" />
                        )}
                        <span>{item.is_reconciled ? t('reconciledStatus') : t('unreconciledStatus')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {showRunningBalance && (
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-sm text-slate-600">{closingRowDate || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700" colSpan={3}>
                      {t('statementClosingBalanceRow')}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-slate-700">
                      {fmt(closingBalance)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BankFooterBar
        status={t('reconciledCountOfTotal', { done: summary.reconciled_count, total: totalCount })}
      >
        <button
          onClick={() => handleBulk(true)}
          disabled={selected.size === 0 || isBulkUpdating}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          <span>{t('markReconciled')}</span>
        </button>
        <button
          onClick={() => handleBulk(false)}
          disabled={selected.size === 0 || isBulkUpdating}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldOff className="h-4 w-4" />
          <span>{t('markUnreconciled')}</span>
        </button>
        <button
          onClick={() => setSuccessMessage(t('reconciliationBalanced'))}
          disabled={!balanced}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{t('confirmReconciliation')}</span>
        </button>
      </BankFooterBar>
    </div>
  );
}
