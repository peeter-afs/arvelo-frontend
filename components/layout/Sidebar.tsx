'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Home,
  FileText,
  TrendingUp,
  Settings,
  LogOut,
  Calculator,
  PiggyBank,
  ChevronRight,
  X,
  Menu,
  ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSidebarStore } from '@/lib/stores/sidebar.store';
import { authApi } from '@/lib/api/auth.api';
import LanguageSwitcher from '../LanguageSwitcher';

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({ onClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const { user, tenant, role, logout } = useAuthStore();
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const t = useTranslations('navigation');
  const tAccounting = useTranslations('accounting');
  const tInvoices = useTranslations('invoices');
  const tReports = useTranslations('reports');
  const tCommon = useTranslations('common');

  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState<string[]>(['accounting', 'invoices', 'reports']);

  const navigation = [
    { name: t('dashboard'), href: '/', icon: Home },
    {
      id: 'accounting',
      name: t('accounting'),
      icon: Calculator,
      children: [
        { name: tAccounting('chartOfAccounts'), href: '/accounting/accounts' },
        { name: tAccounting('journalEntries'), href: '/accounting/journal' },
        { name: tAccounting('partners'), href: '/accounting/partners' },
        { name: tAccounting('openingBalances'), href: '/accounting/opening-balances' },
        { name: tAccounting('bankImport'), href: '/accounting/bank-import' },
        { name: tAccounting('bankReview'), href: '/accounting/bank-review' },
        { name: tAccounting('payments'), href: '/accounting/payments' },
        { name: tAccounting('paymentBatches'), href: '/accounting/payment-batches' },
      ]
    },
    {
      id: 'invoices',
      name: t('invoices'),
      icon: FileText,
      children: [
        { name: tInvoices('overview'), href: '/invoices' },
        { name: tInvoices('salesList'), href: '/invoices/sales' },
        { name: tInvoices('purchaseList'), href: '/invoices/purchase' },
        { name: tInvoices('purchaseImports'), href: '/invoices/purchase-imports' },
      ]
    },
    {
      id: 'reports',
      name: t('reports'),
      icon: TrendingUp,
      children: [
        { name: tReports('balanceSheet'), href: '/reports/balance-sheet' },
        { name: tReports('profitLoss'), href: '/reports/profit-loss' },
        { name: tReports('trialBalance'), href: '/reports/trial-balance' },
        { name: tReports('generalLedger'), href: '/reports/general-ledger' },
      ]
    },
    { name: t('fixedAssets'), href: '/assets', icon: PiggyBank },
    { name: t('settings'), href: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    window.location.href = '/login';
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Don't use collapsed state on mobile
  const effectiveCollapsed = isMobile ? false : isCollapsed;

  const widthClass = isMobile ? 'w-72' : (effectiveCollapsed ? 'w-16' : 'w-64');
  const navPadding = isMobile ? 'py-2.5' : 'py-2';
  const subItemPadding = isMobile ? 'py-2' : 'py-1';

  return (
    <div
      className={`flex flex-col h-full bg-[var(--sidebar-bg)] text-white ${widthClass} transition-all duration-300 overflow-y-auto`}
      style={{
        paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0)' : '0',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className={effectiveCollapsed ? 'hidden' : ''}>
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Arvelo
          </h1>
          {tenant && (
            <p className="text-xs text-slate-400 tracking-wide uppercase mt-0.5">
              {tenant.name}
            </p>
          )}
        </div>
        {/* Collapse/Expand button for desktop */}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className={`p-1.5 hover:bg-slate-800 rounded-md transition-colors ${effectiveCollapsed ? 'mx-auto' : ''}`}
            aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {effectiveCollapsed ? (
              <Menu className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-slate-400" />
            )}
          </button>
        )}
        {/* Close button for mobile */}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-md transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        )}
      </div>

      {/* User Section */}
      <div className={`${effectiveCollapsed ? 'p-2' : 'p-4'} border-b border-slate-800`}>
        <div className={`flex items-center ${effectiveCollapsed ? 'justify-center' : 'space-x-3 px-2'} py-1.5 rounded-lg hover:bg-slate-800/50 transition-all duration-200`}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-white">
              {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          {!effectiveCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {role || 'viewer'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          // Expandable section with children
          if ('children' in item && item.children) {
            const isExpanded = expandedSections.includes(item.id || '');
            const Icon = item.icon;

            // In collapsed mode, show just the icon as a dropdown trigger
            if (effectiveCollapsed) {
              return (
                <div key={item.id} className="relative group">
                  <button
                    className="flex items-center justify-center w-full p-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-lg transition-all duration-200"
                    title={item.name}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  </button>
                  {/* Dropdown on hover */}
                  <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 min-w-[200px]">
                      <div className="text-xs font-semibold text-slate-400 px-2 py-1">{item.name}</div>
                      {item.children.map((child) => {
                        const isActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={handleNavClick}
                            className={`
                              block px-2 py-1.5 text-sm rounded transition-all duration-200
                              ${
                                isActive
                                  ? 'bg-[var(--sidebar-active)] text-white'
                                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                              }
                            `}
                          >
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={item.id}>
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(item.id || '')}
                  className="flex items-center w-full px-3 py-2 text-sm text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-lg transition-all duration-200"
                >
                  <Icon className="h-[18px] w-[18px] mr-3" strokeWidth={1.5} />
                  <span className="flex-1 text-left font-medium">{item.name}</span>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Sub-items */}
                {isExpanded && !effectiveCollapsed && (
                  <div className="ml-9 mt-1 space-y-0.5 border-l border-slate-700/50 pl-3">
                    {item.children.map((child) => {
                      const isActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={handleNavClick}
                          className={`
                            block px-3 ${subItemPadding} text-[13px] rounded-lg transition-all duration-200
                            ${
                              isActive
                                ? 'text-white font-medium'
                                : 'text-slate-400 hover:text-slate-200'
                            }
                          `}
                        >
                          {child.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Regular navigation item
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleNavClick}
              className={`
                flex items-center ${effectiveCollapsed ? 'justify-center px-2' : 'px-3'} ${navPadding} text-sm rounded-lg transition-all duration-200
                ${
                  isActive
                    ? 'bg-[var(--sidebar-active)] text-white border-l-2 border-primary'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }
              `}
              title={effectiveCollapsed ? item.name : undefined}
            >
              <Icon className={`h-[18px] w-[18px] ${effectiveCollapsed ? '' : 'mr-3'}`} strokeWidth={1.5} />
              {!effectiveCollapsed && <span className="font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Language Switcher & Logout */}
      <div className={`${effectiveCollapsed ? 'p-2' : 'p-4'} border-t border-slate-800 space-y-2`}>
        {!effectiveCollapsed && (
          <div className="mb-2">
            <LanguageSwitcher />
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center ${effectiveCollapsed ? 'justify-center' : 'w-full px-3'} py-2 text-sm font-medium text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800/50 transition-all duration-200`}
          title={effectiveCollapsed ? tCommon('signOut') : undefined}
        >
          <LogOut className={`${effectiveCollapsed ? '' : 'mr-3'} h-[18px] w-[18px]`} strokeWidth={1.5} />
          {!effectiveCollapsed && tCommon('signOut')}
        </button>
      </div>
    </div>
  );
}
