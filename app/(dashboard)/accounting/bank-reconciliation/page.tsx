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

type ReconciledFilter = 'all' | 'reconciled' | 'unreconciled';

const EMPTY_SUMMARY: BankReconciliationSummary = {
  reconciled_count: 0,
  unreconciled_count: 0,
  reconciled_amount: 0,
  unreconciled_amount: 0,
  net_amount: 0,
};

function formatAmount(value: number, currency: string) {
  return `${value.toFixed(2)} ${currency}`;
}

export default function BankReconciliationPage() {
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
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [bankAccountId, reconciledFilter, dateFrom, dateTo]);

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

  const difference = useMemo(() => {
    const parsed = Number(statementBalance.replace(',', '.'));
    if (!statementBalance.trim() || !Number.isFinite(parsed)) return null;
    return Math.round((parsed - summary.reconciled_amount) * 100) / 100;
  }, [statementBalance, summary.reconciled_amount]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t('bankReconciliation')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{t('bankReconciliationDescription')}</p>
      </div>

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

      <div className="card p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('bankAccount')}</span>
            <select
              value={bankAccountId}
              onChange={(event) => setBankAccountId(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 px-3"
            >
              <option value="">{t('filterAll')}</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} {account.iban ? `· ${account.iban}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('status')}</span>
            <select
              value={reconciledFilter}
              onChange={(event) => setReconciledFilter(event.target.value as ReconciledFilter)}
              className="h-11 w-full rounded-lg border border-slate-200 px-3"
            >
              <option value="all">{t('filterAll')}</option>
              <option value="unreconciled">{t('filterUnreconciled')}</option>
              <option value="reconciled">{t('filterReconciled')}</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('reconDateFrom')}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 px-3"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('reconDateTo')}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 px-3"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label={t('reconciledCountLabel')}
          value={String(summary.reconciled_count)}
          hint={formatAmount(summary.reconciled_amount, currency)}
          icon={ShieldCheck}
          tone="success"
        />
        <SummaryCard
          label={t('unreconciledCountLabel')}
          value={String(summary.unreconciled_count)}
          hint={formatAmount(summary.unreconciled_amount, currency)}
          icon={ShieldOff}
          tone="warning"
        />
        <SummaryCard
          label={t('netAmount')}
          value={formatAmount(summary.net_amount, currency)}
          icon={Scale}
          tone="neutral"
        />
        <div className="card p-5">
          <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">{t('statementBalance')}</div>
          <input
            type="text"
            inputMode="decimal"
            value={statementBalance}
            onChange={(event) => setStatementBalance(event.target.value)}
            placeholder="0.00"
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
          {difference !== null ? (
            <div className="mt-2 text-sm">
              <span className="text-slate-500">{t('reconciliationDifference')}: </span>
              <span className={`font-mono font-semibold ${difference === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {formatAmount(difference, currency)}
              </span>
              {difference === 0 && (
                <div className="mt-1 text-xs text-emerald-600">{t('reconciliationBalanced')}</div>
              )}
            </div>
          ) : (
            <div className="mt-2 text-xs text-slate-400">{t('statementBalanceHint')}</div>
          )}
        </div>
      </div>

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
          <div className="flex flex-wrap gap-2">
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">{t('reconciledStatus')}</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {items.map((item) => (
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
                    <td className="px-4 py-4 text-right font-mono text-sm text-slate-900">
                      {formatAmount(item.amount, item.currency)}
                    </td>
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
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'neutral' | 'success' | 'warning';
}) {
  const iconClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-600'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-600'
        : 'bg-slate-100 text-slate-700';

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="mt-1 font-mono text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
