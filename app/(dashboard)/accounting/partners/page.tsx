'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Download, Edit2, Trash2, Mail, Phone, MoreHorizontal, Users, TrendingUp, TrendingDown } from 'lucide-react';

export default function BusinessPartnersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Helper function to get avatar initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Mock data for business partners (customers and vendors)
  const partners = [
    {
      id: 1,
      name: 'Acme Corporation',
      type: 'customer',
      email: 'contact@acmecorp.com',
      phone: '+1-555-0101',
      city: 'New York',
      country: 'USA',
      balance: -1250.00,
      status: 'active',
      createdDate: '2023-01-15'
    },
    {
      id: 2,
      name: 'Tech Solutions Inc',
      type: 'vendor',
      email: 'info@techsolutions.com',
      phone: '+1-555-0102',
      city: 'San Francisco',
      country: 'USA',
      balance: 2300.00,
      status: 'active',
      createdDate: '2023-03-20'
    },
    {
      id: 3,
      name: 'Global Services Ltd',
      type: 'customer',
      email: 'hello@globalservices.com',
      phone: '+44-20-7946-0958',
      city: 'London',
      country: 'United Kingdom',
      balance: -890.00,
      status: 'active',
      createdDate: '2023-05-10'
    },
    {
      id: 4,
      name: 'European Supplies GmbH',
      type: 'vendor',
      email: 'sales@eurosupplies.de',
      phone: '+49-30-2593-0000',
      city: 'Berlin',
      country: 'Germany',
      balance: 4500.00,
      status: 'active',
      createdDate: '2023-02-28'
    },
    {
      id: 5,
      name: 'Nordic Consulting',
      type: 'customer',
      email: 'contact@nordicconsulting.se',
      phone: '+46-8-406-30-00',
      city: 'Stockholm',
      country: 'Sweden',
      balance: -3200.00,
      status: 'inactive',
      createdDate: '2022-12-05'
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'customer': return 'bg-blue-50 text-blue-700';
      case 'vendor': return 'bg-emerald-50 text-emerald-700';
      case 'both': return 'bg-violet-50 text-violet-700';
      default: return 'bg-slate-50 text-slate-700';
    }
  };

  const getBalanceDisplay = (balance: number) => {
    const absBalance = Math.abs(balance);
    if (balance < 0) {
      return {
        text: `€${absBalance.toFixed(2)} receivable`,
        color: 'text-emerald-600',
      };
    } else if (balance > 0) {
      return {
        text: `€${absBalance.toFixed(2)} payable`,
        color: 'text-amber-600',
      };
    }
    return {
      text: '€0.00',
      color: 'text-slate-600',
    };
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Business Partners</h1>
        <p className="text-sm text-slate-500 mt-1">Manage customers, vendors, and business relationships</p>
      </div>

      {/* Actions Bar - Desktop */}
      <div className="hidden md:flex mb-6 justify-between items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search partners..."
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
            <span>Add Partner</span>
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
            placeholder="Search partners..."
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
                Partner Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">
                Location
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
            {partners.map((partner) => {
              const balanceDisplay = getBalanceDisplay(partner.balance);
              return (
                <tr key={partner.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-xs font-medium">
                        {getInitials(partner.name)}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{partner.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs font-medium rounded-md ${getTypeColor(partner.type)}`}>
                      {partner.type === 'customer' ? 'Customer' : 'Vendor'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <div className="text-sm text-slate-600">{partner.email}</div>
                      <div className="text-xs text-slate-400">{partner.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {partner.city}, {partner.country}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${balanceDisplay.color}`}>
                    {balanceDisplay.text}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${partner.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      <span className="text-xs text-slate-600 capitalize">{partner.status}</span>
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-2 mb-6">
        {partners.map((partner) => {
          const balanceDisplay = getBalanceDisplay(partner.balance);
          return (
            <div key={partner.id} className="card p-4 active:bg-slate-50 transition-colors cursor-pointer">
              {/* Header: avatar + name + type badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-sm font-medium">
                    {getInitials(partner.name)}
                  </div>
                  <span className="text-base font-medium text-slate-900">{partner.name}</span>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${getTypeColor(partner.type)}`}>
                  {partner.type === 'customer' ? 'Customer' : 'Vendor'}
                </span>
              </div>

              {/* Body: contact info */}
              <div className="mb-3 space-y-1">
                <a href={`mailto:${partner.email}`} className="block text-sm text-slate-600 hover:text-[var(--primary)] active:text-[var(--primary-hover)]">
                  {partner.email}
                </a>
                <a href={`tel:${partner.phone}`} className="block text-xs text-slate-400 hover:text-[var(--primary)] active:text-[var(--primary-hover)]">
                  {partner.phone}
                </a>
                <div className="text-xs text-slate-400">
                  {partner.city}, {partner.country}
                </div>
              </div>

              {/* Footer: balance + status */}
              <div className="flex items-center justify-between">
                <div className={`text-sm font-medium ${balanceDisplay.color}`}>
                  {balanceDisplay.text}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${partner.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <span className="text-xs text-slate-600 capitalize">{partner.status}</span>
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
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500">Total Customers</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">3</p>
        </div>
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500">Total Vendors</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">2</p>
        </div>
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500">Total Receivables</p>
          <p className="text-xl md:text-2xl font-bold text-emerald-600 mt-1">€5,340.00</p>
        </div>
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500">Total Payables</p>
          <p className="text-xl md:text-2xl font-bold text-amber-600 mt-1">€6,800.00</p>
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
