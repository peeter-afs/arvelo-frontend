'use client';

import { useState } from 'react';
import { TrendingUp, Download, Filter, Calendar } from 'lucide-react';

export default function ProfitLossPage() {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-02-29');

  const plData = {
    revenue: [
      { name: 'Sales Revenue', amount: 85000.00 },
      { name: 'Service Revenue', amount: 12500.00 },
      { name: 'Interest Income', amount: 500.00 },
    ],
    costOfGoods: [
      { name: 'Cost of Goods Sold', amount: 45000.00 },
    ],
    operatingExpenses: [
      { name: 'Salaries & Wages', amount: 28000.00 },
      { name: 'Rent Expense', amount: 4800.00 },
      { name: 'Utilities', amount: 1200.00 },
      { name: 'Office Supplies', amount: 450.00 },
      { name: 'Depreciation Expense', amount: 2400.00 },
      { name: 'Marketing & Advertising', amount: 3500.00 },
      { name: 'Professional Fees', amount: 2000.00 },
    ],
    otherExpenses: [
      { name: 'Interest Expense', amount: 1500.00 },
    ],
  };

  const totalRevenue = plData.revenue.reduce((sum, item) => sum + item.amount, 0);
  const totalCOGS = plData.costOfGoods.reduce((sum, item) => sum + item.amount, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalOperatingExpenses = plData.operatingExpenses.reduce((sum, item) => sum + item.amount, 0);
  const operatingProfit = grossProfit - totalOperatingExpenses;
  const totalOtherExpenses = plData.otherExpenses.reduce((sum, item) => sum + item.amount, 0);
  const netIncomeBeforeTax = operatingProfit - totalOtherExpenses;
  const incomeTax = netIncomeBeforeTax * 0.20;
  const netIncome = netIncomeBeforeTax - incomeTax;

  const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profit & Loss Statement</h1>
        <p className="text-gray-600 mt-1">Review your company's income and expenses for the period</p>
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

      {/* P&L Report */}
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h2>
          <p className="text-gray-600">For the period {startDate} to {endDate}</p>
        </div>

        {/* Revenue Section */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">REVENUE</h3>
          <div className="ml-4 space-y-2">
            {plData.revenue.map((item, idx) => (
              <div key={idx} className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-700">{item.name}</span>
                <span className="text-gray-900 font-medium">€{item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="ml-4 flex justify-between border-t-2 border-gray-300 pt-2 mt-2 font-semibold">
            <span className="text-gray-800">Total Revenue</span>
            <span className="text-gray-900">€{totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        {/* Cost of Goods Sold */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">COST OF GOODS SOLD</h3>
          <div className="ml-4 space-y-2">
            {plData.costOfGoods.map((item, idx) => (
              <div key={idx} className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-700">{item.name}</span>
                <span className="text-gray-900 font-medium">€{item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="ml-4 flex justify-between border-t-2 border-gray-300 pt-2 mt-2 font-semibold">
            <span className="text-gray-800">Total COGS</span>
            <span className="text-gray-900">€{totalCOGS.toFixed(2)}</span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="mb-8 flex justify-between border-t-4 border-b-2 border-gray-400 pt-3 pb-3 font-bold text-lg bg-blue-50 p-3 rounded">
          <span className="text-gray-900">GROSS PROFIT</span>
          <span className="text-blue-700">€{grossProfit.toFixed(2)}</span>
        </div>

        {/* Operating Expenses */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">OPERATING EXPENSES</h3>
          <div className="ml-4 space-y-2">
            {plData.operatingExpenses.map((item, idx) => (
              <div key={idx} className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-700">{item.name}</span>
                <span className="text-gray-900 font-medium">€{item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="ml-4 flex justify-between border-t-2 border-gray-300 pt-2 mt-2 font-semibold">
            <span className="text-gray-800">Total Operating Expenses</span>
            <span className="text-gray-900">€{totalOperatingExpenses.toFixed(2)}</span>
          </div>
        </div>

        {/* Operating Income */}
        <div className="mb-8 flex justify-between border-t-4 border-b-2 border-gray-400 pt-3 pb-3 font-bold text-lg bg-blue-50 p-3 rounded">
          <span className="text-gray-900">OPERATING INCOME</span>
          <span className="text-blue-700">€{operatingProfit.toFixed(2)}</span>
        </div>

        {/* Other Expenses */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">OTHER EXPENSES</h3>
          <div className="ml-4 space-y-2">
            {plData.otherExpenses.map((item, idx) => (
              <div key={idx} className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-700">{item.name}</span>
                <span className="text-gray-900 font-medium">€{item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="ml-4 flex justify-between border-t-2 border-gray-300 pt-2 mt-2 font-semibold">
            <span className="text-gray-800">Total Other Expenses</span>
            <span className="text-gray-900">€{totalOtherExpenses.toFixed(2)}</span>
          </div>
        </div>

        {/* Income Before Tax */}
        <div className="mb-8 flex justify-between border-t-4 border-b-2 border-gray-400 pt-3 pb-3 font-bold text-lg bg-blue-50 p-3 rounded">
          <span className="text-gray-900">INCOME BEFORE TAX</span>
          <span className="text-blue-700">€{netIncomeBeforeTax.toFixed(2)}</span>
        </div>

        {/* Income Tax */}
        <div className="mb-8">
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-700">Income Tax (20%)</span>
            <span className="text-gray-900 font-medium">€{incomeTax.toFixed(2)}</span>
          </div>
        </div>

        {/* Net Income */}
        <div className="mb-8 flex justify-between border-t-4 border-gray-800 pt-3 font-bold text-lg bg-green-50 p-3 rounded">
          <span className="text-gray-900">NET INCOME</span>
          <span className={netIncome >= 0 ? 'text-green-700' : 'text-red-700'}>€{netIncome.toFixed(2)}</span>
        </div>

        {/* Key Metrics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded p-4">
            <p className="text-sm text-gray-600">Profit Margin</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{profitMargin.toFixed(2)}%</p>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <p className="text-sm text-gray-600">Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">€{totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">€{(totalCOGS + totalOperatingExpenses + totalOtherExpenses + incomeTax).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
