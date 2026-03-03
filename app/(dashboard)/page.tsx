'use client';

import { useAuthStore } from '@/lib/stores/auth.store';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  Activity
} from 'lucide-react';

export default function DashboardPage() {
  const { user, tenant } = useAuthStore();

  const stats = [
    {
      name: 'Total Revenue',
      value: '€12,450',
      change: '+12%',
      trend: 'up',
      icon: DollarSign,
      color: 'blue'
    },
    {
      name: 'Total Expenses',
      value: '€8,320',
      change: '+5%',
      trend: 'up',
      icon: TrendingUp,
      color: 'red'
    },
    {
      name: 'Net Income',
      value: '€4,130',
      change: '+23%',
      trend: 'up',
      icon: Activity,
      color: 'green'
    },
    {
      name: 'Active Invoices',
      value: '24',
      change: '4 pending',
      trend: 'neutral',
      icon: FileText,
      color: 'purple'
    },
  ];

  const recentTransactions = [
    { id: 1, date: '2024-02-28', description: 'Invoice #INV-001', amount: '€1,250', type: 'credit' },
    { id: 2, date: '2024-02-27', description: 'Office Supplies', amount: '€145', type: 'debit' },
    { id: 3, date: '2024-02-27', description: 'Client Payment', amount: '€2,300', type: 'credit' },
    { id: 4, date: '2024-02-26', description: 'Rent Payment', amount: '€800', type: 'debit' },
    { id: 5, date: '2024-02-25', description: 'Invoice #INV-002', amount: '€3,450', type: 'credit' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name || user?.email}
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with {tenant?.name || 'your business'} today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow p-6 border-l-4"
              style={{
                borderLeftColor: stat.color === 'blue' ? '#3B82F6' :
                                stat.color === 'red' ? '#EF4444' :
                                stat.color === 'green' ? '#10B981' :
                                '#8B5CF6'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                  <p className={`text-sm mt-1 ${
                    stat.trend === 'up' ? 'text-green-600' :
                    stat.trend === 'down' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${
                  stat.color === 'blue' ? 'bg-blue-100' :
                  stat.color === 'red' ? 'bg-red-100' :
                  stat.color === 'green' ? 'bg-green-100' :
                  'bg-purple-100'
                }`}>
                  <Icon className={`h-6 w-6 ${
                    stat.color === 'blue' ? 'text-blue-600' :
                    stat.color === 'red' ? 'text-red-600' :
                    stat.color === 'green' ? 'text-green-600' :
                    'text-purple-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'debit' && '-'}
                    {transaction.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-200">
          <a href="/dashboard/accounting/journal" className="text-sm text-blue-600 hover:text-blue-500">
            View all transactions →
          </a>
        </div>
      </div>
    </div>
  );
}