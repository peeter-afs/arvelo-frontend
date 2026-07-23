'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useTranslations } from 'next-intl';
import { invoicesApi, type InvoiceListItem } from '@/lib/api/invoices.api';
import { accountingApi } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { MonthEndBanner } from '@/components/accounting/MonthEndBanner';
import {
  TrendingUp,
  Euro,
  FileText,
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

type DashboardStats = {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  pendingCount: number;
};

type Period = 'month' | 'quarter' | 'year';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function periodRange(period: Period) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  let start: Date, periodEnd: Date;
  if (period === 'month')        { start = new Date(y, m, 1);     periodEnd = new Date(y, m + 1, 0); }
  else if (period === 'quarter') { const q = Math.floor(m / 3) * 3;
                                   start = new Date(y, q, 1);     periodEnd = new Date(y, q + 3, 0); }
  else                           { start = new Date(y, 0, 1);     periodEnd = new Date(y, 11, 31); }
  return { start: toLocalISO(start), end: toLocalISO(now), periodEnd: toLocalISO(periodEnd) };
}

const num = (v: unknown) => Number(v ?? 0) || 0;
const openAmt = (inv: InvoiceListItem) => num(inv.open_amount ?? inv.total);
const isUnpaid = (inv: InvoiceListItem) => inv.status !== 'draft' && openAmt(inv) > 0.005;
function daysSince(isoDate: string) {
  return (new Date().getTime() - new Date(isoDate).getTime()) / 86400000;
}

export default function DashboardPage() {
  const { user, tenant } = useAuthStore();
  const t = useTranslations('dashboard');

  const [period, setPeriod] = useState<Period>('year');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [partnerNames, setPartnerNames] = useState<Map<string, string>>(new Map());
  const [importedBalances, setImportedBalances] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { start, end } = periodRange(period);
    try {
      const [invoiceData, partnerData, importStatusData] = await Promise.allSettled([
        invoicesApi.listInvoices({ limit: 500 }),
        accountingApi.getPartners(),
        accountingApi.getOpeningBalanceImportStatus(),
      ]);

      const invList = invoiceData.status === 'fulfilled' ? (invoiceData.value ?? []) : [];
      const partners = partnerData.status === 'fulfilled' ? (partnerData.value ?? []) : [];
      const importStatus = importStatusData.status === 'fulfilled' ? importStatusData.value : null;

      const nameMap = new Map<string, string>();
      partners.forEach((p) => nameMap.set(p.id, p.name));

      // Compute P&L from invoice totals (accrual basis, by invoice_date within period).
      // Excludes draft and cancelled invoices.
      const EXCLUDED = new Set(['draft', 'cancelled']);
      const inPeriod = (inv: InvoiceListItem) =>
        !!inv.invoice_date && inv.invoice_date >= start && inv.invoice_date <= end;
      const totalRevenue = invList
        .filter((i) => i.type === 'sales_invoice' && !EXCLUDED.has(i.status) && inPeriod(i))
        .reduce((s, i) => s + num(i.total), 0);
      const totalExpenses = invList
        .filter((i) => i.type === 'purchase_invoice' && !EXCLUDED.has(i.status) && inPeriod(i))
        .reduce((s, i) => s + num(i.total), 0);

      const pendingCount = invList.filter(isUnpaid).length;

      setStats({
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        pendingCount,
      });
      setInvoices(invList);
      setPartnerNames(nameMap);
      setImportedBalances(importStatus?.is_imported ?? null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard();
  }, [fetchDashboard]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('et-EE', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDateShort = (iso: string) =>
    new Intl.DateTimeFormat('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

  const { start: rangeStart, end: rangeEnd, periodEnd } = periodRange(period);
  const rangeCaption = `${formatDateShort(rangeStart)} – ${formatDateShort(rangeEnd)}`;
  const cashflowCaption = `${formatDateShort(rangeStart)} – ${formatDateShort(periodEnd)}`;

  const periodCaption =
    period === 'month'   ? t('periodCaptionMonth') :
    period === 'quarter' ? t('periodCaptionQuarter') :
                           t('periodCaptionYear');

  const getPeriodLabel = (p: Period) =>
    p === 'month'   ? t('periodMonth') :
    p === 'quarter' ? t('periodQuarter') :
                      t('periodYear');

  // Cashflow computations — no new API calls, derived from invoice list.
  // Driven by the selected period: collectible = open invoices due by the period end
  // (which includes overdue, since overdue due-dates are <= period end).
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cashflowEnd = new Date(`${periodEnd}T23:59:59`);

  const isOverdue = (inv: InvoiceListItem) =>
    !!inv.due_date && new Date(inv.due_date) < today;
  const isDueByPeriodEnd = (inv: InvoiceListItem) =>
    !!inv.due_date && new Date(inv.due_date) <= cashflowEnd;
  const byDueDate = (a: InvoiceListItem, b: InvoiceListItem) =>
    (a.due_date ?? '').localeCompare(b.due_date ?? '');

  const receipts = invoices.filter((i) => i.type === 'sales_invoice'    && isUnpaid(i));
  const payments = invoices.filter((i) => i.type === 'purchase_invoice' && isUnpaid(i));
  const receiptsDue     = receipts.filter(isDueByPeriodEnd).sort(byDueDate);
  const paymentsDue     = payments.filter(isDueByPeriodEnd).sort(byDueDate);
  const receiptsOverdue = receipts.filter(isOverdue);
  const paymentsOverdue = payments.filter(isOverdue);

  const receiptsSum        = receiptsDue.reduce((s, i) => s + openAmt(i), 0);
  const paymentsSum        = paymentsDue.reduce((s, i) => s + openAmt(i), 0);
  const receiptsOverdueSum = receiptsOverdue.reduce((s, i) => s + openAmt(i), 0);
  const paymentsOverdueSum = paymentsOverdue.reduce((s, i) => s + openAmt(i), 0);
  const netChange = receiptsSum - paymentsSum;

  const partnerLabel = (inv: InvoiceListItem) =>
    (inv.partner_id && partnerNames.get(inv.partner_id)) ||
    inv.invoice_number ||
    inv.id.slice(0, 8);

  // Show "import opening balances" CTA only for new companies that haven't imported yet.
  const tenantAgeDays = tenant?.created_at ? daysSince(tenant.created_at) : Infinity;
  const showOpeningBalancesCTA = importedBalances === false && tenantAgeDays < 90;

  if (loading) {
    return <PageSkeleton hasStats />;
  }

  if (error) {
    return <ErrorState title={t('welcomeBack')} message={error} onRetry={fetchDashboard} />;
  }

  const PERIODS: Period[] = ['month', 'quarter', 'year'];

  return (
    <div>
      <MonthEndBanner />

      {/* Header */}
      <div className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
              {t('welcomeBack')}, {user?.name || user?.email?.split('@')[0]}
            </h1>
          </div>
          <div className="hidden lg:flex gap-3">
            <Link
              href="/accounting/journal"
              className="h-10 px-4 border border-[var(--border)] hover:bg-[var(--surface-elevated)] rounded-lg text-sm font-medium text-[var(--text-primary)] transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('newEntry')}
            </Link>
            <Link
              href="/invoices/new?type=purchase_invoice"
              className="h-10 px-4 border border-[var(--border)] hover:bg-[var(--surface-elevated)] rounded-lg text-sm font-medium text-[var(--text-primary)] transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('newPurchaseInvoice')}
            </Link>
            <Link
              href="/invoices/new?type=sales_invoice"
              className="h-10 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('newInvoice')}
            </Link>
          </div>
        </div>
      </div>

      {/* Opening balances CTA — shown only for new companies that haven't imported yet */}
      {showOpeningBalancesCTA && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-[var(--a-accent-soft)] bg-[var(--a-accent-soft-2)] px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[var(--primary)] shrink-0">📂</span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-[var(--text-primary)]">{t('openingBalancesTitle')}</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{t('openingBalancesDesc')}</p>
            </div>
          </div>
          <Link
            href="/accounting/opening-balances"
            className="shrink-0 h-8 px-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-[12.5px] font-medium transition-colors flex items-center gap-1.5"
          >
            {t('openingBalancesAction')}
          </Link>
        </div>
      )}

      {/* Period selector */}
      <div className="flex items-center justify-between mb-3">
        <span className="micro text-[var(--text-muted)]">{t('overview')}</span>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center bg-[var(--a-surface-2)] border border-[var(--border)] rounded-lg p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1 text-[13px] font-medium transition-colors ${
                  period === p
                    ? 'bg-[var(--a-text)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {getPeriodLabel(p)}
              </button>
            ))}
          </div>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">{rangeCaption}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <div className="card p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-[var(--text-secondary)] mb-1">{t('totalRevenue')}</p>
              <p className="text-xl font-semibold text-[var(--text-primary)]">
                {formatCurrency(stats?.totalRevenue ?? 0)}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{periodCaption}</p>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--a-surface-2)]">
              <Euro className="h-5 w-5 text-[var(--text-secondary)]" />
            </div>
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-[var(--text-secondary)] mb-1">{t('totalExpenses')}</p>
              <p className="text-xl font-semibold text-[var(--text-primary)]">
                {formatCurrency(stats?.totalExpenses ?? 0)}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{periodCaption}</p>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--a-surface-2)]">
              <TrendingUp className="h-5 w-5 text-[var(--text-secondary)]" />
            </div>
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-[var(--text-secondary)] mb-1">{t('netIncome')}</p>
              <p className="text-xl font-semibold text-[var(--text-primary)]">
                {formatCurrency(stats?.netIncome ?? 0)}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{periodCaption}</p>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--a-surface-2)]">
              <Activity className="h-5 w-5 text-[var(--text-secondary)]" />
            </div>
          </div>
        </div>

        <Link href="/invoices" className="card card-hover p-3 block">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-[var(--text-secondary)] mb-1">{t('pendingInvoices')}</p>
              <p className="text-xl font-semibold text-[var(--text-primary)]">
                {stats?.pendingCount ?? 0}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{t('currentState')}</p>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--a-surface-2)]">
              <FileText className="h-5 w-5 text-[var(--text-secondary)]" />
            </div>
          </div>
        </Link>
      </div>

      {/* Expected cash flow (period-aware) */}
      <div className="mt-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="micro text-[var(--text-muted)]">{t('cashflowTitle')}</span>
            <span className="text-[11px] text-[var(--text-muted)]">{t('expectedNet')}</span>
            <span
              className={`font-mono text-[12px] font-semibold ${
                netChange >= 0 ? 'text-[var(--a-pos)]' : 'text-[var(--a-neg)]'
              }`}
            >
              {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">{cashflowCaption}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Expected Receipts */}
          <div className="card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">{t('expectedReceipts')}</p>
              <Link
                href="/invoices/sales"
                title={t('viewSalesInvoices')}
                aria-label={t('viewSalesInvoices')}
                className="w-9 h-9 rounded-lg bg-[var(--a-surface-2)] hover:bg-[var(--border)] flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <ArrowDownLeft className="h-4 w-4 text-[var(--text-secondary)]" />
              </Link>
            </div>

            <p className="font-mono tabular-nums text-lg font-semibold tracking-[-0.02em] text-[var(--a-pos)]">
              {formatCurrency(receiptsSum)}
            </p>

            <div className="flex items-center gap-2 mt-1 mb-2">
              <span className="text-sm text-[var(--text-secondary)]">
                {receiptsDue.length} {t('invoicesWord')}
              </span>
              {receiptsOverdue.length > 0 && (
                <span className="bg-[var(--a-neg-soft)] text-[var(--a-neg)] rounded px-1.5 py-0.5 text-[11px]">
                  {receiptsOverdue.length} {t('overdueWord')} · {formatCurrency(receiptsOverdueSum)}
                </span>
              )}
            </div>

            {receiptsDue.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">{t('noReceiptsThisWeek')}</p>
            ) : (
              <div className="space-y-1">
                {receiptsDue.slice(0, 2).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-[13px]">
                    <span className="truncate text-[var(--text-secondary)] min-w-0 mr-2">
                      {partnerLabel(inv)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {inv.due_date && (
                        <span className={`font-mono text-[12px] ${isOverdue(inv) ? 'text-[var(--a-neg)]' : 'text-[var(--text-muted)]'}`}>
                          {formatDateShort(inv.due_date)}
                        </span>
                      )}
                      <span className="font-mono text-[12px] text-[var(--a-pos)]">
                        {formatCurrency(openAmt(inv))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expected Payments */}
          <div className="card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">{t('expectedPayments')}</p>
              <Link
                href="/invoices/purchase"
                title={t('viewPurchaseInvoices')}
                aria-label={t('viewPurchaseInvoices')}
                className="w-9 h-9 rounded-lg bg-[var(--a-surface-2)] hover:bg-[var(--border)] flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <ArrowUpRight className="h-4 w-4 text-[var(--text-secondary)]" />
              </Link>
            </div>

            <p className="font-mono tabular-nums text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              {formatCurrency(paymentsSum)}
            </p>

            <div className="flex items-center gap-2 mt-1 mb-2">
              <span className="text-sm text-[var(--text-secondary)]">
                {paymentsDue.length} {t('invoicesWord')}
              </span>
              {paymentsOverdue.length > 0 && (
                <span className="bg-[var(--a-neg-soft)] text-[var(--a-neg)] rounded px-1.5 py-0.5 text-[11px]">
                  {paymentsOverdue.length} {t('overdueWord')} · {formatCurrency(paymentsOverdueSum)}
                </span>
              )}
            </div>

            {paymentsDue.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">{t('noPaymentsThisWeek')}</p>
            ) : (
              <div className="space-y-1">
                {paymentsDue.slice(0, 2).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-[13px]">
                    <span className="truncate text-[var(--text-secondary)] min-w-0 mr-2">
                      {partnerLabel(inv)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {inv.due_date && (
                        <span className={`font-mono text-[12px] ${isOverdue(inv) ? 'text-[var(--a-neg)]' : 'text-[var(--text-muted)]'}`}>
                          {formatDateShort(inv.due_date)}
                        </span>
                      )}
                      <span className="font-mono text-[12px] text-[var(--text-primary)]">
                        {formatCurrency(openAmt(inv))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/reports/profit-loss" className="card card-hover p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--a-surface-2)] flex items-center justify-center flex-shrink-0">
            <BarChart3 className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{t('profitLoss')}</p>
            <p className="text-xs text-[var(--text-muted)]">{t('viewIncomeStatement')}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] ml-auto" />
        </Link>
        <Link href="/reports/balance-sheet" className="card card-hover p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--a-surface-2)] flex items-center justify-center flex-shrink-0">
            <Activity className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{t('balanceSheet')}</p>
            <p className="text-xs text-[var(--text-muted)]">{t('financialPosition')}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] ml-auto" />
        </Link>
        <Link href="/invoices/sales" className="card card-hover p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--a-surface-2)] flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{t('salesInvoices')}</p>
            <p className="text-xs text-[var(--text-muted)]">{t('manageInvoices')}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] ml-auto" />
        </Link>
      </div>

      {/* Mobile FAB */}
      <Link
        href="/invoices/new?type=sales_invoice"
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-full shadow-xl flex items-center justify-center z-20 transition-all"
        aria-label={t('createNewInvoice')}
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
