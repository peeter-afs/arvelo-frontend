'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  Landmark,
  LogOut,
  Menu,
  PiggyBank,
  ReceiptText,
  Settings,
  type LucideIcon,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authApi } from '@/lib/api/auth.api';
import { formatMetricCount, useNavigationMetrics } from '@/lib/hooks/useNavigationMetrics';
import { isTaskRoute } from '@/lib/nav/task-routes';
import { useSidebarStore } from '@/lib/stores/sidebar.store';
import { Kbd } from '@/components/ui/Kbd';

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

type NavChild = {
  label: string;
  href: string;
};

type NavItem = {
  id?: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: string;
  children?: NavChild[];
};

type Flyout = {
  sectionId: string;
  top: number;
};

function initials(value?: string | null) {
  if (!value) return 'A';
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function isActivePath(pathname: string, href: string) {
  if (href === '/' || href === '/invoices' || href === '/accounting/journal' || href === '/settings') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const SECTION_PATH_PREFIXES: Record<string, string[]> = {
  invoices: ['/invoices/'],
  bank: ['/accounting/bank-'],
  ledger: ['/accounting/journal/'],
  settings: ['/settings/'],
};

function isSectionActive(item: NavItem, pathname: string) {
  if (item.children?.some((child) => isActivePath(pathname, child.href))) return true;
  return item.id
    ? SECTION_PATH_PREFIXES[item.id]?.some((prefix) => pathname.startsWith(prefix)) ?? false
    : false;
}

function activeSectionForPath(navigation: NavItem[], pathname: string) {
  return navigation.find((item) => isSectionActive(item, pathname))?.id ?? null;
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
  const {
    isCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
    autoCollapseOnTask,
    setAutoCollapse,
    expandedSection,
    setExpandedSection,
    manualOverrides,
  } = useSidebarStore();
  const navigationMetrics = useNavigationMetrics();
  const currentPath = pathname || '/';
  const previousPathRef = useRef(currentPath);
  const flyoutCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flyout, setFlyout] = useState<Flyout | null>(null);

  const navigation: NavItem[] = [
    { label: tNavigation('dashboard'), href: '/', icon: Home },
    {
      id: 'invoices',
      label: tInvoices('overview'),
      icon: FileText,
      badge: formatMetricCount(navigationMetrics.invoiceCount),
      children: [
        { label: tInvoices('overview'), href: '/invoices' },
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
      id: 'bank',
      label: tAccounting('bank'),
      icon: Landmark,
      children: [
        { label: tAccounting('bankWorkspace'), href: '/accounting/bank' },
        { label: tAccounting('payments'), href: '/accounting/payments' },
        { label: tAccounting('paymentBatches'), href: '/accounting/payment-batches' },
      ],
    },
    {
      id: 'ledger',
      label: tReports('generalLedger'),
      icon: ReceiptText,
      children: [
        { label: tAccounting('chartOfAccounts'), href: '/accounting/accounts' },
        { label: tAccounting('journal'), href: '/accounting/journal' },
        { label: tExpenses('title'), href: '/accounting/recurring-expenses' },
        { label: tAccounting('openingBalances'), href: '/accounting/opening-balances' },
        { label: tAccounting('monthEnd'), href: '/accounting/month-end' },
        { label: tAccounting('partners'), href: '/accounting/partners' },
        { label: tAccounting('fiscalYears'), href: '/accounting/fiscal-years' },
        { label: tAccounting('exchangeRates'), href: '/accounting/exchange-rates' },
      ],
    },
    {
      id: 'reports',
      label: tNavigation('reports'),
      icon: BarChart3,
      children: [
        { label: tReports('profitLoss'), href: '/reports/profit-loss' },
        { label: tReports('balanceSheet'), href: '/reports/balance-sheet' },
        { label: tReports('trialBalance'), href: '/reports/trial-balance' },
        { label: tReports('turnoverReport'), href: '/reports/turnover' },
        { label: tReports('generalLedger'), href: '/reports/general-ledger' },
        { label: tReports('vatReport'), href: '/reports/vat' },
        { label: tReports('agingReport'), href: '/reports/aging' },
        { label: tReports('annualReport'), href: '/reports/annual-report' },
      ],
    },
    { label: tNavigation('fixedAssets'), href: '/assets', icon: PiggyBank },
    {
      id: 'settings',
      label: tNavigation('settings'),
      icon: Settings,
      children: [
        { label: tNavigation('settings'), href: '/settings' },
        { label: tNavigation('security'), href: '/settings/security' },
        { label: tNavigation('auditLog'), href: '/settings/audit-log' },
      ],
    },
  ];

  const effectiveCollapsed = isMobile ? false : isCollapsed;

  useEffect(() => {
    const activeSection = activeSectionForPath(navigation, currentPath);
    setExpandedSection(activeSection);
    // Translation and metric changes do not affect which section owns the route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, setExpandedSection]);

  useEffect(() => {
    if (isMobile || !window.matchMedia('(min-width: 1024px)').matches) return;

    const previousPath = previousPathRef.current;
    const wasTaskRoute = isTaskRoute(previousPath);
    const taskRoute = isTaskRoute(currentPath);

    if (autoCollapseOnTask && taskRoute && !manualOverrides.includes(currentPath)) {
      setSidebarCollapsed(true);
    } else if (wasTaskRoute && !taskRoute) {
      setSidebarCollapsed(false);
    }

    previousPathRef.current = currentPath;
  }, [autoCollapseOnTask, currentPath, isMobile, manualOverrides, setSidebarCollapsed]);

  useEffect(() => {
    if (!effectiveCollapsed) setFlyout(null);
  }, [effectiveCollapsed]);

  useEffect(() => () => {
    if (flyoutCloseTimerRef.current) clearTimeout(flyoutCloseTimerRef.current);
  }, []);

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    window.location.href = '/login';
  };

  const handleNavClick = () => {
    if (isMobile && onClose) onClose();
    setFlyout(null);
  };

  const handleSidebarToggle = () => {
    if (isCollapsed && isTaskRoute(currentPath) && !manualOverrides.includes(currentPath)) {
      useSidebarStore.setState((state) => ({
        manualOverrides: [...state.manualOverrides, currentPath],
      }));
    }
    toggleSidebar();
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const cancelFlyoutClose = () => {
    if (flyoutCloseTimerRef.current) {
      clearTimeout(flyoutCloseTimerRef.current);
      flyoutCloseTimerRef.current = null;
    }
  };

  const openFlyout = (sectionId: string, element: HTMLElement) => {
    cancelFlyoutClose();
    setFlyout({ sectionId, top: element.getBoundingClientRect().top });
  };

  const scheduleFlyoutClose = () => {
    cancelFlyoutClose();
    flyoutCloseTimerRef.current = setTimeout(() => setFlyout(null), 120);
  };

  const activeFlyoutItem = navigation.find((item) => item.id === flyout?.sectionId);

  return (
    <aside
      className={`${isMobile ? 'w-72' : effectiveCollapsed ? 'w-16' : 'w-60'} flex h-full shrink-0 flex-col overflow-hidden bg-[var(--a-side-bg)] text-[var(--a-side-text)] transition-all duration-300`}
      style={{ paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0)' : 0 }}
    >
      <div className="border-b border-[var(--a-side-border)] px-[18px] pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          {!effectiveCollapsed && (
            <Link href="/" onClick={handleNavClick} className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--a-accent)] text-sm font-bold text-[var(--a-accent-on)]">
                A
              </span>
              <span className="truncate text-[17px] font-semibold text-white">Arvelo</span>
            </Link>
          )}

          {!isMobile && (
            <div className={`flex items-center gap-2 ${effectiveCollapsed ? 'mx-auto' : ''}`}>
              {!effectiveCollapsed && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoCollapseOnTask}
                  aria-label={tNavigation('autoCollapse')}
                  title={`${tNavigation('autoCollapse')} — ${tNavigation('autoCollapseHint')}`}
                  onClick={() => setAutoCollapse(!autoCollapseOnTask)}
                  className={`relative h-3.5 w-[26px] shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--a-accent)] ${
                    autoCollapseOnTask ? 'bg-primary/20' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-[3px] h-2 w-2 rounded-full transition-all ${
                      autoCollapseOnTask ? 'left-[15px] bg-primary' : 'left-[3px] bg-slate-400'
                    }`}
                  />
                </button>
              )}
              <button
                type="button"
                onClick={handleSidebarToggle}
                className="rounded-md p-1.5 text-[var(--a-side-muted)] transition-colors hover:bg-[var(--a-side-active)] hover:text-white"
                aria-label={effectiveCollapsed ? tCommon('openNavigationMenu') : tCommon('closeMenu')}
                title={effectiveCollapsed ? tCommon('openNavigationMenu') : tCommon('closeMenu')}
              >
                {effectiveCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>
          )}

          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-[var(--a-side-muted)] hover:bg-[var(--a-side-active)] hover:text-white"
              aria-label={tCommon('closeMenu')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button className={`mt-3.5 flex w-full items-center rounded-lg bg-white/[0.04] py-2 text-left ${effectiveCollapsed ? 'justify-center px-0' : 'gap-2 px-2.5'}`}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-white">
            {initials(tenant?.name)}
          </span>
          {!effectiveCollapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-white">{tenant?.name || tCommon('companyWorkspace')}</span>
                <span className="mt-0.5 inline-flex rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[var(--a-side-muted)]">
                  {navigationMetrics.fiscalYearLabel}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-[var(--a-side-muted)]" />
            </>
          )}
        </button>
      </div>

      <nav className="sidebar-scroll flex-1 overflow-y-auto px-2 py-3" aria-label={tCommon('mainNavigation')}>
        <div className="space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;

            if (item.children && item.id) {
              const isExpanded = expandedSection === item.id;
              const active = isSectionActive(item, currentPath);

              if (effectiveCollapsed) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={(event) => openFlyout(item.id!, event.currentTarget)}
                    onMouseLeave={scheduleFlyoutClose}
                    onFocus={(event) => openFlyout(item.id!, event.currentTarget)}
                    onBlur={scheduleFlyoutClose}
                    onClick={(event) => openFlyout(item.id!, event.currentTarget)}
                    className={`relative flex w-full items-center justify-center rounded-[7px] px-2.5 py-2 text-[13.5px] transition-colors ${
                      active
                        ? 'bg-[var(--a-side-active)] font-medium text-white'
                        : 'text-[var(--a-side-text)] hover:bg-[var(--a-side-active)] hover:text-white'
                    }`}
                    aria-expanded={flyout?.sectionId === item.id}
                    title={item.label}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-[var(--a-accent)]" />}
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-[var(--a-side-muted)]'}`} />
                  </button>
                );
              }

              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggleSection(item.id!)}
                    className={`relative flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13.5px] transition-colors ${
                      active
                        ? 'bg-[var(--a-side-active)] font-medium text-white'
                        : 'text-[var(--a-side-text)] hover:bg-[var(--a-side-active)] hover:text-white'
                    }`}
                    aria-expanded={isExpanded}
                    aria-controls={`nav-section-${item.id}`}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-[var(--a-accent)]" />}
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-[var(--a-side-muted)]'}`} />
                    <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                    {item.badge && item.badge !== '0' && (
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[10.5px] ${active ? 'bg-[var(--a-accent-soft)] text-[var(--a-accent)]' : 'bg-white/[0.05] text-[var(--a-side-muted)]'}`}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div id={`nav-section-${item.id}`} className="mt-0.5 space-y-0.5 pl-8" role="group" aria-label={item.label}>
                      {item.children.map((child) => {
                        const childActive = isActivePath(currentPath, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={handleNavClick}
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
            }

            const active = item.href ? isActivePath(currentPath, item.href) : false;
            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={handleNavClick}
                className={`relative flex items-center rounded-[7px] px-2.5 py-2 text-[13.5px] transition-colors ${
                  effectiveCollapsed ? 'justify-center' : 'gap-2.5'
                } ${
                  active
                    ? 'bg-[var(--a-side-active)] font-medium text-white'
                    : 'text-[var(--a-side-text)] hover:bg-[var(--a-side-active)] hover:text-white'
                }`}
                title={effectiveCollapsed ? item.label : undefined}
              >
                {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-[var(--a-accent)]" />}
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-[var(--a-side-muted)]'}`} />
                {!effectiveCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[var(--a-side-border)] p-3">
        <div className={`flex items-center gap-2.5 ${effectiveCollapsed ? 'flex-col' : ''}`}>
          <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-[var(--a-accent)] text-xs font-bold text-white">
            {initials(user?.name || user?.email)}
          </div>
          {!effectiveCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-white">{user?.name || user?.email || tCommon('user')}</div>
                <div className="truncate text-[11px] capitalize text-[var(--a-side-muted)]">{role || tCommon('viewer')}</div>
              </div>
              <Kbd className="border-white/10 bg-white/[0.06] text-[var(--a-side-muted)]">⌘K</Kbd>
            </>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md p-1.5 text-[var(--a-side-muted)] hover:bg-[var(--a-side-active)] hover:text-white"
            aria-label={tCommon('signOut')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {flyout && activeFlyoutItem?.children && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed left-16 z-50 ml-2 min-w-[200px] rounded-lg border border-[var(--a-side-border)] bg-[var(--a-side-bg)] p-2 shadow-xl"
          style={{ top: flyout.top }}
          onMouseEnter={cancelFlyoutClose}
          onMouseLeave={scheduleFlyoutClose}
          onFocus={cancelFlyoutClose}
          onBlur={scheduleFlyoutClose}
        >
          <div className="px-2 py-1 text-xs font-semibold text-[var(--a-side-muted)]">{activeFlyoutItem.label}</div>
          {activeFlyoutItem.children.map((child) => {
            const childActive = isActivePath(currentPath, child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={handleNavClick}
                className={`block rounded px-2 py-1.5 text-sm transition-colors ${
                  childActive
                    ? 'bg-[var(--a-side-active)] font-medium text-white'
                    : 'text-[var(--a-side-muted)] hover:bg-[var(--a-side-active)] hover:text-white'
                }`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>,
        document.body
      )}
    </aside>
  );
}
