'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useNavigationMetrics } from '@/lib/hooks/useNavigationMetrics';

function currentPeriod(locale: string) {
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date());
}

function formatSyncTime(locale: string, value?: Date) {
  if (!value) return undefined;
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(value);
}

function viewName(pathname: string, labels: Record<string, string>) {
  if (pathname.includes('/accounting/journal')) return labels.journal;
  if (pathname.includes('/accounting/accounts')) return labels.accounts;
  if (pathname.includes('/accounting/partners')) return labels.partners;
  if (pathname.includes('/invoices')) return labels.invoices;
  if (pathname.includes('/reports')) return labels.reports;
  if (pathname.includes('/settings')) return labels.settings;
  return labels.workspace;
}

export function StatusFooter() {
  const pathname = usePathname();
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const tNavigation = useTranslations('navigation');
  const tAccounting = useTranslations('accounting');
  const tInvoices = useTranslations('invoices');
  const navigationMetrics = useNavigationMetrics();
  const items = useMemo(() => {
    const labels = {
      accounts: tAccounting('chartOfAccounts'),
      invoices: tInvoices('overview'),
      journal: tAccounting('journalEntries'),
      partners: tAccounting('partners'),
      reports: tNavigation('reports'),
      settings: tNavigation('settings'),
      workspace: tNavigation('workspace'),
    };

    return {
      period: currentPeriod(locale),
      view: viewName(pathname || '/', labels),
    };
  }, [locale, pathname, tAccounting, tInvoices, tNavigation]);
  const balanceLabel =
    navigationMetrics.isBalanced === undefined
      ? tCommon('unknown')
      : navigationMetrics.isBalanced
        ? tCommon('balanced')
        : tCommon('notBalanced');
  const balanceTone =
    navigationMetrics.isBalanced === undefined
      ? 'text-[var(--a-text-3)]'
      : navigationMetrics.isBalanced
        ? 'text-[var(--a-pos)]'
        : 'text-[var(--a-neg)]';
  const syncLabel = formatSyncTime(locale, navigationMetrics.lastUpdatedAt) || (navigationMetrics.isLoading ? tCommon('loading') : tCommon('unknown'));

  return (
    <footer className="hidden border-t border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2 font-mono text-[11px] text-[var(--a-text-3)] lg:flex">
      <div className="flex min-w-0 flex-1 items-center gap-3.5 overflow-hidden">
        <span className="uppercase">
          {tNavigation('books')} <span className="text-[var(--a-text)]">{items.period}</span>
        </span>
        <span className="uppercase">
          {tCommon('viewing')} <span className="text-[var(--a-text)]">{items.view}</span>
        </span>
        <span className={`inline-flex items-center gap-1.5 ${balanceTone}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {balanceLabel}
        </span>
        <span className="uppercase">{tCommon('sync')} <span className="text-[var(--a-text)]">{syncLabel}</span></span>
        <span className="flex-1" />
        <span>⌘K {tCommon('search')}</span>
        {/\/(journal|accounts|partners|invoices|sales|purchase)/.test(pathname || '') && (
          <span>⏎ {tCommon('open')}</span>
        )}
      </div>
    </footer>
  );
}
