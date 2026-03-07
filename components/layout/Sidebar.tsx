'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Home,
  BookOpen,
  FileText,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Building,
  Calculator,
  UserPlus,
  PiggyBank,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authApi } from '@/lib/api/auth.api';
import LanguageSwitcher from '../LanguageSwitcher';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, tenant, role, logout } = useAuthStore();
  const t = useTranslations('navigation');
  const tAccounting = useTranslations('accounting');
  const tReports = useTranslations('reports');
  const tCommon = useTranslations('common');

  const navigation = [
    { name: t('dashboard'), href: '/', icon: Home },
    {
      name: t('accounting'),
      icon: Calculator,
      children: [
        { name: tAccounting('chartOfAccounts'), href: '/accounting/accounts' },
        { name: tAccounting('journalEntries'), href: '/accounting/journal' },
        { name: tAccounting('partners'), href: '/accounting/partners' },
      ]
    },
    { name: t('invoices'), href: '/invoices', icon: FileText },
    {
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

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Arvelo</h1>
        {tenant && (
          <p className="text-sm text-gray-400 mt-1">{tenant.name}</p>
        )}
      </div>

      {/* User info */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold">
              {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-400">{role || 'viewer'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          if (item.children) {
            return (
              <div key={item.name}>
                <div className="flex items-center px-2 py-2 text-sm font-medium text-gray-300">
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </div>
                <div className="ml-8 space-y-1">
                  {item.children.map((child) => {
                    const isActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`
                          block px-2 py-1 text-sm rounded-md transition-colors
                          ${
                            isActive
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }
                        `}
                      >
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Language Switcher & Logout */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <div className="mb-2">
          <LanguageSwitcher />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-2 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          {tCommon('signOut')}
        </button>
      </div>
    </div>
  );
}