'use client';

import { useEffect, useState } from 'react';
import { Settings, User, Building, CreditCard, Bell, Shield, Globe, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { getErrorMessage } from '@/lib/api/client';
import { businessRegistryApi, type BusinessRegistrySettings } from '@/lib/api/businessRegistry.api';

export default function SettingsPage() {
  const { user, tenant, role } = useAuthStore();
  const [activeTab, setActiveTab] = useState('company');
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [registrySettings, setRegistrySettings] = useState<BusinessRegistrySettings | null>(null);
  const [registryForm, setRegistryForm] = useState({
    enabled: false,
    provider_type: 'rik_soap_v6',
    username: '',
    password: '',
    service_url: 'https://ariregxmlv6.rik.ee/',
    search_path: 'ettevotjaRekvisiidid_v1',
    company_path: 'ettevotjaRekvisiidid_v1',
    test_path: '?wsdl',
  });
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registrySaving, setRegistrySaving] = useState(false);
  const [registryTesting, setRegistryTesting] = useState(false);
  const canManageRegistry = role === 'owner' || role === 'admin';

  const tabs = [
    { id: 'company', label: 'Company', icon: Building, category: 'organization' },
    { id: 'profile', label: 'Profile', icon: User, category: 'account' },
    { id: 'billing', label: 'Billing', icon: CreditCard, category: 'organization' },
    { id: 'notifications', label: 'Notifications', icon: Bell, category: 'preferences' },
    { id: 'security', label: 'Security', icon: Shield, category: 'account' },
    { id: 'localization', label: 'Localization', icon: Globe, category: 'preferences' },
    { id: 'business-registry', label: 'Business Registry', icon: Settings, category: 'organization' },
  ];

  useEffect(() => {
    if (activeTab !== 'business-registry' || !canManageRegistry) {
      return;
    }

    const load = async () => {
      setRegistryLoading(true);
      setSettingsError(null);
      try {
        const settings = await businessRegistryApi.getSettings();
        setRegistrySettings(settings);
        setRegistryForm({
          enabled: settings.enabled,
          provider_type: settings.provider_type || 'rik_soap_v6',
          username: '',
          password: '',
          service_url: settings.service_url || 'https://ariregxmlv6.rik.ee/',
          search_path: settings.search_path || 'ettevotjaRekvisiidid_v1',
          company_path: settings.company_path || 'ettevotjaRekvisiidid_v1',
          test_path: settings.test_path || '?wsdl',
        });
      } catch (error) {
        setSettingsError(getErrorMessage(error));
      } finally {
        setRegistryLoading(false);
      }
    };

    void load();
  }, [activeTab, canManageRegistry]);

  const saveRegistrySettings = async () => {
    setRegistrySaving(true);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      const updated = await businessRegistryApi.updateSettings({
        enabled: registryForm.enabled,
        provider_type: registryForm.provider_type,
        username: registryForm.username || undefined,
        password: registryForm.password || undefined,
        service_url: registryForm.service_url,
        search_path: registryForm.search_path,
        company_path: registryForm.company_path,
        test_path: registryForm.test_path,
      });
      setRegistrySettings(updated);
      setRegistryForm((current) => ({ ...current, username: '', password: '' }));
      setSettingsSuccess('Business Registry settings saved.');
    } catch (error) {
      setSettingsError(getErrorMessage(error));
    } finally {
      setRegistrySaving(false);
    }
  };

  const testRegistrySettings = async () => {
    setRegistryTesting(true);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      const result = await businessRegistryApi.testSettings();
      setSettingsSuccess(`Connection test ${result.status} at ${new Date(result.tested_at).toLocaleString()}.`);
      const refreshed = await businessRegistryApi.getSettings();
      setRegistrySettings(refreshed);
    } catch (error) {
      setSettingsError(getErrorMessage(error));
    } finally {
      setRegistryTesting(false);
    }
  };

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
            {settingsError && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {settingsError}
              </div>
            )}
            {settingsSuccess && (
              <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                {settingsSuccess}
              </div>
            )}

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

            {activeTab === 'business-registry' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Business Registry Integration</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Configure the backend-only Estonian Business Registry integration. Credentials remain masked after save.
                </p>

                {!canManageRegistry ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Only owner or admin users can manage Business Registry integration settings.
                  </div>
                ) : registryLoading ? (
                  <div className="text-sm text-slate-500">Loading integration settings…</div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
                        <input
                          type="checkbox"
                          checked={registryForm.enabled}
                          onChange={(event) => setRegistryForm((current) => ({ ...current, enabled: event.target.checked }))}
                          className="h-4 w-4"
                        />
                        <div>
                          <div className="text-sm font-medium text-slate-900">Integration enabled</div>
                          <div className="text-xs text-slate-500">Turns authenticated registry lookup on or off.</div>
                        </div>
                      </label>

                      <div className="rounded-lg border border-slate-200 p-4">
                        <div className="text-sm font-medium text-slate-900">Stored credentials</div>
                        <div className="mt-2 text-xs text-slate-500">
                          Username {registrySettings?.username_masked || 'not set'} · Password {registrySettings?.has_password ? 'stored' : 'not set'}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <Field
                        label="Provider type"
                        value={registryForm.provider_type}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, provider_type: value }))}
                      />
                      <Field
                        label="Service URL"
                        value={registryForm.service_url}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, service_url: value }))}
                      />
                      <Field
                        label="Search path"
                        value={registryForm.search_path}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, search_path: value }))}
                      />
                      <Field
                        label="Company path"
                        value={registryForm.company_path}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, company_path: value }))}
                      />
                      <Field
                        label="Test path"
                        value={registryForm.test_path}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, test_path: value }))}
                      />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <Field
                        label={`Username ${registrySettings?.username_masked ? `(current ${registrySettings.username_masked})` : ''}`}
                        value={registryForm.username}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, username: value }))}
                        placeholder="Leave blank to keep existing username"
                      />
                      <Field
                        label={`Password ${registrySettings?.has_password ? '(stored)' : ''}`}
                        value={registryForm.password}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, password: value }))}
                        placeholder="Leave blank to keep existing password"
                        type="password"
                      />
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <div className="font-medium text-slate-900">Status</div>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <div>Last test status: {registrySettings?.last_test_status || 'not run'}</div>
                        <div>Last test at: {registrySettings?.last_test_at ? new Date(registrySettings.last_test_at).toLocaleString() : 'n/a'}</div>
                        <div>Last error: {registrySettings?.last_error_message || 'none'}</div>
                        <div>Updated at: {registrySettings?.updated_at ? new Date(registrySettings.updated_at).toLocaleString() : 'n/a'}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={saveRegistrySettings}
                        disabled={registrySaving}
                        className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
                      >
                        {registrySaving ? 'Saving…' : 'Save Settings'}
                      </button>
                      <button
                        type="button"
                        onClick={testRegistrySettings}
                        disabled={registryTesting}
                        className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
                      >
                        {registryTesting ? 'Testing…' : 'Test Connection'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
        style={{ fontSize: '16px' }}
      />
    </div>
  );
}
