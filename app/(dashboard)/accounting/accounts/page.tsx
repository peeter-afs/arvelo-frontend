'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Download, Upload, Edit2, Trash2, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

export default function ChartOfAccountsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for chart of accounts
  const accounts = [
    { id: 1, code: '1000', name: 'Cash', type: 'Asset', category: 'Current Asset', balance: 15000.00, status: 'active' },
    { id: 2, code: '1100', name: 'Accounts Receivable', type: 'Asset', category: 'Current Asset', balance: 23500.00, status: 'active' },
    { id: 3, code: '1200', name: 'Inventory', type: 'Asset', category: 'Current Asset', balance: 45000.00, status: 'active' },
    { id: 4, code: '1500', name: 'Fixed Assets', type: 'Asset', category: 'Fixed Asset', balance: 250000.00, status: 'active' },
    { id: 5, code: '2000', name: 'Accounts Payable', type: 'Liability', category: 'Current Liability', balance: 18000.00, status: 'active' },
    { id: 6, code: '2100', name: 'Short-term Loans', type: 'Liability', category: 'Current Liability', balance: 25000.00, status: 'active' },
    { id: 7, code: '3000', name: 'Common Stock', type: 'Equity', category: 'Equity', balance: 100000.00, status: 'active' },
    { id: 8, code: '4000', name: 'Sales Revenue', type: 'Revenue', category: 'Operating Revenue', balance: 85000.00, status: 'active' },
    { id: 9, code: '5000', name: 'Cost of Goods Sold', type: 'Expense', category: 'Operating Expense', balance: 45000.00, status: 'active' },
    { id: 10, code: '6000', name: 'Salaries & Wages', type: 'Expense', category: 'Operating Expense', balance: 28000.00, status: 'active' },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Asset': return 'bg-blue-50 text-blue-700';
      case 'Liability': return 'bg-amber-50 text-amber-700';
      case 'Equity': return 'bg-violet-50 text-violet-700';
      case 'Revenue': return 'bg-emerald-50 text-emerald-700';
      case 'Expense': return 'bg-rose-50 text-rose-700';
      default: return 'bg-slate-50 text-slate-700';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Chart of Accounts</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account structure and general ledger accounts</p>
      </div>

      {/* Actions Bar - Desktop */}
      <div className="hidden md:flex mb-6 justify-between items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '16px' }}
            className="w-72 h-10 pl-9 pr-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Filter */}
          <button className="h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700 transition-colors">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </button>

          {/* Export */}
          <button className="h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>

          {/* Import Button */}
          <Link
            href="/accounting/accounts/import"
            className="h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </Link>

          {/* Create Button */}
          <button className="h-10 px-4 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] flex items-center gap-2 text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" />
            <span>New Account</span>
          </button>
        </div>
      </div>

      {/* Actions Bar - Mobile */}
      <div className="md:hidden mb-4 space-y-3">
        {/* Search - Full width */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '16px' }}
            className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
          />
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2">
          <button className="flex-1 h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2 text-sm text-slate-700">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </button>
          <button className="flex-1 h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2 text-sm text-slate-700">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button className="h-10 w-10 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-700">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Floating Action Button - Mobile */}
      <button className="md:hidden fixed bottom-6 right-6 w-[52px] h-[52px] bg-[var(--primary)] text-white rounded-full shadow-lg hover:bg-[var(--primary-hover)] flex items-center justify-center z-20 transition-all active:scale-95">
        <Plus className="h-6 w-6" />
      </button>

      {/* Desktop Table */}
      <div className="hidden md:block card overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Account Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Category
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">
                Balance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {accounts.map((account) => (
              <tr key={account.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                  {account.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {account.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs font-medium rounded-md ${getTypeColor(account.type)}`}>
                    {account.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {account.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono tabular-nums text-slate-900 text-right">
                  €{account.balance.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${account.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <span className="text-xs text-slate-600 capitalize">{account.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-2">
        {accounts.map((account) => (
          <div key={account.id} className="card p-4 active:bg-slate-50 transition-colors cursor-pointer">
            {/* Top row: code + type badge */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-slate-500">{account.code}</span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${getTypeColor(account.type)}`}>
                {account.type}
              </span>
            </div>

            {/* Account name */}
            <div className="font-medium text-base text-slate-900 mb-3">
              {account.name}
            </div>

            {/* Bottom row: balance + status + actions */}
            <div className="flex items-center justify-between">
              <div className="font-mono text-sm text-slate-900 tabular-nums">
                €{account.balance.toFixed(2)}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${account.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  <span className="text-xs text-slate-600 capitalize">{account.status}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination - Desktop */}
      <div className="hidden md:flex mt-6 justify-between items-center">
        <p className="text-sm text-slate-600">
          Showing 1-10 of 10
        </p>
        <div className="flex gap-2">
          <button className="h-8 px-3 border border-slate-200 rounded-md text-sm text-slate-600 hover:bg-slate-50 transition-colors opacity-50 cursor-not-allowed" disabled>
            Previous
          </button>
          <button className="h-8 px-3 border border-slate-200 rounded-md text-sm text-slate-600 hover:bg-slate-50 transition-colors opacity-50 cursor-not-allowed" disabled>
            Next
          </button>
        </div>
      </div>

      {/* Pagination - Mobile */}
      <div className="md:hidden mt-4 flex items-center justify-center gap-4">
        <button className="h-8 w-8 flex items-center justify-center border border-slate-200 rounded-md text-slate-600 opacity-50 cursor-not-allowed" disabled>
          <span className="text-sm">&lt;</span>
        </button>
        <p className="text-sm text-slate-600">Page 1 of 1</p>
        <button className="h-8 w-8 flex items-center justify-center border border-slate-200 rounded-md text-slate-600 opacity-50 cursor-not-allowed" disabled>
          <span className="text-sm">&gt;</span>
        </button>
      </div>
    </div>
  );
}
