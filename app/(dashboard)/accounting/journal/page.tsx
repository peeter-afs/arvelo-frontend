'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Download, Eye, Edit2, MoreHorizontal } from 'lucide-react';

export default function JournalEntriesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for journal entries
  const entries = [
    {
      id: 1,
      date: '2024-02-28',
      number: 'JE-001',
      description: 'Client payment received',
      debit: { account: '1000', name: 'Cash', amount: 5000.00 },
      credit: { account: '1100', name: 'Accounts Receivable', amount: 5000.00 },
      reference: 'INV-2024-001',
      status: 'posted'
    },
    {
      id: 2,
      date: '2024-02-27',
      number: 'JE-002',
      description: 'Salary expense payment',
      debit: { account: '6000', name: 'Salaries & Wages', amount: 8000.00 },
      credit: { account: '1000', name: 'Cash', amount: 8000.00 },
      reference: 'FEB-PAYROLL',
      status: 'posted'
    },
    {
      id: 3,
      date: '2024-02-26',
      number: 'JE-003',
      description: 'Office supplies purchased',
      debit: { account: '6100', name: 'Office Supplies', amount: 450.00 },
      credit: { account: '2000', name: 'Accounts Payable', amount: 450.00 },
      reference: 'PO-2024-015',
      status: 'posted'
    },
    {
      id: 4,
      date: '2024-02-25',
      number: 'JE-004',
      description: 'Sales invoice created',
      debit: { account: '1100', name: 'Accounts Receivable', amount: 3500.00 },
      credit: { account: '4000', name: 'Sales Revenue', amount: 3500.00 },
      reference: 'INV-2024-005',
      status: 'posted'
    },
    {
      id: 5,
      date: '2024-02-24',
      number: 'JE-005',
      description: 'Equipment depreciation',
      debit: { account: '6200', name: 'Depreciation Expense', amount: 1200.00 },
      credit: { account: '1550', name: 'Accumulated Depreciation', amount: 1200.00 },
      reference: 'MONTHLY-ACCRUAL',
      status: 'draft'
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Journal Entries</h1>
        <p className="text-sm text-slate-500 mt-1">Record and manage all financial transactions</p>
      </div>

      {/* Actions Bar - Desktop */}
      <div className="hidden md:flex mb-6 justify-between items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search entries..."
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

          {/* Create Button */}
          <button className="h-10 px-4 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] flex items-center gap-2 text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" />
            <span>New Entry</span>
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
            placeholder="Search entries..."
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
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Reference
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Debit Account
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">
                Debit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Credit Account
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">
                Credit
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
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${
                  entry.status === 'draft' ? 'border-l-2 border-l-amber-300' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {entry.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-[var(--primary)] hover:underline cursor-pointer">
                  {entry.number}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                  {entry.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {entry.debit.account} · {entry.debit.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono tabular-nums text-slate-900 text-right">
                  €{entry.debit.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {entry.credit.account} · {entry.credit.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono tabular-nums text-slate-900 text-right">
                  €{entry.credit.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      entry.status === 'posted' ? 'bg-emerald-500' :
                      entry.status === 'draft' ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}></div>
                    <span className="text-xs text-slate-600 capitalize">{entry.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    {entry.status === 'draft' && (
                      <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`card p-4 active:bg-slate-50 transition-colors cursor-pointer ${
              entry.status === 'draft' ? 'border-l-2 border-l-amber-300' : ''
            }`}
          >
            {/* Top row: date + status */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{entry.date}</span>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${
                  entry.status === 'posted' ? 'bg-emerald-500' :
                  entry.status === 'draft' ? 'bg-amber-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-xs text-slate-600 capitalize">{entry.status}</span>
              </div>
            </div>

            {/* Reference number */}
            <div className="font-mono text-sm text-[var(--primary)] mb-1">
              {entry.number}
            </div>

            {/* Description */}
            <div className="text-sm text-slate-600 mb-3">
              {entry.description}
            </div>

            {/* Debit/Credit details */}
            <div className="space-y-2 mb-3 bg-slate-50 rounded-lg p-3">
              <div className="flex justify-between text-xs">
                <div className="text-slate-500">
                  <div className="font-medium mb-0.5">Debit</div>
                  <div>{entry.debit.account} · {entry.debit.name}</div>
                </div>
                <div className="font-mono tabular-nums text-slate-900">
                  €{entry.debit.amount.toFixed(2)}
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <div className="text-slate-500">
                  <div className="font-medium mb-0.5">Credit</div>
                  <div>{entry.credit.account} · {entry.credit.name}</div>
                </div>
                <div className="font-mono tabular-nums text-slate-900">
                  €{entry.credit.amount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Bottom row: reference + actions */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Ref: {entry.reference}
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye className="h-4 w-4" />
                </button>
                {entry.status === 'draft' && (
                  <button
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination - Desktop */}
      <div className="hidden md:flex mt-6 justify-between items-center">
        <p className="text-sm text-slate-600">
          Showing 1-5 of 5
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
