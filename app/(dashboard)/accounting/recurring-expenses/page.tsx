'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { recurringExpensesApi, type BudgetSummary, type ExpenseStatus, type MonitorRow } from '@/lib/api/recurringExpenses.api';
import { accountingApi, type AccountOption, type PartnerOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { Stat } from '@/components/ui/Stat';
import { StatusPill } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/Button';

type View = 'monitor' | 'budget';

// ─── Status helpers ────────────────────────────────────────────────────

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

const STATUS_TONE: Record<ExpenseStatus, StatusTone> = {
  received: 'success',
  over_budget: 'warning',
  due_soon: 'warning',
  missing: 'danger',
  not_due: 'neutral',
};

function fmt(value: number, currency = 'EUR') {
  return new Intl.NumberFormat('et-EE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPeriod(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('et-EE', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

// ─── Page ──────────────────────────────────────────────────────────────

export default function RecurringExpensesPage() {
  const t = useTranslations('recurringExpenses');
  const [view, setView] = useState<View>('monitor');
  const [rows, setRows] = useState<MonitorRow[]>([]);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const partnerMap = useMemo(() => new Map(partners.map(p => [p.id, p.name])), [partners]);
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, `${a.code} ${a.name}`])), [accounts]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [monitorData, budgetData, partnerData, accountData] = await Promise.all([
        recurringExpensesApi.getMonitor(period),
        recurringExpensesApi.getBudget(period),
        accountingApi.getPartners(),
        accountingApi.getAccounts(),
      ]);
      setRows(monitorData);
      setBudget(budgetData);
      setPartners(partnerData);
      setAccounts(accountData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [period]);

  const handleReconcile = async () => {
    setIsReconciling(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await recurringExpensesApi.reconcile();
      setSuccessMessage(t('reconcileComplete', { matched: result.matched, processed: result.processed }));
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsReconciling(false);
    }
  };

  // ── Metrics ──────────────────────────────────────────────────────────
  const received = rows.filter(r => r.status === 'received').length;
  const missingCount = rows.filter(r => r.status === 'missing').length;
  const overBudgetCount = rows.filter(r => r.status === 'over_budget').length;
  const totalExpected = rows.reduce((sum, r) => sum + r.entry.expected_amount, 0);

  return (
    <div className="flex min-h-full flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-[var(--a-border)] pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="micro text-[var(--a-text-3)]">Accounting</div>
          <h1 className="mt-1 text-[28px] font-semibold leading-none text-[var(--a-text)]">{t('title')}</h1>
          <p className="mt-2 text-[13px] text-[var(--a-text-2)]">{t('description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="h-9 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-sm text-[var(--a-text)]"
          />
          <button
            onClick={handleReconcile}
            disabled={isReconciling}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--a-border)] px-3 text-sm text-[var(--a-text-2)] hover:bg-[var(--a-hover)] disabled:opacity-50"
          >
            {isReconciling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isReconciling ? t('reconciling') : t('reconcile')}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] p-4 text-sm text-[var(--a-neg)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-[var(--a-pos-soft)] bg-[var(--a-pos-soft)] p-4 text-sm text-[var(--a-pos)]">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="card flex divide-x divide-[var(--a-border)]">
        <Stat
          label={t('receivedThisMonth')}
          value={`${received} / ${rows.length}`}
          tone="positive"
          className="flex-1"
        />
        <Stat
          label={t('missing')}
          value={missingCount}
          tone={missingCount > 0 ? 'danger' : 'default'}
          className="flex-1"
        />
        <Stat
          label={t('overBudget')}
          value={overBudgetCount}
          tone={overBudgetCount > 0 ? 'warning' : 'default'}
          className="flex-1"
        />
        <Stat
          label={t('committedMonthly')}
          value={fmt(totalExpected)}
          className="hidden flex-1 lg:block"
        />
      </div>

      {/* View tabs */}
      <div className="flex gap-1 border-b border-[var(--a-border)]">
        {([['monitor', t('monitorTab')], ['budget', t('budgetTab')]] as [View, string][]).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              view === v
                ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
                : 'text-[var(--a-text-2)] hover:text-[var(--a-text)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card flex items-center justify-center p-12 text-sm text-[var(--a-text-3)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : view === 'monitor' ? (
        <MonitorView rows={rows} partnerMap={partnerMap} period={period} t={t} />
      ) : (
        <BudgetView budget={budget} accountMap={accountMap} t={t} />
      )}
    </div>
  );
}

// ─── Monitor view ──────────────────────────────────────────────────────

function MonitorView({
  rows,
  partnerMap,
  period,
  t,
}: {
  rows: MonitorRow[];
  partnerMap: Map<string, string>;
  period: string;
  t: ReturnType<typeof useTranslations<'recurringExpenses'>>;
}) {
  const received = rows.filter(r => r.status === 'received').length;
  const missingCount = rows.filter(r => r.status === 'missing').length;
  const overBudgetCount = rows.filter(r => r.status === 'over_budget').length;

  if (rows.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
        <p className="text-[15px] font-medium text-[var(--a-text)]">{t('noEntries')}</p>
        <p className="text-[13px] text-[var(--a-text-3)]">{t('noEntriesDescription')}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Summary line */}
      <div className="border-b border-[var(--a-border)] bg-[var(--a-surface-2)] px-5 py-3 text-[13px] text-[var(--a-text-2)]">
        {t('summaryLine', { received, total: rows.length, missing: missingCount, overBudget: overBudgetCount })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--a-border)] text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--a-text-3)]">
              <th className="px-5 py-3">{t('columns.label')}</th>
              <th className="px-5 py-3">{t('columns.supplier')}</th>
              <th className="px-5 py-3 text-right">{t('columns.expectedDay')}</th>
              <th className="px-5 py-3 text-right">{t('columns.expected')}</th>
              <th className="px-5 py-3 text-right">{t('columns.actual')}</th>
              <th className="px-5 py-3 text-right">{t('columns.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--a-border)]">
            {rows.map(row => (
              <tr key={row.entry.id} className="hover:bg-[var(--a-hover)]">
                <td className="px-5 py-3.5 font-medium text-[var(--a-text)]">{row.entry.label}</td>
                <td className="px-5 py-3.5 text-[var(--a-text-2)]">
                  {row.entry.partner_id ? (partnerMap.get(row.entry.partner_id) ?? '—') : '—'}
                </td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-[var(--a-text-2)]">
                  {row.entry.expected_day_of_month}
                </td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-[var(--a-text-2)]">
                  {fmt(row.entry.expected_amount, row.entry.currency_code)}
                </td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-[var(--a-text-2)]">
                  {row.match?.matched_amount != null ? fmt(row.match.matched_amount, row.entry.currency_code) : '—'}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <StatusPill tone={STATUS_TONE[row.status]}>
                    {t(`status.${row.status}` as any)}
                  </StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-[var(--a-border)] md:hidden">
        {rows.map(row => (
          <div key={row.entry.id} className="min-h-[44px] px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--a-text)]">{row.entry.label}</span>
              <StatusPill tone={STATUS_TONE[row.status]}>
                {t(`status.${row.status}` as any)}
              </StatusPill>
            </div>
            <div className="mt-1 text-[13px] text-[var(--a-text-2)]">
              {row.entry.partner_id ? (partnerMap.get(row.entry.partner_id) ?? '—') : '—'}
            </div>
            <div className="mt-1 flex gap-3 font-mono text-[13px] tabular-nums text-[var(--a-text-3)]">
              <span>{fmt(row.entry.expected_amount, row.entry.currency_code)}</span>
              <span>→</span>
              <span>{row.match?.matched_amount != null ? fmt(row.match.matched_amount, row.entry.currency_code) : '—'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Budget view ───────────────────────────────────────────────────────

function BudgetView({
  budget,
  accountMap,
  t,
}: {
  budget: BudgetSummary | null;
  accountMap: Map<string, string>;
  t: ReturnType<typeof useTranslations<'recurringExpenses'>>;
}) {
  if (!budget || budget.by_account.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
        <p className="text-[15px] font-medium text-[var(--a-text)]">{t('noEntries')}</p>
        <p className="text-[13px] text-[var(--a-text-3)]">{t('noEntriesDescription')}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-[var(--a-border)] bg-[var(--a-surface-2)] px-5 py-3 text-[13px] font-medium text-[var(--a-text)]">
        {t('budget.title')}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--a-border)] text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--a-text-3)]">
            <th className="px-5 py-3">{t('budget.account')}</th>
            <th className="px-5 py-3 text-right">{t('budget.expected')}</th>
            <th className="px-5 py-3 text-right">{t('budget.actual')}</th>
            <th className="px-5 py-3 text-right">{t('budget.variance')}</th>
            <th className="hidden px-5 py-3 text-right lg:table-cell">{t('budget.monthlyEquiv')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--a-border)]">
          {budget.by_account.map((row, i) => {
            const isOver = row.variance > 0;
            return (
              <tr key={i} className="hover:bg-[var(--a-hover)]">
                <td className="px-5 py-3.5 font-medium text-[var(--a-text)]">
                  {row.account_id ? (accountMap.get(row.account_id) ?? row.account_id) : '—'}
                </td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-[var(--a-text-2)]">
                  {fmt(row.total_expected)}
                </td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-[var(--a-text-2)]">
                  {fmt(row.total_actual)}
                </td>
                <td
                  className="px-5 py-3.5 text-right font-mono tabular-nums"
                  style={{ color: isOver ? 'var(--a-neg)' : 'var(--a-pos)' }}
                >
                  {isOver ? '+' : ''}{fmt(row.variance)}
                </td>
                <td className="hidden px-5 py-3.5 text-right font-mono tabular-nums text-[var(--a-text-3)] lg:table-cell">
                  {fmt(row.monthly_equivalent)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[var(--a-border)] bg-[var(--a-surface-2)] font-semibold text-[var(--a-text)]">
            <td className="px-5 py-3">{t('budget.total')}</td>
            <td className="px-5 py-3 text-right font-mono tabular-nums">{fmt(budget.total_expected)}</td>
            <td className="px-5 py-3 text-right font-mono tabular-nums">{fmt(budget.total_actual)}</td>
            <td
              className="px-5 py-3 text-right font-mono tabular-nums"
              style={{ color: budget.variance > 0 ? 'var(--a-neg)' : 'var(--a-pos)' }}
            >
              {budget.variance > 0 ? '+' : ''}{fmt(budget.variance)}
            </td>
            <td className="hidden px-5 py-3 lg:table-cell" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
