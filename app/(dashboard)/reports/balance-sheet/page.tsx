'use client';

import { useState } from 'react';
import { BarChart3, Download, Filter, Calendar } from 'lucide-react';

export default function BalanceSheetPage() {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-02-29');

  const balanceSheetData = {
    assets: {
      current: [
        { name: 'Cash and Cash Equivalents', amount: 15000.00 },
        { name: 'Accounts Receivable', amount: 23500.00 },
        { name: 'Inventory', amount: 45000.00 },
      ],
      fixed: [
        { name: 'Fixed Assets (net)', amount: 229525.00 },
        { name: 'Intangible Assets', amount: 5000.00 },
      ],
    },
    liabilities: {
      current: [
        { name: 'Accounts Payable', amount: 18000.00 },
        { name: 'Short-term Loans', amount: 25000.00 },
        { name: 'Current Tax Payable', amount: 5200.00 },
      ],
      long_term: [
        { name: 'Long-term Debt', amount: 50000.00 },
        { name: 'Deferred Tax Liability', amount: 3000.00 },
      ],
    },
    equity: [
      { name: 'Common Stock', amount: 100000.00 },
      { name: 'Retained Earnings', amount: 117825.00 },
    ],
  };

  const totalCurrentAssets = balanceSheetData.assets.current.reduce((sum, item) => sum + item.amount, 0);
  const totalFixedAssets = balanceSheetData.assets.fixed.reduce((sum, item) => sum + item.amount, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const totalCurrentLiabilities = balanceSheetData.liabilities.current.reduce((sum, item) => sum + item.amount, 0);
  const totalLongTermLiabilities = balanceSheetData.liabilities.long_term.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

  const totalEquity = balanceSheetData.equity.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Balance Sheet</h1>
        <p className="text-gray-600 mt-1">View your company's financial position and assets</p>
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

      {/* Balance Sheet Report */}
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Balance Sheet</h2>
          <p className="text-gray-600">As of {endDate}</p>
        </div>

        {/* Assets Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">ASSETS</h3>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Current Assets</h4>
            <div className="ml-4 space-y-2">
              {balanceSheetData.assets.current.map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="text-gray-900 font-medium">€{item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="ml-4 flex justify-between border-t-2 border-gray-300 pt-2 mt-2 font-semibold">
              <span className="text-gray-800">Total Current Assets</span>
              <span className="text-gray-900">€{totalCurrentAssets.toFixed(2)}</span>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Fixed Assets</h4>
            <div className="ml-4 space-y-2">
              {balanceSheetData.assets.fixed.map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="text-gray-900 font-medium">€{item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="ml-4 flex justify-between border-t-2 border-gray-300 pt-2 mt-2 font-semibold">
              <span className="text-gray-800">Total Fixed Assets</span>
              <span className="text-gray-900">€{totalFixedAssets.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between border-t-4 border-gray-800 pt-3 font-bold text-lg bg-gray-50 p-3 rounded">
            <span className="text-gray-900">TOTAL ASSETS</span>
            <span className="text-gray-900">€{totalAssets.toFixed(2)}</span>
          </div>
        </div>

        {/* Liabilities and Equity Section */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">LIABILITIES & EQUITY</h3>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Current Liabilities</h4>
            <div className="ml-4 space-y-2">
              {balanceSheetData.liabilities.current.map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="text-gray-900 font-medium">€{item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="ml-4 flex justify-between border-t-2 border-gray-300 pt-2 mt-2 font-semibold">
              <span className="text-gray-800">Total Current Liabilities</span>
              <span className="text-gray-900">€{totalCurrentLiabilities.toFixed(2)}</span>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Long-term Liabilities</h4>
            <div className="ml-4 space-y-2">
              {balanceSheetData.liabilities.long_term.map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="text-gray-900 font-medium">€{item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="ml-4 flex justify-between border-t-2 border-gray-300 pt-2 mt-2 font-semibold">
              <span className="text-gray-800">Total Long-term Liabilities</span>
              <span className="text-gray-900">€{totalLongTermLiabilities.toFixed(2)}</span>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Shareholders' Equity</h4>
            <div className="ml-4 space-y-2">
              {balanceSheetData.equity.map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="text-gray-900 font-medium">€{item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="ml-4 flex justify-between border-t-2 border-gray-300 pt-2 mt-2 font-semibold">
              <span className="text-gray-800">Total Equity</span>
              <span className="text-gray-900">€{totalEquity.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between border-t-4 border-gray-800 pt-3 font-bold text-lg bg-gray-50 p-3 rounded">
            <span className="text-gray-900">TOTAL LIABILITIES & EQUITY</span>
            <span className="text-gray-900">€{totalLiabilitiesAndEquity.toFixed(2)}</span>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p className="text-center">Balance Check: {totalAssets.toFixed(2) === totalLiabilitiesAndEquity.toFixed(2) ? 'Balanced' : 'Not Balanced'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
