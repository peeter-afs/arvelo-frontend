'use client';

import { useAuthStore } from '@/lib/stores/auth.store';
import { useTranslations } from 'next-intl';
import {
  TrendingUp,
  DollarSign,
  FileText,
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, tenant } = useAuthStore();
  const t = useTranslations('dashboard');

  // Format current date
  const formattedDate = new Intl.DateTimeFormat('et-EE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const stats = [
    {
      label: 'Total Revenue',
      value: '€12,450',
      change: '+12%',
      trend: 'up' as const,
      icon: DollarSign,
      colorClass: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Total Expenses',
      value: '€8,320',
      change: '+5%',
      trend: 'up' as const,
      icon: TrendingUp,
      colorClass: 'bg-rose-50 text-rose-600',
    },
    {
      label: 'Net Income',
      value: '€4,130',
      change: '+23%',
      trend: 'up' as const,
      icon: Activity,
      colorClass: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Active Invoices',
      value: '24',
      change: '4 pending',
      trend: 'neutral' as const,
      icon: FileText,
      colorClass: 'bg-violet-50 text-violet-600',
    },
  ];

  const recentTransactions = [
    {
      id: 1,
      date: '2024-02-28',
      description: 'Invoice Payment',
      partner: 'Acme Corp',
      amount: 1250.0,
      type: 'credit' as const,
    },
    {
      id: 2,
      date: '2024-02-27',
      description: 'Office Supplies',
      partner: 'OfficeMax',
      amount: 145.0,
      type: 'debit' as const,
    },
    {
      id: 3,
      date: '2024-02-27',
      description: 'Client Payment',
      partner: 'TechCorp',
      amount: 2300.0,
      type: 'credit' as const,
    },
    {
      id: 4,
      date: '2024-02-26',
      description: 'Rent Payment',
      partner: 'Property LLC',
      amount: 800.0,
      type: 'debit' as const,
    },
    {
      id: 5,
      date: '2024-02-25',
      description: 'Consulting Services',
      partner: 'StartupXYZ',
      amount: 3450.0,
      type: 'credit' as const,
    },
  ];

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
              {t('welcomeBack')}, {user?.name || user?.email?.split('@')[0]}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Here's your overview for {formattedDate}
            </p>
          </div>
          {/* Quick actions - desktop only */}
          <div className="hidden lg:flex gap-3">
            <button className="h-10 px-4 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700 transition-colors flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Entry
            </button>
            <button className="h-10 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : stat.trend === 'down' ? ArrowDownRight : null;

          return (
            <div
              key={stat.label}
              className="card card-hover p-4 sm:p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-slate-500 mb-2">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-semibold text-slate-900">
                    {stat.value}
                  </p>
                  {stat.trend !== 'neutral' && TrendIcon && (
                    <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      stat.trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <TrendIcon className="h-3 w-3" />
                      {stat.change}
                    </div>
                  )}
                  {stat.trend === 'neutral' && (
                    <p className="text-xs text-slate-400 mt-2">{stat.change}</p>
                  )}
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.colorClass}`}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">
            Recent Transactions
          </h2>
          <a
            href="/accounting/journal"
            className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium transition-colors"
          >
            View all →
          </a>
        </div>

        {/* Desktop Table (visible sm+) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {transaction.partner}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`font-mono font-semibold tabular-nums text-sm ${
                        transaction.type === 'credit'
                          ? 'text-emerald-600'
                          : 'text-red-500'
                      }`}
                    >
                      {transaction.type === 'credit' ? '+' : '−'}€
                      {transaction.amount.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List (visible below sm) */}
        <div className="sm:hidden divide-y divide-slate-100">
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="px-4 py-3 flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {transaction.description}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {transaction.partner} · {formatDate(transaction.date)}
                </p>
              </div>
              <span
                className={`font-mono font-semibold tabular-nums text-sm ml-3 ${
                  transaction.type === 'credit'
                    ? 'text-emerald-600'
                    : 'text-red-500'
                }`}
              >
                {transaction.type === 'credit' ? '+' : '−'}€
                {transaction.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile FAB - only visible on mobile when header buttons are hidden */}
      <button
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-full shadow-xl flex items-center justify-center z-20 transition-all"
        aria-label="Quick actions"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
