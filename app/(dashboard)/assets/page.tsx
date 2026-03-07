'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Download, Trash2, Edit2, MoreHorizontal, DollarSign, TrendingDown, Wallet } from 'lucide-react';

export default function AssetsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for fixed assets
  const assets = [
    { id: 1, name: 'Office Building', category: 'Real Estate', purchaseDate: '2020-03-15', cost: 150000.00, depreciation: 27000.00, netValue: 123000.00, status: 'active' },
    { id: 2, name: 'Company Vehicle', category: 'Equipment', purchaseDate: '2022-06-10', cost: 35000.00, depreciation: 7000.00, netValue: 28000.00, status: 'active' },
    { id: 3, name: 'Office Furniture', category: 'Fixtures', purchaseDate: '2021-01-20', cost: 12000.00, depreciation: 3600.00, netValue: 8400.00, status: 'active' },
    { id: 4, name: 'Computer Equipment', category: 'Equipment', purchaseDate: '2023-02-14', cost: 8500.00, depreciation: 1275.00, netValue: 7225.00, status: 'active' },
    { id: 5, name: 'Manufacturing Machinery', category: 'Machinery', purchaseDate: '2019-09-05', cost: 85000.00, depreciation: 22100.00, netValue: 62900.00, status: 'active' },
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Real Estate': return 'bg-violet-50 text-violet-700';
      case 'Equipment': return 'bg-blue-50 text-blue-700';
      case 'Fixtures': return 'bg-amber-50 text-amber-700';
      case 'Machinery': return 'bg-emerald-50 text-emerald-700';
      default: return 'bg-slate-50 text-slate-700';
    }
  };

  const getDepreciationPercent = (cost: number, depreciation: number) => {
    return (depreciation / cost) * 100;
  };

  const getDepreciationColor = (percent: number) => {
    if (percent < 30) return 'bg-emerald-500';
    if (percent < 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Fixed Assets</h1>
        <p className="text-sm text-slate-500 mt-1">Manage and track your company's fixed assets and depreciation</p>
      </div>

      {/* Actions Bar - Desktop */}
      <div className="hidden md:flex mb-6 justify-between items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets..."
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
            <span>Add Asset</span>
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
            placeholder="Search assets..."
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
      <div className="hidden md:block card overflow-hidden mb-6">
        <table className="min-w-full">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Asset Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Purchase Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Depreciation
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">
                Net Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {assets.map((asset) => {
              const depreciationPercent = getDepreciationPercent(asset.cost, asset.depreciation);
              const depreciationColor = getDepreciationColor(depreciationPercent);
              return (
                <tr key={asset.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {asset.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs font-medium rounded-md ${getCategoryColor(asset.category)}`}>
                      {asset.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {asset.purchaseDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-32">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>{depreciationPercent.toFixed(0)}%</span>
                        <span className="font-mono">€{asset.depreciation.toFixed(0)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${depreciationColor}`}
                          style={{ width: `${depreciationPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 text-right">
                    €{asset.netValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-2 mb-6">
        {assets.map((asset) => {
          const depreciationPercent = getDepreciationPercent(asset.cost, asset.depreciation);
          const depreciationColor = getDepreciationColor(depreciationPercent);
          return (
            <div key={asset.id} className="card p-4 active:bg-slate-50 transition-colors cursor-pointer relative">
              {/* Status dot */}
              <div className={`absolute top-4 right-4 h-2 w-2 rounded-full ${asset.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>

              {/* Header: asset name + category badge */}
              <div className="flex items-start justify-between mb-3 pr-6">
                <span className="text-base font-medium text-slate-900">{asset.name}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${getCategoryColor(asset.category)}`}>
                  {asset.category}
                </span>
              </div>

              {/* Body: purchase date + depreciation bar */}
              <div className="mb-3">
                <div className="text-xs text-slate-500 mb-2">Purchased: {asset.purchaseDate}</div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Depreciation: {depreciationPercent.toFixed(0)}%</span>
                  <span className="font-mono">€{asset.depreciation.toFixed(0)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${depreciationColor}`}
                    style={{ width: `${depreciationPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Footer: cost + net value */}
              <div className="flex items-center justify-between text-sm font-mono">
                <div>
                  <span className="text-slate-500">Cost </span>
                  <span className="text-slate-900">€{asset.cost.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">Net </span>
                  <span className="text-slate-900 font-medium">€{asset.netValue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-6">
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500">Total Asset Cost</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">€290,500.00</p>
        </div>
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500">Total Depreciation</p>
          <p className="text-xl md:text-2xl font-bold text-amber-600 mt-1">€60,975.00</p>
        </div>
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500">Net Book Value</p>
          <p className="text-xl md:text-2xl font-bold text-emerald-600 mt-1">€229,525.00</p>
        </div>
      </div>

      {/* Pagination - Desktop */}
      <div className="hidden md:flex justify-between items-center">
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
