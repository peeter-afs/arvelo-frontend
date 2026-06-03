'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useTranslations } from 'next-intl';
import { reportsApi } from '@/lib/api/reports.api';
import { invoicesApi, type InvoiceListItem } from '@/lib/api/invoices.api';
import { accountingApi } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
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

function periodRange(period: Period) {
  const now = new Date();
  const y = now.getFullYear();
  const start =
    period === 'month'   ? new Date(y, now.getMonth(), 1) :
    period === 'quarter' ? new Date(y, Math.floor(now.getMonth() / 3) * 3, 1) :
                           new Date(y, 0, 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(now) };
}

const num = (v: unknown) => Number(v ?? 0) || 0;
const openAmt = (inv: InvoiceListItem) => num(inv.open_amount ?? inv.total);
const isUnpaid = (inv: InvoiceListItem) => inv.status !== 'draft' && openAmt(inv) > 0.005;

export default function DashboardPage() {
  const { user } = useAuthStore();
  const t = useTranslations('dashboard');

  const [period, setPeriod] = useState<Period>('year');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [partnerNames, setPartnerNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { start, end } = periodRange(period);
    try {
      const [plData, invoiceData, partnerData] = await Promise.allSettled([
        reportsApi.getProfitLoss(start, end),
        invoicesApi.listInvoices({ limit: 500 }),
        accountingApi.getPartners(),
      ]);

      const pl = plData.status === 'fulfilled' ? plData.value : null;
      const invList = invoiceData.status === 'fulfilled' ? (invoiceData.value ?? []) : [];
      const partners = partnerData.status === 'fulfilled' ? (partnerData.value ?? []) : [];

      const nameMap = new Map<string, string>();
      partners.forEach((p) => nameMap.set(p.id, p.name));

      const pendingCount = invList.filter((i) => i.status === 'confirmed').length;

      setStats({
        totalRevenue: pl?.totalRevenue ?? 0,
        totalExpenses: pl?.totalExpenses ?? 0,
        netIncome: pl?.netIncome ?? 0,
        pendingCount,
      });
      setInvoices(invList);
      setPartnerNames(nameMap);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('et-EE', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDateShort = (iso: string) =>
    new Intl.DateTimeFormat('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

  const { start: rangeStart, end: rangeEnd } = periodRange(period);
  const rangeCaption = `${formatDateShort(rangeStart)} – ${formatDateShort(rangeEnd)}`;

  const periodCaption =
    period === 'month'   ? t('periodCaptionMonth') :
    period === 'quarter' ? t('periodCaptionQuarter') :
                           t('periodCaptionYear');

  const getPeriodLabel = (p: Period) =>
    p === 'month'   ? t('periodMonth') :
    p === 'quarter' ? t('periodQuarter') :
                      t('periodYear');

  // Cashflow computations — no new API calls, derived from invoice list
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(+today + 7 * 864e5);

  const dueIn7 = (inv: InvoiceListItem) =>
    !!inv.due_date && new Date(inv.due_date) >= today && new Date(inv.due_date) <= weekEnd;
  const isOverdue = (inv: InvoiceListItem) =>
    !!inv.due_date && new Date(inv.due_date) < today;

  const receipts = invoices.filter((i) => i.type === 'sales_invoice'    && isUnpaid(i));
  const payments = invoices.filter((i) => i.type === 'purchase_invoice' && isUnpaid(i));
  const receiptsWeek    = receipts.filter(dueIn7);
  const paymentsWeek    = payments.filter(dueIn7);
  const receiptsOverdue = receipts.filter(isOverdue);
  const paymentsOverdue = payments.filter(isOverdue);

  const receiptsWeekSum = receiptsWeek.reduce((s, i) => s + openAmt(i), 0);
  const paymentsWeekSum = paymentsWeek.reduce((s, i) => s + openAmt(i), 0);
  const netChange = receiptsWeekSum - paymentsWeekSum;

  const weekStartStr = formatDateShort(today.toISOString().slice(0, 10));
  const weekEndStr   = formatDateShort(weekEnd.toISOString().slice(0, 10));

  const partnerLabel = (inv: InvoiceListItem) =>
    (inv.partner_id && partnerNames.get(inv.partner_id)) ||
    inv.invoice_number ||
    inv.id.slice(0, 8);

  if (loading) {
    return <PageSkeleton hasStats />;
  }

  if (error) {
    return <ErrorState title={t('welcomeBack')} message={error} onRetry={fetchDashboard} />;
  }

  const PERIODS: Period[] = ['month', 'quarter', 'year'];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
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
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="card card-hover p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-[var(--text-secondary)] mb-2">{t('totalRevenue')}</p>
              <p className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
                {formatCurrency(stats?.totalRevenue ?? 0)}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{periodCaption}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--a-surface-2)]">
              <Euro className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--text-secondary)]" />
            </div>
          </div>
        </div>

        <div className="card card-hover p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-[var(--text-secondary)] mb-2">{t('totalExpenses')}</p>
              <p className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
                {formatCurrency(stats?.totalExpenses ?? 0)}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{periodCaption}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--a-surface-2)]">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--text-secondary)]" />
            </div>
          </div>
        </div>

        <div className="card card-hover p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-[var(--text-secondary)] mb-2">{t('netIncome')}</p>
              <p className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
                {formatCurrency(stats?.netIncome ?? 0)}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{periodCaption}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--a-surface-2)]">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--text-secondary)]" />
            </div>
          </div>
        </div>

        <div className="card card-hover p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-[var(--text-secondary)] mb-2">{t('pendingInvoices')}</p>
              <p className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
                {stats?.pendingCount ?? 0}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{t('currentState')}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--a-surface-2)]">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--text-secondary)]" />
            </div>
          </div>
        </div>
      </div>

      {/* This Week Cashflow */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="micro text-[var(--text-muted)]">{t('thisWeek')}</span>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">{weekStartStr} – {weekEndStr}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Expected Receipts */}
          <div className="card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">{t('expectedReceipts')}</p>
              <div className="w-9 h-9 rounded-lg bg-[var(--a-surface-2)] flex items-center justify-center flex-shrink-0">
                <ArrowDownLeft className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
            </div>

            <p className="font-mono tabular-nums text-xl font-semibold tracking-[-0.02em] text-[var(--a-pos)]">
              {formatCurrency(receiptsWeekSum)}
            </p>

            <div className="flex items-center gap-2 mt-1 mb-3">
              <span className="text-sm text-[var(--text-secondary)]">
                {receiptsWeek.length} {t('invoicesWord')}
              </span>
              {receiptsOverdue.length > 0 && (
                <span className="bg-[var(--a-neg-soft)] text-[var(--a-neg)] rounded px-1.5 py-0.5 text-[11px]">
                  {receiptsOverdue.length} {t('overdueWord')}
                </span>
              )}
            </div>

            {receiptsWeek.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] flex-1">{t('noReceiptsThisWeek')}</p>
            ) : (
              <div className="space-y-1.5 flex-1">
                {receiptsWeek.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-[13px]">
                    <span className="truncate text-[var(--text-secondary)] min-w-0 mr-2">
                      {partnerLabel(inv)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {inv.due_date && (
                        <span className="font-mono text-[12px] text-[var(--text-muted)]">
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

            <div className="border-t border-[var(--border)] pt-3 mt-4">
              <Link
                href="/invoices/sales"
                className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                {t('viewSalesInvoices')} →
              </Link>
            </div>
          </div>

          {/* Expected Payments */}
          <div className="card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">{t('expectedPayments')}</p>
              <div className="w-9 h-9 rounded-lg bg-[var(--a-surface-2)] flex items-center justify-center flex-shrink-0">
                <ArrowUpRight className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
            </div>

            <p className="font-mono tabular-nums text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              {formatCurrency(paymentsWeekSum)}
            </p>

            <div className="flex items-center gap-2 mt-1 mb-3">
              <span className="text-sm text-[var(--text-secondary)]">
                {paymentsWeek.length} {t('invoicesWord')}
              </span>
              {paymentsOverdue.length > 0 && (
                <span className="bg-[var(--a-neg-soft)] text-[var(--a-neg)] rounded px-1.5 py-0.5 text-[11px]">
                  {paymentsOverdue.length} {t('overdueWord')}
                </span>
              )}
            </div>

            {paymentsWeek.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] flex-1">{t('noPaymentsThisWeek')}</p>
            ) : (
              <div className="space-y-1.5 flex-1">
                {paymentsWeek.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-[13px]">
                    <span className="truncate text-[var(--text-secondary)] min-w-0 mr-2">
                      {partnerLabel(inv)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {inv.due_date && (
                        <span className="font-mono text-[12px] text-[var(--text-muted)]">
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

            <div className="border-t border-[var(--border)] pt-3 mt-4">
              <Link
                href="/invoices/purchase"
                className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                {t('viewPurchaseInvoices')} →
              </Link>
            </div>
          </div>
        </div>

        {/* Net change */}
        <div className="flex items-center justify-end gap-2 mt-3">
          <span className="text-[13px] text-[var(--text-muted)]">{t('expectedNet')}</span>
          <span
            className={`font-mono text-[13px] font-semibold ${
              netChange >= 0 ? 'text-[var(--a-pos)]' : 'text-[var(--a-neg)]'
            }`}
          >
            {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
          </span>
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
