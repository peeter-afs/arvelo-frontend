'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Download, Send, Eye, MoreHorizontal, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';

export default function InvoicesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  // Helper function to get avatar initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Mock data for now - will connect to API later
  const invoices = [
    { id: 1, number: 'INV-2024-001', customer: 'Acme Corp', amount: 1250.00, status: 'paid', date: '2024-01-15' },
    { id: 2, number: 'INV-2024-002', customer: 'Tech Solutions', amount: 3500.00, status: 'pending', date: '2024-01-20' },
    { id: 3, number: 'INV-2024-003', customer: 'Global Services', amount: 890.00, status: 'overdue', date: '2024-01-10' },
  ];

  const tabs = [
    { id: 'all', label: 'All', count: 3 },
    { id: 'pending', label: 'Pending', count: 1 },
    { id: 'paid', label: 'Paid', count: 1 },
    { id: 'overdue', label: 'Overdue', count: 1 },
  ] as const;

  const filteredInvoices = activeTab === 'all'
    ? invoices
    : invoices.filter(inv => inv.status === activeTab);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your sales invoices and billing</p>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 flex gap-3 overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible">
        <div className="card p-4 md:p-5 min-w-[200px] snap-start flex-shrink-0 md:min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500">Total Outstanding</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">€4,390.00</p>
        </div>
        <div className="card p-4 md:p-5 min-w-[200px] snap-start flex-shrink-0 md:min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500">Total Overdue</p>
          <p className="text-xl md:text-2xl font-bold text-red-600 mt-1">€890.00</p>
        </div>
        <div className="card p-4 md:p-5 min-w-[200px] snap-start flex-shrink-0 md:min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500">Paid This Month</p>
          <p className="text-xl md:text-2xl font-bold text-emerald-600 mt-1">€1,250.00</p>
        </div>
      </div>

      {/* Tab Filters - Desktop */}
      <div className="hidden md:flex mb-6 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              activeTab === tab.id
                ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Filters - Mobile (Dropdown) */}
      <div className="md:hidden mb-4">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as any)}
          className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
          style={{ fontSize: '16px' }}
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label} ({tab.count})
            </option>
          ))}
        </select>
      </div>

      {/* Actions Bar - Desktop */}
      <div className="hidden md:flex mb-6 justify-between items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoices..."
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

          {/* Create Button */}
          <button className="h-10 px-4 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] flex items-center gap-2 text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" />
            <span>New Invoice</span>
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
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '16px' }}
            className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
          />
        </div>
      </div>

      {/* Floating Action Button - Mobile */}
      <button className="md:hidden fixed bottom-6 right-6 w-[52px] h-[52px] bg-[var(--primary)] text-white rounded-full shadow-lg hover:bg-[var(--primary-hover)] flex items-center justify-center z-20 transition-all active:scale-95">
        <Plus className="h-6 w-6" />
      </button>

      {/* Desktop Table */}
      <div className="hidden md:block card overflow-hidden mb-6">
        <table className="min-w-full">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Invoice Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">
                Amount
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
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-[var(--primary)] hover:underline cursor-pointer">
                  {invoice.number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-xs font-medium">
                      {getInitials(invoice.customer)}
                    </div>
                    <span className="text-sm text-slate-900">{invoice.customer}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {invoice.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono tabular-nums font-medium text-slate-900 text-right">
                  €{invoice.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      invoice.status === 'paid' ? 'bg-emerald-500' :
                      invoice.status === 'pending' ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}></div>
                    <span className="text-xs text-slate-600 capitalize">{invoice.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors" title="View">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors" title="Send">
                      <Send className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors" title="Download">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-2 mb-6">
        {filteredInvoices.map((invoice) => (
          <div key={invoice.id} className="card p-4 active:bg-slate-50 transition-colors cursor-pointer">
            {/* Header row: invoice number + amount */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm text-[var(--primary)]">{invoice.number}</span>
              <span className="font-mono text-base font-semibold text-slate-900">€{invoice.amount.toFixed(2)}</span>
            </div>

            {/* Middle: customer with avatar + date */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-xs font-medium">
                {getInitials(invoice.customer)}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">{invoice.customer}</div>
                <div className="text-xs text-slate-400">{invoice.date}</div>
              </div>
            </div>

            {/* Footer: status + action icons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${
                  invoice.status === 'paid' ? 'bg-emerald-500' :
                  invoice.status === 'pending' ? 'bg-amber-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-xs text-slate-600 capitalize">{invoice.status}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
                <button
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination - Desktop */}
      <div className="hidden md:flex justify-between items-center">
        <p className="text-sm text-slate-600">
          Showing 1-{filteredInvoices.length} of {filteredInvoices.length}
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
      <div className="md:hidden flex items-center justify-center gap-4">
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