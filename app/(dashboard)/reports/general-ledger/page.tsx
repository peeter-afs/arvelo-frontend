'use client';

import { useState } from 'react';
import { BookMarked, Download, Filter, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

export default function GeneralLedgerPage() {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-02-29');
  const [expandedAccounts, setExpandedAccounts] = useState<number[]>([]);

  // Mock general ledger data
  const ledgerData = [
    {
      id: 1,
      code: '1000',
      name: 'Cash',
      openingBalance: 5000.00,
      entries: [
        { date: '2024-02-15', reference: 'JE-001', description: 'Client payment', debit: 5000.00, credit: 0.00 },
        { date: '2024-02-20', reference: 'JE-002', description: 'Salary payment', debit: 0.00, credit: 8000.00 },
      ],
      closingBalance: 2000.00,
    },
    {
      id: 2,
      code: '1100',
      name: 'Accounts Receivable',
      openingBalance: 18500.00,
      entries: [
        { date: '2024-02-10', reference: 'INV-001', description: 'Sales invoice', debit: 5000.00, credit: 0.00 },
        { date: '2024-02-15', reference: 'JE-001', description: 'Client payment', debit: 0.00, credit: 5000.00 },
        { date: '2024-02-25', reference: 'INV-005', description: 'Sales invoice', debit: 3500.00, credit: 0.00 },
      ],
      closingBalance: 22000.00,
    },
    {
      id: 3,
      code: '4000',
      name: 'Sales Revenue',
      openingBalance: 0.00,
      entries: [
        { date: '2024-02-10', reference: 'INV-001', description: 'Sales invoice', debit: 0.00, credit: 5000.00 },
        { date: '2024-02-18', reference: 'INV-004', description: 'Sales invoice', debit: 0.00, credit: 4500.00 },
        { date: '2024-02-25', reference: 'INV-005', description: 'Sales invoice', debit: 0.00, credit: 3500.00 },
      ],
      closingBalance: -13000.00,
    },
    {
      id: 4,
      code: '6000',
      name: 'Salaries & Wages',
      openingBalance: 20000.00,
      entries: [
        { date: '2024-02-05', reference: 'PAYROLL-01', description: 'February payroll', debit: 8000.00, credit: 0.00 },
      ],
      closingBalance: 28000.00,
    },
    {
      id: 5,
      code: '6100',
      name: 'Rent Expense',
      openingBalance: 3200.00,
      entries: [
        { date: '2024-02-01', reference: 'RENT-02', description: 'February rent', debit: 4800.00, credit: 0.00 },
      ],
      closingBalance: 8000.00,
    },
  ];

  const toggleExpanded = (id: number) => {
    setExpandedAccounts(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">General Ledger</h1>
        <p className="text-gray-600 mt-1">View detailed transaction history for all accounts</p>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6 flex justify-between items-center bg-white p-6 rounded-lg shadow">
        <div className="flex space-x-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filter</span>
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* General Ledger Accounts */}
      <div className="space-y-4">
        {ledgerData.map((account) => (
          <div key={account.id} className="bg-white rounded-lg shadow">
            {/* Account Header */}
            <button
              onClick={() => toggleExpanded(account.id)}
              className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                {expandedAccounts.includes(account.id) ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
                <div className="text-left">
                  <p className="font-mono font-bold text-gray-900">{account.code}</p>
                  <p className="text-sm text-gray-600">{account.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Closing Balance</p>
                <p className={`font-bold text-lg ${account.closingBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  €{account.closingBalance.toFixed(2)}
                </p>
              </div>
            </button>

            {/* Account Entries (Expanded) */}
            {expandedAccounts.includes(account.id) && (
              <div className="border-t border-gray-200">
                {/* Account Summary */}
                <div className="px-6 py-4 bg-gray-50 grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Opening Balance</p>
                    <p className="font-semibold text-gray-900">€{account.openingBalance.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Total Debits</p>
                    <p className="font-semibold text-gray-900">
                      €{account.entries.reduce((sum, e) => sum + e.debit, 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Total Credits</p>
                    <p className="font-semibold text-gray-900">
                      €{account.entries.reduce((sum, e) => sum + e.credit, 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Closing Balance</p>
                    <p className="font-semibold text-gray-900">€{account.closingBalance.toFixed(2)}</p>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-t border-gray-200 bg-white">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reference
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Debit
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Credit
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {account.entries.map((entry, idx) => {
                        const runningBalance = account.openingBalance +
                          account.entries.slice(0, idx + 1).reduce((sum, e) => sum + e.debit - e.credit, 0);

                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.date}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                              {entry.reference}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {entry.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {entry.debit > 0 ? `€${entry.debit.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {entry.credit > 0 ? `€${entry.credit.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                              €{runningBalance.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Information */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> The general ledger provides a complete record of all transactions for each account.
          Each transaction is recorded with its date, reference number, and amounts debited or credited. The running balance
          shows the account balance after each transaction.
        </p>
      </div>
    </div>
  );
}
