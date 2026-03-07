'use client';

import { useState } from 'react';
import { Settings, User, Building, CreditCard, Bell, Shield, Globe, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function SettingsPage() {
  const { user, tenant } = useAuthStore();
  const [activeTab, setActiveTab] = useState('company');

  const tabs = [
    { id: 'company', label: 'Company', icon: Building, category: 'organization' },
    { id: 'profile', label: 'Profile', icon: User, category: 'account' },
    { id: 'billing', label: 'Billing', icon: CreditCard, category: 'organization' },
    { id: 'notifications', label: 'Notifications', icon: Bell, category: 'preferences' },
    { id: 'security', label: 'Security', icon: Shield, category: 'account' },
    { id: 'localization', label: 'Localization', icon: Globe, category: 'preferences' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account and company preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Sidebar Navigation - Desktop */}
        <div className="hidden md:block w-56">
          <nav className="space-y-1">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isNewCategory = index === 0 || tabs[index - 1].category !== tab.category;
              return (
                <div key={tab.id}>
                  {isNewCategory && index > 0 && (
                    <div className="h-px bg-slate-200 my-3" />
                  )}
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[var(--primary)]/5 text-[var(--primary)] font-medium'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`mr-3 h-[18px] w-[18px] ${
                      activeTab === tab.id ? 'text-[var(--primary)]' : 'text-slate-400'
                    }`} />
                    {tab.label}
                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Mobile Tab Selector */}
        <div className="md:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
            style={{ fontSize: '16px' }}
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="card rounded-xl p-6 md:p-8">
            {activeTab === 'company' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Company Information</h2>
                <p className="text-sm text-slate-500 mb-6">Update your company details and tax information</p>
                <form className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Company Name
                    </label>
                    <input
                      type="text"
                      defaultValue={tenant?.name}
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Tax ID
                    </label>
                    <input
                      type="text"
                      placeholder="Enter tax ID"
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Address
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Enter company address"
                      className="w-full min-h-[100px] px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all resize-y"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Base Currency
                    </label>
                    <select
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
                      style={{ fontSize: '16px' }}
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Profile Information</h2>
                <p className="text-sm text-slate-500 mb-6">Manage your personal account details</p>
                <form className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.name}
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue={user?.email}
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors"
                  >
                    Update Profile
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'billing' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Billing & Subscription</h2>
                <p className="text-sm text-slate-500 mb-6">Manage your subscription and payment methods</p>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-6 text-center">
                  <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">Billing features coming soon</p>
                  <p className="text-xs text-slate-500 mt-1">We're working on payment integration</p>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Notification Preferences</h2>
                <p className="text-sm text-slate-500 mb-6">Choose how you want to receive updates</p>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-700">Email Notifications</h3>
                    {[
                      { id: 'invoices', label: 'New invoices', checked: true },
                      { id: 'payments', label: 'Payments received', checked: true },
                      { id: 'weekly', label: 'Weekly summary reports', checked: false },
                      { id: 'system', label: 'System updates and maintenance', checked: true },
                    ].map(item => (
                      <label key={item.id} className="flex items-center p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-[var(--primary)] rounded border-slate-300 focus:ring-[var(--primary)] focus:ring-offset-0"
                          defaultChecked={item.checked}
                        />
                        <span className="ml-3 text-sm text-slate-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Security Settings</h2>
                <p className="text-sm text-slate-500 mb-6">Keep your account secure</p>
                <div className="space-y-6">
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <h3 className="font-medium text-slate-900 mb-2">Change Password</h3>
                    <p className="text-sm text-slate-500 mb-3">Update your password regularly to keep your account secure</p>
                    <button className="h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors">
                      Update Password
                    </button>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <h3 className="font-medium text-slate-900 mb-2">Two-Factor Authentication</h3>
                    <p className="text-sm text-slate-500 mb-3">Add an extra layer of security to your account</p>
                    <button className="h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'localization' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Localization</h2>
                <p className="text-sm text-slate-500 mb-6">Customize language and regional settings</p>
                <form className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Language
                    </label>
                    <select
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
                      style={{ fontSize: '16px' }}
                    >
                      <option value="en">English</option>
                      <option value="et">Estonian</option>
                      <option value="fi">Finnish</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Timezone
                    </label>
                    <select
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
                      style={{ fontSize: '16px' }}
                    >
                      <option value="Europe/Tallinn">Europe/Tallinn</option>
                      <option value="Europe/Helsinki">Europe/Helsinki</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Date Format
                    </label>
                    <select
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
                      style={{ fontSize: '16px' }}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors"
                  >
                    Save Preferences
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}