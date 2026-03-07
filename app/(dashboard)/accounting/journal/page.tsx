'use client';

import { useState } from 'react';
import { BookOpen, Plus, Search, Filter, Download, Eye, Edit2 } from 'lucide-react';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'reversed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Journal Entries</h1>
        <p className="text-gray-600 mt-1">Record and manage all financial transactions</p>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter */}
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filter</span>
          </button>

          {/* Download */}
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export</span>
          </button>
        </div>

        {/* Create Button */}
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>New Entry</span>
        </button>
      </div>

      {/* Journal Entries Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reference
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Debit Account
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Debit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Credit Account
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Credit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {entry.number}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {entry.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {entry.debit.code} - {entry.debit.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                  €{entry.debit.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {entry.credit.code} - {entry.credit.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                  €{entry.credit.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(entry.status)}`}>
                    {entry.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="h-4 w-4" />
                    </button>
                    {entry.status === 'draft' && (
                      <button className="text-blue-600 hover:text-blue-900">
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

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <p className="text-sm text-gray-700">
          Showing 1 to 5 of 5 results
        </p>
        <div className="flex space-x-2">
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">
            Previous
          </button>
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
