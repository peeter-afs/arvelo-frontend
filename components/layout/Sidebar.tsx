'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Building2,
  ChevronDown,
  FileText,
  Home,
  Landmark,
  LogOut,
  ReceiptText,
  RefreshCw,
  Scale,
  Settings,
  Shield,
  type LucideIcon,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authApi } from '@/lib/api/auth.api';
import { formatMetricCount, useNavigationMetrics } from '@/lib/hooks/useNavigationMetrics';
import { Kbd } from '@/components/ui/Kbd';

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  children?: Omit<NavItem, 'children' | 'icon'>[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function initials(value?: string | null) {
  if (!value) return 'A';
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/accounting/journal') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ onClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const tCommon = useTranslations('common');
  const tNavigation = useTranslations('navigation');
  const tAccounting = useTranslations('accounting');
  const tInvoices = useTranslations('invoices');
  const tReports = useTranslations('reports');
  const tExpenses = useTranslations('recurringExpenses');
  const { user, tenant, role, logout } = useAuthStore();
  const navigationMetrics = useNavigationMetrics();
  const currentPath = pathname || '/';
  const navGroups: NavGroup[] = [
    {
      label: tNavigation('workspace'),
      items: [
        { label: tNavigation('dashboard'), href: '/', icon: Home },
        { label: tAccounting('journalEntries'), href: '/accounting/journal', icon: ReceiptText, badge: formatMetricCount(navigationMetrics.journalEntryCount) },
        {
          label: tInvoices('overview'),
          href: '/invoices',
          icon: FileText,
          badge: formatMetricCount(navigationMetrics.invoiceCount),
          children: [
            { label: tInvoices('salesList'), href: '/invoices/sales' },
            { label: tInvoices('purchaseList'), href: '/invoices/purchase' },
            { label: tInvoices('purchaseApprovals'), href: '/invoices/purchase-approvals' },
            { label: tInvoices('purchaseImports'), href: '/invoices/purchase-imports' },
            { label: tInvoices('recurring'), href: '/invoices/recurring' },
            { label: tInvoices('reminders'), href: '/invoices/reminders' },
            { label: tInvoices('productsTitle'), href: '/invoices/products' },
          ],
        },
        {
          label: tAccounting('bank'),
          href: '/accounting/bank-import',
          icon: Landmark,
          children: [
            { label: tAccounting('bankImport'), href: '/accounting/bank-import' },
            { label: tAccounting('bankReview'), href: '/accounting/bank-review' },
            { label: tAccounting('bankReconciliation'), href: '/accounting/bank-reconciliation' },
            { label: tAccounting('payments'), href: '/accounting/payments' },
            { label: tAccounting('paymentBatches'), href: '/accounting/payment-batches' },
          ],
        },
      ],
    },
    {
      label: tNavigation('books'),
      items: [
        { label: tAccounting('chartOfAccounts'), href: '/accounting/accounts', icon: Scale },
        { label: tAccounting('journal'), href: '/accounting/journal', icon: ReceiptText },
        { label: tExpenses('title'), href: '/accounting/recurring-expenses', icon: RefreshCw },
        { label: tNavigation('reports'), href: '/reports/profit-loss', icon: BarChart3 },
        { label: tReports('vatReport'), href: '/reports/vat', icon: Shield },
        { label: tReports('annualReport'), href: '/reports/annual-report', icon: FileText },
      ],
    },
    {
      label: tNavigation('settings'),
      items: [
        { label: tAccounting('partners'), href: '/accounting/partners', icon: Building2 },
        { label: tNavigation('settings'), href: '/settings', icon: Settings },
        { label: tNavigation('security'), href: '/settings/security', icon: Shield },
      ],
    },
  ];

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    window.location.href = '/login';
  };

  return (
    <aside
      className={`${isMobile ? 'w-72' : 'w-60'} flex h-full shrink-0 flex-col overflow-hidden bg-[var(--a-side-bg)] text-[var(--a-side-text)]`}
      style={{ paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0)' : 0 }}
    >
      <div className="border-b border-[var(--a-side-border)] px-[18px] pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" onClick={onClose} className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--a-accent)] text-sm font-bold text-[var(--a-accent-on)]">
              A
            </span>
            <span className="truncate text-[17px] font-semibold text-white">Arvelo</span>
          </Link>
          {isMobile && (
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-[var(--a-side-muted)] hover:bg-[var(--a-side-active)] hover:text-white"
              aria-label={tCommon('closeMenu')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button className="mt-3.5 flex w-full items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-2 text-left">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-white">
            {initials(tenant?.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-white">{tenant?.name || tCommon('companyWorkspace')}</span>
            <span className="mt-0.5 inline-flex rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[var(--a-side-muted)]">
              {navigationMetrics.fiscalYearLabel}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--a-side-muted)]" />
        </button>
      </div>

      <nav className="sidebar-scroll flex-1 overflow-y-auto px-2 py-3" aria-label={tCommon('mainNavigation')}>
        {navGroups.map((group) => (
          <div key={group.label} className="pb-2">
            <div className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--a-side-muted)]">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(currentPath, item.href);

                return (
                  <div key={`${group.label}-${item.href}-${item.label}`}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`relative flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13.5px] transition-colors ${
                        active
                          ? 'bg-[var(--a-side-active)] font-medium text-white'
                          : 'text-[var(--a-side-text)] hover:bg-[var(--a-side-active)] hover:text-white'
                      }`}
                    >
                      {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-[var(--a-accent)]" />}
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-[var(--a-side-muted)]'}`} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge && item.badge !== '0' && (
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10.5px] ${
                            active ? 'bg-[var(--a-accent-soft)] text-[var(--a-accent)]' : 'bg-white/[0.05] text-[var(--a-side-muted)]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>

                    {item.children && (
                      <div className="mt-0.5 space-y-0.5 pl-8">
                        {item.children.map((child) => {
                          const childActive = isActivePath(currentPath, child.href);

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={onClose}
                              className={`relative flex min-h-8 items-center rounded-[7px] px-2 py-1.5 text-[12.5px] transition-colors ${
                                childActive
                                  ? 'bg-[var(--a-side-active)] font-medium text-white'
                                  : 'text-[var(--a-side-muted)] hover:bg-[var(--a-side-active)] hover:text-white'
                              }`}
                            >
                              {childActive && <span className="absolute left-0 top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-[var(--a-accent)]" />}
                              <span className="truncate">{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--a-side-border)] p-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-[var(--a-accent)] text-xs font-bold text-white">
            {initials(user?.name || user?.email)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-white">{user?.name || user?.email || tCommon('user')}</div>
            <div className="truncate text-[11px] capitalize text-[var(--a-side-muted)]">{role || tCommon('viewer')}</div>
          </div>
          <Kbd className="border-white/10 bg-white/[0.06] text-[var(--a-side-muted)]">⌘K</Kbd>
          <button
            onClick={handleLogout}
            className="rounded-md p-1.5 text-[var(--a-side-muted)] hover:bg-[var(--a-side-active)] hover:text-white"
            aria-label={tCommon('signOut')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
