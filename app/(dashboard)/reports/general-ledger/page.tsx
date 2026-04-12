'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, Calendar } from 'lucide-react';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { reportsApi, type GeneralLedgerData } from '@/lib/api/reports.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField, FormInput, FormSelect } from '@/components/ui/FormField';

function getDefaultStartDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GeneralLedgerPage() {
  const t = useTranslations('reports');
  const tAccounting = useTranslations('accounting');
  const tCommon = useTranslations('common');

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);

  const [ledgerData, setLedgerData] = useState<GeneralLedgerData | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  // Fetch accounts on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchAccounts() {
      setAccountsLoading(true);
      setAccountsError(null);
      try {
        const data = await accountingApi.getAccounts();
        if (!cancelled) setAccounts(data);
      } catch (err) {
        if (!cancelled) setAccountsError(getErrorMessage(err));
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    }
    fetchAccounts();
    return () => { cancelled = true; };
  }, []);

  // Fetch ledger data when account or dates change
  const fetchLedger = useCallback(async () => {
    if (!selectedAccountId) {
      setLedgerData(null);
      return;
    }
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const data = await reportsApi.getGeneralLedger(selectedAccountId, startDate, endDate);
      setLedgerData(data);
    } catch (err) {
      setLedgerError(getErrorMessage(err));
      setLedgerData(null);
    } finally {
      setLedgerLoading(false);
    }
  }, [selectedAccountId, startDate, endDate]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  if (accountsLoading) {
    return <PageSkeleton hasStats tableRows={8} tableColumns={6} />;
  }

  if (accountsError) {
    return (
      <ErrorState
        title={t('generalLedger')}
        message={accountsError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          {t('generalLedger')}
        </h1>
        <p className="text-[var(--text-secondary)] mt-1 text-sm sm:text-base">
          View detailed transaction history for an account
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label={tAccounting('accounts')}>
            <FormSelect
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              <option value="">-- Select account --</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label={tCommon('date') + ' (from)'}>
            <FormInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </FormField>

          <FormField label={tCommon('date') + ' (to)'}>
            <FormInput
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </FormField>
        </div>
      </div>

      {/* Content Area */}
      {!selectedAccountId && (
        <EmptyState
          icon={BookOpen}
          title="Select an account"
          message="Choose an account from the dropdown above to view its general ledger."
        />
      )}

      {selectedAccountId && ledgerLoading && (
        <PageSkeleton tableRows={8} tableColumns={6} />
      )}

      {selectedAccountId && ledgerError && (
        <ErrorState
          title={t('generalLedger')}
          message={ledgerError}
          onRetry={fetchLedger}
        />
      )}

      {selectedAccountId && !ledgerLoading && !ledgerError && ledgerData && ledgerData.transactions.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title={tCommon('noData')}
          message="No transactions found for this account in the selected period."
        />
      )}

      {selectedAccountId && !ledgerLoading && !ledgerError && ledgerData && ledgerData.transactions.length > 0 && (
        <div className="space-y-4 sm:space-y-6">
          {/* Account info & summary cards */}
          <div className="card p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-4">
              {ledgerData.account.code} - {ledgerData.account.name}
              <span className="ml-2 text-sm font-normal text-[var(--text-secondary)]">
                ({ledgerData.account.type})
              </span>
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-lg bg-[var(--surface-elevated)] p-3 sm:p-4">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                  Opening Balance
                </p>
                <p className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mt-1">
                  {formatCurrency(ledgerData.openingBalance)}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--surface-elevated)] p-3 sm:p-4">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                  {tAccounting('debit')}
                </p>
                <p className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mt-1">
                  {formatCurrency(ledgerData.totalDebit)}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--surface-elevated)] p-3 sm:p-4">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                  {tAccounting('credit')}
                </p>
                <p className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mt-1">
                  {formatCurrency(ledgerData.totalCredit)}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--surface-elevated)] p-3 sm:p-4">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                  Closing Balance
                </p>
                <p className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mt-1">
                  {formatCurrency(ledgerData.closingBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Transactions table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)]">
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      {tCommon('date')}
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider hidden sm:table-cell">
                      Reference
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">
                      Partner
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      {tAccounting('debit')}
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      {tAccounting('credit')}
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      {tAccounting('balance')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {/* Opening balance row */}
                  <tr className="bg-[var(--surface-elevated)]">
                    <td className="px-4 sm:px-6 py-3 text-[var(--text-secondary)] font-medium" colSpan={4}>
                      Opening Balance
                    </td>
                    <td className="px-4 sm:px-6 py-3 hidden sm:table-cell" />
                    <td className="px-4 sm:px-6 py-3 hidden md:table-cell" />
                    <td className="px-4 sm:px-6 py-3 text-right font-semibold text-[var(--text-primary)]">
                      {formatCurrency(ledgerData.openingBalance)}
                    </td>
                  </tr>

                  {/* Transaction rows */}
                  {ledgerData.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                      <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-[var(--text-primary)]">
                        {tx.date}
                      </td>
                      <td className="px-4 sm:px-6 py-3 whitespace-nowrap font-mono text-[var(--text-secondary)] hidden sm:table-cell">
                        {tx.reference || '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-[var(--text-secondary)]">
                        {tx.description || '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-[var(--text-secondary)] hidden md:table-cell">
                        {tx.partner || '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-right text-[var(--text-primary)]">
                        {tx.debit ? formatCurrency(tx.debit) : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-right text-[var(--text-primary)]">
                        {tx.credit ? formatCurrency(tx.credit) : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-right font-semibold text-[var(--text-primary)]">
                        {formatCurrency(tx.balance)}
                      </td>
                    </tr>
                  ))}

                  {/* Closing balance row */}
                  <tr className="bg-[var(--surface-elevated)] border-t-2 border-[var(--border)]">
                    <td className="px-4 sm:px-6 py-3 text-[var(--text-secondary)] font-medium" colSpan={4}>
                      Closing Balance
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-right font-semibold text-[var(--text-primary)]">
                      {formatCurrency(ledgerData.totalDebit)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-right font-semibold text-[var(--text-primary)]">
                      {formatCurrency(ledgerData.totalCredit)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-right font-bold text-[var(--text-primary)]">
                      {formatCurrency(ledgerData.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
