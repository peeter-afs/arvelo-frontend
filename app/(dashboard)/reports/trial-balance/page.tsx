'use client';

import { useState } from 'react';
import { Scale, Download, Filter, Calendar } from 'lucide-react';

export default function TrialBalancePage() {
  const [startDate, setStartDate] = useState('2024-02-29');

  // Mock trial balance data
  const accounts = [
    { code: '1000', name: 'Cash', debit: 15000.00, credit: 0.00 },
    { code: '1100', name: 'Accounts Receivable', debit: 23500.00, credit: 0.00 },
    { code: '1200', name: 'Inventory', debit: 45000.00, credit: 0.00 },
    { code: '1500', name: 'Fixed Assets', debit: 290000.00, credit: 0.00 },
    { code: '1550', name: 'Accumulated Depreciation', debit: 0.00, credit: 60500.00 },
    { code: '2000', name: 'Accounts Payable', debit: 0.00, credit: 18000.00 },
    { code: '2100', name: 'Short-term Loans', debit: 0.00, credit: 25000.00 },
    { code: '2200', name: 'Current Tax Payable', debit: 0.00, credit: 5200.00 },
    { code: '2500', name: 'Long-term Debt', debit: 0.00, credit: 50000.00 },
    { code: '2600', name: 'Deferred Tax Liability', debit: 0.00, credit: 3000.00 },
    { code: '3000', name: 'Common Stock', debit: 0.00, credit: 100000.00 },
    { code: '3100', name: 'Retained Earnings', debit: 0.00, credit: 117825.00 },
    { code: '4000', name: 'Sales Revenue', debit: 0.00, credit: 85000.00 },
    { code: '4100', name: 'Service Revenue', debit: 0.00, credit: 12500.00 },
    { code: '4200', name: 'Interest Income', debit: 0.00, credit: 500.00 },
    { code: '5000', name: 'Cost of Goods Sold', debit: 45000.00, credit: 0.00 },
    { code: '6000', name: 'Salaries & Wages', debit: 28000.00, credit: 0.00 },
    { code: '6100', name: 'Rent Expense', debit: 4800.00, credit: 0.00 },
    { code: '6200', name: 'Utilities', debit: 1200.00, credit: 0.00 },
    { code: '6300', name: 'Office Supplies', debit: 450.00, credit: 0.00 },
    { code: '6400', name: 'Depreciation Expense', debit: 2400.00, credit: 0.00 },
    { code: '6500', name: 'Marketing & Advertising', debit: 3500.00, credit: 0.00 },
    { code: '6600', name: 'Professional Fees', debit: 2000.00, credit: 0.00 },
    { code: '7000', name: 'Interest Expense', debit: 1500.00, credit: 0.00 },
    { code: '8000', name: 'Income Tax Expense', debit: 7860.00, credit: 0.00 },
  ];

  const totalDebits = accounts.reduce((sum, acc) => sum + acc.debit, 0);
  const totalCredits = accounts.reduce((sum, acc) => sum + acc.credit, 0);
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.01;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Trial Balance</h1>
        <p className="text-gray-600 mt-1">Verify that all debits and credits are balanced</p>
      </div>

      {/* Date Selector */}
      <div className="mb-6 flex justify-between items-center bg-white p-6 rounded-lg shadow">
        <div className="flex space-x-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              As of Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
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

      {/* Trial Balance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account Name
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Debit
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Credit
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {accounts.map((account) => (
              <tr key={account.code} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-900">
                  {account.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {account.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                  {account.debit > 0 ? `€${account.debit.toFixed(2)}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                  {account.credit > 0 ? `€${account.credit.toFixed(2)}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-4 border-gray-800 font-bold">
              <td colSpan={2} className="px-6 py-4 text-sm text-gray-900">
                TOTALS
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 text-right border-t-2 border-gray-400">
                €{totalDebits.toFixed(2)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 text-right border-t-2 border-gray-400">
                €{totalCredits.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Balance Status */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Debits</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">€{totalDebits.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Credits</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">€{totalCredits.toFixed(2)}</p>
        </div>
        <div className={`rounded-lg shadow p-6 ${isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-sm text-gray-600">Status</p>
          <p className={`text-2xl font-bold mt-2 ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
            {isBalanced ? 'Balanced' : `Difference: €${difference.toFixed(2)}`}
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> The trial balance shows all accounts with their debit and credit balances.
          The total debits should equal the total credits, indicating that all transactions have been properly recorded in the accounting system.
        </p>
      </div>
    </div>
  );
}
