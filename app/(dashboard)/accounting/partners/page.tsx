'use client';

import { useState } from 'react';
import { Users, Plus, Search, Filter, Download, Edit2, Trash2, Mail, Phone } from 'lucide-react';

export default function BusinessPartnersPage() {
  const [searchQuery, setSearchQuery] = useState('');

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
      case 'customer': return 'bg-blue-100 text-blue-800';
      case 'vendor': return 'bg-green-100 text-green-800';
      case 'both': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance < 0) return 'text-green-600';
    if (balance > 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Business Partners</h1>
        <p className="text-gray-600 mt-1">Manage customers, vendors, and business relationships</p>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search partners..."
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
          <span>Add Partner</span>
        </button>
      </div>

      {/* Partners Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Partner Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance
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
            {partners.map((partner) => (
              <tr key={partner.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {partner.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(partner.type)}`}>
                    {partner.type === 'customer' ? 'Customer' : 'Vendor'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex flex-col">
                    <a href={`mailto:${partner.email}`} className="text-blue-600 hover:text-blue-900 flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {partner.email}
                    </a>
                    <a href={`tel:${partner.phone}`} className="text-blue-600 hover:text-blue-900 flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {partner.phone}
                    </a>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {partner.city}, {partner.country}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${getBalanceColor(partner.balance)}`}>
                  €{Math.abs(partner.balance).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(partner.status)}`}>
                    {partner.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Statistics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Customers</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">3</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Vendors</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">2</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Receivables</p>
          <p className="text-2xl font-bold text-green-600 mt-2">€5,340.00</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Payables</p>
          <p className="text-2xl font-bold text-red-600 mt-2">€6,800.00</p>
        </div>
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
