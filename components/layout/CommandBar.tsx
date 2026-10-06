'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronRight, Command, Sparkles } from 'lucide-react';
import { Kbd } from '@/components/ui/Kbd';
import { useAssistantStore } from '@/lib/stores/assistant.store';
import { applyCrumbOverride, useCrumbOverride } from '@/lib/stores/crumbs.store';

function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

function humanize(segment: string, labels: Record<string, string>, recordLabel: string) {
  if (/^[0-9a-f-]{12,}$/i.test(segment)) return recordLabel;
  return labels[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function crumbsForPath(pathname: string, labels: Record<string, string>, recordLabel: string, dashboardLabel: string, todayLabel: string) {
  if (pathname === '/') return [dashboardLabel, todayLabel];
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = parts.map((part) => humanize(part, labels, recordLabel));
  if (parts[0] === 'accounting' && crumbs[1]) return [crumbs[1], ...crumbs.slice(2)];
  return crumbs.length ? crumbs : [dashboardLabel];
}

/** Breadcrumbs for the current route; also used as the page title in the mobile top bar. */
export function usePathCrumbs(crumbs?: string[]) {
  const pathname = usePathname();
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const tNavigation = useTranslations('navigation');
  const tAccounting = useTranslations('accounting');
  const tInvoices = useTranslations('invoices');
  const tReports = useTranslations('reports');
  const tClients = useTranslations('clients');
  const tPayroll = useTranslations('payroll');
  const labels = {
    payroll: tPayroll('title'),
    employees: tPayroll('employees'),
    runs: tPayroll('runs'),
    accounting: tNavigation('books'),
    accounts: tAccounting('chartOfAccounts'),
    bank: tAccounting('bankWorkspace'),
    'month-end': tAccounting('monthEnd'),
    projects: tAccounting('projects'),
    wip: tAccounting('projectWip'),
    'payment-batches': tAccounting('paymentBatches'),
    payments: tAccounting('payments'),
    cash: tNavigation('cashDesk'),
    'expense-reports': tNavigation('expenseReports'),
    orders: tNavigation('cashOrder'),
    journal: tAccounting('journalEntries'),
    'opening-balances': tAccounting('openingBalances'),
    partners: tAccounting('partners'),
    invoices: tInvoices('overview'),
    sales: tInvoices('salesList'),
    purchase: tInvoices('purchaseList'),
    'purchase-approvals': tInvoices('purchaseApprovals'),
    'purchase-imports': tInvoices('purchaseImports'),
    recurring: tInvoices('recurring'),
    quantities: tInvoices('recurringQuantities'),
    reminders: tInvoices('reminders'),
    products: tInvoices('productsTitle'),
    reports: tNavigation('reports'),
    'profit-loss': tReports('profitLoss'),
    'balance-sheet': tReports('balanceSheet'),
    'trial-balance': tReports('trialBalance'),
    'general-ledger': tReports('generalLedger'),
    turnover: tReports('turnoverReport'),
    dimensions: tReports('dimensionReport'),
    aging: tReports('agingReport'),
    'partner-statement': tReports('partnerStatement'),
    'annual-report': tReports('annualReport'),
    vat: tReports('vatReport'),
    settings: tNavigation('settings'),
    documents: tNavigation('documents'),
    security: tNavigation('security'),
    assets: tNavigation('fixedAssets'),
    help: tNavigation('help'),
    clients: tClients('title'),
    new: tCommon('newEntry'),
    edit: tCommon('edit'),
    preview: tCommon('preview'),
  };
  const now = new Date();
  const dateLocale = locale === 'et' ? 'et-EE' : locale === 'en' ? 'en-GB' : locale;
  const todayCrumb = `${new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }).format(now)} · ${tCommon('weekNumber', { week: isoWeek(now) })}`;

  const crumbOverride = useCrumbOverride();
  return applyCrumbOverride(crumbs || crumbsForPath(pathname || '/', labels, tCommon('record'), tNavigation('dashboard'), todayCrumb), crumbOverride);
}

export function CommandBar({
  crumbs,
  actions,
  hints = true,
  assistantToggle = false,
  actionsOnMobile = true,
}: {
  crumbs?: string[];
  actions?: React.ReactNode;
  hints?: boolean;
  /** Only the layout's bar shows it — pages that render their own bar would duplicate it. */
  assistantToggle?: boolean;
  /** False when the page already has its own sticky mobile action bar. */
  actionsOnMobile?: boolean;
}) {
  const tAssistant = useTranslations('assistant');
  const toggleAssistant = useAssistantStore((state) => state.toggle);
  const pathname = usePathname();
  const tCommon = useTranslations('common');
  const isListView = /\/(journal|accounts|partners|invoices|sales|purchase)/.test(pathname || '');
  const computedCrumbs = usePathCrumbs(crumbs);

  return (
    // Below lg the mobile top bar carries the page title and the assistant button, so the bar only
    // renders when a page hands it actions (e.g. save buttons of the editors).
    <div className={`${actions && actionsOnMobile ? 'flex' : 'hidden lg:flex'} items-center gap-2 px-4 pb-3 pt-4 sm:px-6 lg:px-7`}>
      <div className="hidden min-w-0 flex-1 items-center gap-2.5 rounded-[10px] lg:flex border border-[var(--a-border)] bg-[var(--a-surface)] px-3.5 py-2 text-[13px] text-[var(--a-text-2)]">
        <Command className="h-3.5 w-3.5 shrink-0 text-[var(--a-accent)]" />
        {computedCrumbs.map((crumb, index) => (
          <span key={`${crumb}-${index}`} className="contents">
            {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-[var(--a-text-3)]" />}
            <span
              className={index === 0 ? 'truncate font-medium text-[var(--a-text)]' : 'truncate text-[var(--a-text-2)]'}
            >
              {crumb}
            </span>
          </span>
        ))}
        <span className="flex-1" />
        {hints && isListView && (
          <span className="hidden items-center gap-1.5 text-[var(--a-text-3)] md:inline-flex">
            <span>{tCommon('press')}</span>
            <Kbd>/</Kbd>
            <span>{tCommon('toFilter')}</span>
            <span className="mx-1 h-3.5 w-px bg-[var(--a-border)]" />
          </span>
        )}
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </div>
      {actions && <div className={`${actionsOnMobile ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1 flex-wrap items-center justify-end gap-2 lg:flex-none lg:shrink-0 lg:flex-nowrap`}>{actions}</div>}
      {assistantToggle && (
        <button
          type="button"
          onClick={toggleAssistant}
          title={tAssistant('open')}
          className="hidden h-[38px] shrink-0 items-center gap-2 lg:inline-flex rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] font-medium text-[var(--a-text-2)] transition-colors hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)]"
        >
          <Sparkles className="h-3.5 w-3.5 text-[var(--a-accent)]" />
          <span className="hidden sm:inline">{tAssistant('askShort')}</span>
        </button>
      )}
    </div>
  );
}
