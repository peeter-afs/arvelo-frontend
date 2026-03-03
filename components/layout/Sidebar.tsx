'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  {
    name: 'Accounting',
    icon: Calculator,
    children: [
      { name: 'Chart of Accounts', href: '/dashboard/accounting/accounts' },
      { name: 'Journal Entries', href: '/dashboard/accounting/journal' },
      { name: 'Partners', href: '/dashboard/accounting/partners' },
    ]
  },
  { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  {
    name: 'Reports',
    icon: TrendingUp,
    children: [
      { name: 'Balance Sheet', href: '/dashboard/reports/balance-sheet' },
      { name: 'Profit & Loss', href: '/dashboard/reports/profit-loss' },
      { name: 'Trial Balance', href: '/dashboard/reports/trial-balance' },
      { name: 'General Ledger', href: '/dashboard/reports/general-ledger' },
    ]
  },
  { name: 'Fixed Assets', href: '/dashboard/assets', icon: PiggyBank },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, tenant, role, logout } = useAuthStore();

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

      {/* Logout button */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-2 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign out
        </button>
      </div>
    </div>
  );
}