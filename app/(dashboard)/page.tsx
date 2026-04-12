'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useTranslations } from 'next-intl';
import { reportsApi } from '@/lib/api/reports.api';
import { invoicesApi } from '@/lib/api/invoices.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton, StatCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  TrendingUp,
  DollarSign,
  FileText,
  Activity,
  Plus,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

type DashboardStats = {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  activeInvoices: number;
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const startOfYear = `${today.getFullYear()}-01-01`;
  const todayStr = today.toISOString().slice(0, 10);

  const formattedDate = new Intl.DateTimeFormat('et-EE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(today);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plData, invoiceData] = await Promise.allSettled([
        reportsApi.getProfitLoss(startOfYear, todayStr),
        invoicesApi.listInvoices({ status: 'confirmed' }),
      ]);

      const pl = plData.status === 'fulfilled' ? plData.value : null;
      const invoices = invoiceData.status === 'fulfilled' ? invoiceData.value : null;

      setStats({
        totalRevenue: pl?.totalRevenue ?? 0,
        totalExpenses: pl?.totalExpenses ?? 0,
        netIncome: pl?.netIncome ?? 0,
        activeInvoices: Array.isArray(invoices) ? invoices.length : 0,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [startOfYear, todayStr]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('et-EE', { style: 'currency', currency: 'EUR' }).format(amount);

  if (loading) {
    return <PageSkeleton hasStats />;
  }

  if (error) {
    return <ErrorState title={t('welcomeBack')} message={error} onRetry={fetchDashboard} />;
  }

  const statCards = [
    {
      label: t('totalRevenue'),
      value: formatCurrency(stats?.totalRevenue ?? 0),
      icon: DollarSign,
      colorClass: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(stats?.totalExpenses ?? 0),
      icon: TrendingUp,
      colorClass: 'bg-rose-50 text-rose-600',
    },
    {
      label: 'Net Income',
      value: formatCurrency(stats?.netIncome ?? 0),
      icon: Activity,
      colorClass: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: t('pendingInvoices'),
      value: String(stats?.activeInvoices ?? 0),
      icon: FileText,
      colorClass: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
              {t('welcomeBack')}, {user?.name || user?.email?.split('@')[0]}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {t('happeningToday')} &mdash; {formattedDate}
            </p>
          </div>
          <div className="hidden lg:flex gap-3">
            <Link
              href="/accounting/journal"
              className="h-10 px-4 border border-[var(--border)] hover:bg-[var(--surface-elevated)] rounded-lg text-sm font-medium text-[var(--text-primary)] transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Entry
            </Link>
            <Link
              href="/invoices/new"
              className="h-10 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card card-hover p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-secondary)] mb-2">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.colorClass}`}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/reports/profit-loss" className="card card-hover p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Profit & Loss</p>
            <p className="text-xs text-[var(--text-muted)]">View income statement</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] ml-auto" />
        </Link>
        <Link href="/reports/balance-sheet" className="card card-hover p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Activity className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Balance Sheet</p>
            <p className="text-xs text-[var(--text-muted)]">Financial position</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] ml-auto" />
        </Link>
        <Link href="/invoices/sales" className="card card-hover p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Sales Invoices</p>
            <p className="text-xs text-[var(--text-muted)]">Manage invoices</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] ml-auto" />
        </Link>
      </div>

      {/* Mobile FAB */}
      <Link
        href="/invoices/new"
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-full shadow-xl flex items-center justify-center z-20 transition-all"
        aria-label="Create new invoice"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
