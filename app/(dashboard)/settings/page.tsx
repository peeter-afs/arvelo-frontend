'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Settings, User, Building, CreditCard, Bell, Shield, Globe, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { getErrorMessage } from '@/lib/api/client';
import { businessRegistryApi, type BusinessRegistrySettings } from '@/lib/api/businessRegistry.api';
import { billingApi, type BillingInvoice, type BillingPlan, type BillingSubscription, type BillingEntitlement, type BillingSettings, type BillingReminderHistoryItem, type BillingReminderOperationItem, type BillingAnnualBalanceHistoryItem, type BillingAnnualBalanceMismatchItem, type BillingAnnualBalanceNotificationItem, type BillingAnnualBalanceReport, type BillingMessagePreview } from '@/lib/api/billing.api';

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
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingAction, setBillingAction] = useState<string | null>(null);
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [billingSubscription, setBillingSubscription] = useState<BillingSubscription | null>(null);
  const [billingInvoices, setBillingInvoices] = useState<BillingInvoice[]>([]);
  const [billingReminderOperations, setBillingReminderOperations] = useState<BillingReminderOperationItem[]>([]);
  const [billingReminderHistory, setBillingReminderHistory] = useState<BillingReminderHistoryItem[]>([]);
  const [billingAnnualBalanceHistory, setBillingAnnualBalanceHistory] = useState<BillingAnnualBalanceHistoryItem[]>([]);
  const [billingAnnualBalanceMismatches, setBillingAnnualBalanceMismatches] = useState<BillingAnnualBalanceMismatchItem[]>([]);
  const [billingAnnualBalanceNotifications, setBillingAnnualBalanceNotifications] = useState<BillingAnnualBalanceNotificationItem[]>([]);
  const [billingMismatchFilter, setBillingMismatchFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [billingEntitlement, setBillingEntitlement] = useState<BillingEntitlement | null>(null);
  const [billingSettingsState, setBillingSettingsState] = useState<BillingSettings | null>(null);
  const [billingMessagePreview, setBillingMessagePreview] = useState<BillingMessagePreview | null>(null);
  const [mismatchResolutionNotes, setMismatchResolutionNotes] = useState<Record<string, string>>({});
  const [annualBalanceReport, setAnnualBalanceReport] = useState<BillingAnnualBalanceReport | null>(null);
  const [billingForm, setBillingForm] = useState({
    bill_to_name: '',
    bill_to_registry_code: '',
    bill_to_vat_number: '',
    bill_to_address: '',
    bill_to_email: '',
    invoice_due_days: '14',
    reminders_enabled: true,
    reminder_weekday: '2',
    reminder_frequency_days: '7',
    reminder_start_after_days: '7',
    reminder_template_first: 'Hello {{bill_to_name}}, this is a gentle reminder that invoice #{{invoice_no}} for {{total}} was due on {{due_date}}.',
    reminder_template_second: 'Reminder {{reminder_index}}: invoice #{{invoice_no}} for {{total}} is still unpaid. The due date was {{due_date}}.',
    reminder_template_third: 'Final reminder: invoice #{{invoice_no}} for {{total}} remains overdue since {{due_date}}. Please arrange payment as soon as possible.',
    annual_balance_template: 'Hello {{bill_to_name}},\n\nWe hereby confirm that as of {{as_of_date}}, {{balance_statement}}.\nIf this is not correct, please contact us.',
    preview_reminder_index: '1',
    annual_balance_reference_date: new Date().toISOString().slice(0, 10),
    annual_balance_report_start_date: new Date(new Date().getUTCFullYear(), 0, 1).toISOString().slice(0, 10),
    annual_balance_report_end_date: new Date().toISOString().slice(0, 10),
    plan_id: '',
    status: 'active',
    billing_day: '1',
    unit_price: '49',
    quantity: '1',
    discount_percent: '0',
    vat_rate: '22',
    currency: 'EUR',
    current_period_start: new Date().toISOString().slice(0, 10),
    current_period_end: new Date().toISOString().slice(0, 10),
    next_invoice_date: new Date().toISOString().slice(0, 10),
    cancel_at_period_end: false,
  });
  const canManageRegistry = role === 'owner' || role === 'admin';
  const canManageBilling = role === 'owner' || role === 'admin';

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
    if (activeTab !== 'billing' || !canManageBilling) {
      return;
    }

    const load = async () => {
      setBillingLoading(true);
      setSettingsError(null);
      try {
        const overview = await billingApi.getOverview();
        setBillingPlans(overview.plans);
        setBillingSubscription(overview.subscription);
        setBillingInvoices(overview.invoices);
        setBillingReminderOperations(overview.reminder_operations || []);
        setBillingReminderHistory(overview.reminder_history || []);
        setBillingAnnualBalanceHistory(overview.annual_balance_history || []);
        setBillingAnnualBalanceMismatches(overview.annual_balance_mismatches || []);
        setBillingAnnualBalanceNotifications(overview.annual_balance_notifications || []);
        setBillingEntitlement(overview.entitlement);
        setBillingSettingsState(overview.settings);
        setBillingForm({
          bill_to_name: overview.settings?.bill_to_name || tenant?.name || '',
          bill_to_registry_code: overview.settings?.bill_to_registry_code || '',
          bill_to_vat_number: overview.settings?.bill_to_vat_number || '',
          bill_to_address: overview.settings?.bill_to_address || '',
          bill_to_email: overview.settings?.bill_to_email || tenant?.email || '',
          invoice_due_days: String(overview.settings?.invoice_due_days || 14),
          reminders_enabled: overview.settings?.reminders_enabled ?? true,
          reminder_weekday: String(overview.settings?.reminder_weekday || 2),
          reminder_frequency_days: String(overview.settings?.reminder_frequency_days || 7),
          reminder_start_after_days: String(overview.settings?.reminder_start_after_days || 7),
          reminder_template_first: overview.settings?.reminder_template_first || 'Hello {{bill_to_name}}, this is a gentle reminder that invoice #{{invoice_no}} for {{total}} was due on {{due_date}}.',
          reminder_template_second: overview.settings?.reminder_template_second || 'Reminder {{reminder_index}}: invoice #{{invoice_no}} for {{total}} is still unpaid. The due date was {{due_date}}.',
          reminder_template_third: overview.settings?.reminder_template_third || 'Final reminder: invoice #{{invoice_no}} for {{total}} remains overdue since {{due_date}}. Please arrange payment as soon as possible.',
          annual_balance_template: overview.settings?.annual_balance_template || 'Hello {{bill_to_name}},\n\nWe hereby confirm that as of {{as_of_date}}, {{balance_statement}}.\nIf this is not correct, please contact us.',
          preview_reminder_index: '1',
          annual_balance_reference_date: new Date().toISOString().slice(0, 10),
          annual_balance_report_start_date: new Date(new Date().getUTCFullYear(), 0, 1).toISOString().slice(0, 10),
          annual_balance_report_end_date: new Date().toISOString().slice(0, 10),
          plan_id: overview.subscription?.plan_id || overview.plans[0]?.id || '',
          status: overview.subscription?.status || 'active',
          billing_day: String(overview.subscription?.billing_day || 1),
          unit_price: String(overview.subscription?.unit_price || 49),
          quantity: String(overview.subscription?.quantity || 1),
          discount_percent: String(overview.subscription?.discount_percent || 0),
          vat_rate: String(overview.subscription?.vat_rate ?? overview.settings?.vat_rate ?? 22),
          currency: overview.subscription?.currency || overview.settings?.currency || tenant?.base_currency || 'EUR',
          current_period_start: overview.subscription?.current_period_start || new Date().toISOString().slice(0, 10),
          current_period_end: overview.subscription?.current_period_end || new Date().toISOString().slice(0, 10),
          next_invoice_date: overview.subscription?.next_invoice_date || new Date().toISOString().slice(0, 10),
          cancel_at_period_end: Boolean(overview.subscription?.cancel_at_period_end),
        });
      } catch (error) {
        setSettingsError(getErrorMessage(error));
      } finally {
        setBillingLoading(false);
      }
    };

    void load();
  }, [activeTab, canManageBilling, tenant?.base_currency]);

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

  const reloadBilling = async () => {
    const overview = await billingApi.getOverview();
    setBillingPlans(overview.plans);
    setBillingSubscription(overview.subscription);
    setBillingInvoices(overview.invoices);
    setBillingReminderOperations(overview.reminder_operations || []);
    setBillingReminderHistory(overview.reminder_history || []);
    setBillingAnnualBalanceHistory(overview.annual_balance_history || []);
    setBillingAnnualBalanceMismatches(overview.annual_balance_mismatches || []);
    setBillingAnnualBalanceNotifications(overview.annual_balance_notifications || []);
    setBillingEntitlement(overview.entitlement);
    setBillingSettingsState(overview.settings);
  };

  const saveBillingSubscription = async () => {
    setBillingSaving(true);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      const result = await billingApi.upsertSubscription({
        plan_id: billingForm.plan_id,
        status: billingForm.status,
        billing_day: Number(billingForm.billing_day || 1),
        unit_price: Number(billingForm.unit_price || 0),
        quantity: Number(billingForm.quantity || 1),
        discount_percent: Number(billingForm.discount_percent || 0),
        vat_rate: billingForm.vat_rate === '' ? null : Number(billingForm.vat_rate),
        currency: billingForm.currency,
        current_period_start: billingForm.current_period_start,
        current_period_end: billingForm.current_period_end,
        next_invoice_date: billingForm.next_invoice_date,
        cancel_at_period_end: billingForm.cancel_at_period_end,
      });
      setBillingSubscription(result.subscription);
      await reloadBilling();
      setSettingsSuccess('Billing subscription saved.');
    } catch (error) {
      setSettingsError(getErrorMessage(error));
    } finally {
      setBillingSaving(false);
    }
  };

  const currentBillingSettingsDraft = {
    bill_to_name: billingForm.bill_to_name,
    bill_to_email: billingForm.bill_to_email || null,
    bill_to_registry_code: billingForm.bill_to_registry_code || null,
    bill_to_vat_number: billingForm.bill_to_vat_number || null,
    bill_to_address: billingForm.bill_to_address || null,
    invoice_due_days: Number(billingForm.invoice_due_days || 14),
    reminders_enabled: billingForm.reminders_enabled,
    reminder_weekday: Number(billingForm.reminder_weekday || 2),
    reminder_frequency_days: Number(billingForm.reminder_frequency_days || 7),
    reminder_start_after_days: Number(billingForm.reminder_start_after_days || 7),
    reminder_template_first: billingForm.reminder_template_first || null,
    reminder_template_second: billingForm.reminder_template_second || null,
    reminder_template_third: billingForm.reminder_template_third || null,
    annual_balance_template: billingForm.annual_balance_template || null,
  };

  const visibleBillingMismatches = billingAnnualBalanceMismatches.filter((event) => {
    const isResolved = Boolean(event.payload?.resolved_at);
    if (billingMismatchFilter === 'open') return !isResolved;
    if (billingMismatchFilter === 'resolved') return isResolved;
    return true;
  });

  const exportAnnualBalanceReportCsv = () => {
    if (!annualBalanceReport) return;
    const header = [
      'sent_at',
      'reference_date',
      'recipient',
      'balance_direction',
      'balance_amount',
      'open_invoice_count',
      'response_decision',
      'responded_at',
      'response_note',
      'resolved_at',
      'resolution_note',
    ];
    const rows = annualBalanceReport.rows.map((row) => [
      row.sent_at || '',
      row.reference_date || '',
      row.recipient || '',
      row.balance_direction || '',
      row.balance_amount ?? '',
      row.open_invoice_count ?? '',
      row.response_decision || '',
      row.responded_at || '',
      row.response_note || '',
      row.resolved_at || '',
      row.resolution_note || '',
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `annual-balance-report-${annualBalanceReport.period.start_date}-${annualBalanceReport.period.end_date}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const runBillingAction = async (key: string, fn: () => Promise<void>) => {
    setBillingAction(key);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      await fn();
    } catch (error) {
      setSettingsError(getErrorMessage(error));
    } finally {
      setBillingAction(null);
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
                <p className="text-sm text-slate-500 mb-6">Manage the recurring SaaS billing subscription, invoices, and entitlement state.</p>

                {!canManageBilling ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Only owner or admin users can manage billing.
                  </div>
                ) : billingLoading ? (
                  <div className="text-sm text-slate-500">Loading billing configuration…</div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Access State</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">{billingEntitlement?.access_state || 'active'}</div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Invoice Next No</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">{billingSettingsState?.invoice_next_no ?? 1}</div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Open Billing Invoices</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">
                          {billingInvoices.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'void').length}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-5">
                      <h3 className="text-sm font-semibold text-slate-900">Annual balance confirmation</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Send a manual year-end or as-of-date balance confirmation. The backend calculates whether the counterparty owes you, you owe them, or the balance is settled.
                      </p>
                      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
                        <BillingField label="Annual balance text">
                          <textarea
                            value={billingForm.annual_balance_template}
                            onChange={(event) => setBillingForm((current) => ({ ...current, annual_balance_template: event.target.value }))}
                            className="min-h-[180px] w-full rounded-lg border border-slate-200 px-4 py-3"
                            style={{ fontSize: '16px' }}
                          />
                        </BillingField>
                        <div className="space-y-4">
                          <BillingField label="Balance reference date">
                            <input
                              type="date"
                              value={billingForm.annual_balance_reference_date}
                              onChange={(event) => setBillingForm((current) => ({ ...current, annual_balance_reference_date: event.target.value }))}
                              className="w-full h-11 rounded-lg border border-slate-200 px-4"
                              style={{ fontSize: '16px' }}
                            />
                          </BillingField>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                            Placeholders: <code>{'{{bill_to_name}}'}</code>, <code>{'{{as_of_date}}'}</code>, <code>{'{{balance_amount}}'}</code>, <code>{'{{balance_direction}}'}</code>, <code>{'{{balance_statement}}'}</code>, <code>{'{{open_invoice_count}}'}</code>, <code>{'{{tenant_name}}'}</code>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void runBillingAction('preview-annual-balance', async () => {
                            const preview = await billingApi.previewAnnualBalance({
                              reference_date: billingForm.annual_balance_reference_date,
                              settings_override: currentBillingSettingsDraft,
                            });
                            setBillingMessagePreview(preview);
                            setSettingsSuccess('Annual balance preview loaded.');
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'preview-annual-balance' ? 'Loading…' : 'Preview Annual Balance'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void runBillingAction('send-annual-balance', async () => {
                            const result = await billingApi.sendAnnualBalance({
                              reference_date: billingForm.annual_balance_reference_date,
                            });
                            await reloadBilling();
                            setSettingsSuccess(result.sent ? `Annual balance confirmation sent to ${result.recipient}.` : `No message sent${result.skipped_reason ? `: ${result.skipped_reason}` : '.'}`);
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'send-annual-balance' ? 'Sending…' : 'Send Annual Balance Confirmation'}
                        </button>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        The sent email includes one-click links for <strong>Confirm balance</strong> and <strong>Report mismatch</strong>. Those clicks are recorded in annual balance history.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-5">
                      <h3 className="text-sm font-semibold text-slate-900">Reminder automation</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Run the general reminder cron every weekday. Each tenant decides which weekday is valid, how often reminders may repeat, and how many overdue days must pass first.
                      </p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <BillingField label="Bill-to name">
                          <input value={billingForm.bill_to_name} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_name: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Bill-to email">
                          <input value={billingForm.bill_to_email} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_email: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Bill-to registry code">
                          <input value={billingForm.bill_to_registry_code} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_registry_code: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Bill-to VAT number">
                          <input value={billingForm.bill_to_vat_number} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_vat_number: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Bill-to address">
                          <input value={billingForm.bill_to_address} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_address: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Invoice due days">
                          <input value={billingForm.invoice_due_days} onChange={(event) => setBillingForm((current) => ({ ...current, invoice_due_days: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Reminder weekday">
                          <select value={billingForm.reminder_weekday} onChange={(event) => setBillingForm((current) => ({ ...current, reminder_weekday: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }}>
                            <option value="1">Monday</option>
                            <option value="2">Tuesday</option>
                            <option value="3">Wednesday</option>
                            <option value="4">Thursday</option>
                            <option value="5">Friday</option>
                          </select>
                        </BillingField>
                        <BillingField label="Reminder frequency days">
                          <input value={billingForm.reminder_frequency_days} onChange={(event) => setBillingForm((current) => ({ ...current, reminder_frequency_days: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Start after overdue days">
                          <input value={billingForm.reminder_start_after_days} onChange={(event) => setBillingForm((current) => ({ ...current, reminder_start_after_days: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <label className="flex items-center gap-3 pt-8">
                          <input type="checkbox" checked={billingForm.reminders_enabled} onChange={(event) => setBillingForm((current) => ({ ...current, reminders_enabled: event.target.checked }))} />
                          <span className="text-sm text-slate-700">Enable reminders</span>
                        </label>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-3">
                        <BillingField label="First reminder text">
                          <textarea
                            value={billingForm.reminder_template_first}
                            onChange={(event) => setBillingForm((current) => ({ ...current, reminder_template_first: event.target.value }))}
                            className="min-h-[140px] w-full rounded-lg border border-slate-200 px-4 py-3"
                            style={{ fontSize: '16px' }}
                          />
                        </BillingField>
                        <BillingField label="Second reminder text">
                          <textarea
                            value={billingForm.reminder_template_second}
                            onChange={(event) => setBillingForm((current) => ({ ...current, reminder_template_second: event.target.value }))}
                            className="min-h-[140px] w-full rounded-lg border border-slate-200 px-4 py-3"
                            style={{ fontSize: '16px' }}
                          />
                        </BillingField>
                        <BillingField label="Third reminder text">
                          <textarea
                            value={billingForm.reminder_template_third}
                            onChange={(event) => setBillingForm((current) => ({ ...current, reminder_template_third: event.target.value }))}
                            className="min-h-[140px] w-full rounded-lg border border-slate-200 px-4 py-3"
                            style={{ fontSize: '16px' }}
                          />
                        </BillingField>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        Available placeholders: <code>{'{{invoice_no}}'}</code>, <code>{'{{total}}'}</code>, <code>{'{{due_date}}'}</code>, <code>{'{{bill_to_name}}'}</code>, <code>{'{{reminder_index}}'}</code>
                      </p>
                      <div className="mt-4 flex flex-wrap items-end gap-3">
                        <BillingField label="Preview reminder stage">
                          <select
                            value={billingForm.preview_reminder_index}
                            onChange={(event) => setBillingForm((current) => ({ ...current, preview_reminder_index: event.target.value }))}
                            className="h-11 rounded-lg border border-slate-200 px-4"
                            style={{ fontSize: '16px' }}
                          >
                            <option value="1">First</option>
                            <option value="2">Second</option>
                            <option value="3">Third</option>
                          </select>
                        </BillingField>
                        <button
                          type="button"
                          onClick={() => void runBillingAction('preview-reminder', async () => {
                            const preview = await billingApi.previewReminder({
                              reminder_index: Number(billingForm.preview_reminder_index || 1),
                              settings_override: currentBillingSettingsDraft,
                            });
                            setBillingMessagePreview(preview);
                            setSettingsSuccess(`Reminder preview loaded for invoice #${preview.invoice?.invoice_no}.`);
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'preview-reminder' ? 'Loading…' : 'Preview Reminder'}
                        </button>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void runBillingAction('settings', async () => {
                            await billingApi.updateSettings({
                              bill_to_name: billingForm.bill_to_name,
                              bill_to_email: billingForm.bill_to_email || null,
                              bill_to_registry_code: billingForm.bill_to_registry_code || null,
                              bill_to_vat_number: billingForm.bill_to_vat_number || null,
                              bill_to_address: billingForm.bill_to_address || null,
                              invoice_due_days: Number(billingForm.invoice_due_days || 14),
                              reminders_enabled: billingForm.reminders_enabled,
                              reminder_weekday: Number(billingForm.reminder_weekday || 2),
                              reminder_frequency_days: Number(billingForm.reminder_frequency_days || 7),
                              reminder_start_after_days: Number(billingForm.reminder_start_after_days || 7),
                              reminder_template_first: billingForm.reminder_template_first || null,
                              reminder_template_second: billingForm.reminder_template_second || null,
                              reminder_template_third: billingForm.reminder_template_third || null,
                              annual_balance_template: billingForm.annual_balance_template || null,
                            });
                            await reloadBilling();
                            setSettingsSuccess('Billing settings saved.');
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'settings' ? 'Saving…' : 'Save Reminder Settings'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void runBillingAction('reminders', async () => {
                            const result = await billingApi.sendReminders({ force: true });
                            await reloadBilling();
                            setSettingsSuccess(result.sent_count > 0 ? `Sent ${result.sent_count} reminder(s).` : `No reminders sent${result.skipped_reason ? `: ${result.skipped_reason}` : '.'}`);
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'reminders' ? 'Sending…' : 'Send Reminders Now'}
                        </button>
                      </div>
                      <p className="mt-4 text-xs text-slate-500">
                        Cron automation endpoint: `POST /api/billing/jobs/send-reminders-all` with `x-cron-secret`. Run it every weekday; tenant weekday and frequency settings are applied in the backend.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Subscription</h3>
                          <p className="mt-1 text-sm text-slate-500">One recurring subscription per tenant in the current MVP.</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <BillingField label="Plan">
                          <select
                            value={billingForm.plan_id}
                            onChange={(event) => setBillingForm((current) => ({ ...current, plan_id: event.target.value }))}
                            className="w-full h-11 px-4 border border-slate-200 rounded-lg"
                            style={{ fontSize: '16px' }}
                          >
                            <option value="">Select plan</option>
                            {billingPlans.map((plan) => (
                              <option key={plan.id} value={plan.id}>{plan.code} - {plan.name}</option>
                            ))}
                          </select>
                        </BillingField>
                        <BillingField label="Status">
                          <select
                            value={billingForm.status}
                            onChange={(event) => setBillingForm((current) => ({ ...current, status: event.target.value }))}
                            className="w-full h-11 px-4 border border-slate-200 rounded-lg"
                            style={{ fontSize: '16px' }}
                          >
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="canceled">Canceled</option>
                          </select>
                        </BillingField>
                        <BillingField label="Billing day">
                          <input value={billingForm.billing_day} onChange={(event) => setBillingForm((current) => ({ ...current, billing_day: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Currency">
                          <input value={billingForm.currency} onChange={(event) => setBillingForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Unit price">
                          <input value={billingForm.unit_price} onChange={(event) => setBillingForm((current) => ({ ...current, unit_price: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Quantity">
                          <input value={billingForm.quantity} onChange={(event) => setBillingForm((current) => ({ ...current, quantity: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Discount %">
                          <input value={billingForm.discount_percent} onChange={(event) => setBillingForm((current) => ({ ...current, discount_percent: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="VAT rate">
                          <input value={billingForm.vat_rate} onChange={(event) => setBillingForm((current) => ({ ...current, vat_rate: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Current period start">
                          <input type="date" value={billingForm.current_period_start} onChange={(event) => setBillingForm((current) => ({ ...current, current_period_start: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Current period end">
                          <input type="date" value={billingForm.current_period_end} onChange={(event) => setBillingForm((current) => ({ ...current, current_period_end: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label="Next invoice date">
                          <input type="date" value={billingForm.next_invoice_date} onChange={(event) => setBillingForm((current) => ({ ...current, next_invoice_date: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <label className="flex items-center gap-3 pt-8">
                          <input type="checkbox" checked={billingForm.cancel_at_period_end} onChange={(event) => setBillingForm((current) => ({ ...current, cancel_at_period_end: event.target.checked }))} />
                          <span className="text-sm text-slate-700">Cancel at period end</span>
                        </label>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={saveBillingSubscription}
                          disabled={billingSaving}
                          className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
                        >
                          {billingSaving ? 'Saving…' : 'Save Subscription'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void runBillingAction('generate', async () => {
                            const result = await billingApi.generateInvoices();
                            await reloadBilling();
                            setSettingsSuccess(`Generated ${result.created_count} billing invoice(s).`);
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'generate' ? 'Generating…' : 'Generate Invoices'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void runBillingAction('entitlements', async () => {
                            const result = await billingApi.recomputeEntitlements();
                            await reloadBilling();
                            setSettingsSuccess(`Entitlements recomputed: ${result.entitlement.access_state}.`);
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'entitlements' ? 'Recomputing…' : 'Recompute Entitlements'}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <h3 className="text-sm font-semibold text-slate-900">Message preview</h3>
                      </div>
                      {!billingMessagePreview ? (
                        <div className="p-5 text-sm text-slate-500">Load a reminder or annual balance preview to inspect the rendered text before sending.</div>
                      ) : (
                        <div className="space-y-4 p-5">
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Subject</div>
                            <div className="mt-1 text-sm font-medium text-slate-900">{billingMessagePreview.subject}</div>
                          </div>
                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Type</div>
                              <div className="mt-1 text-sm text-slate-900">{billingMessagePreview.kind}</div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Reference</div>
                              <div className="mt-1 text-sm text-slate-900">{billingMessagePreview.invoice ? `Invoice #${billingMessagePreview.invoice.invoice_no}` : billingMessagePreview.reference_date || '-'}</div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Balance / Stage</div>
                              <div className="mt-1 text-sm text-slate-900">
                                {billingMessagePreview.balance?.balance_statement || (billingMessagePreview.reminder_index ? `Reminder ${billingMessagePreview.reminder_index}` : '-')}
                              </div>
                            </div>
                          </div>
                          <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">{billingMessagePreview.text}</pre>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Annual balance reporting</h3>
                            <p className="mt-1 text-xs text-slate-600">Report, review, and export annual balance confirmations and responses for a selected period.</p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <input
                              type="date"
                              value={billingForm.annual_balance_report_start_date}
                              onChange={(event) => setBillingForm((current) => ({ ...current, annual_balance_report_start_date: event.target.value }))}
                              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                              style={{ fontSize: '16px' }}
                            />
                            <input
                              type="date"
                              value={billingForm.annual_balance_report_end_date}
                              onChange={(event) => setBillingForm((current) => ({ ...current, annual_balance_report_end_date: event.target.value }))}
                              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                              style={{ fontSize: '16px' }}
                            />
                            <button
                              type="button"
                              onClick={() => void runBillingAction('annual-balance-report', async () => {
                                const report = await billingApi.getAnnualBalanceReport({
                                  start_date: billingForm.annual_balance_report_start_date,
                                  end_date: billingForm.annual_balance_report_end_date,
                                });
                                setAnnualBalanceReport(report);
                                setSettingsSuccess('Annual balance report loaded.');
                              })}
                              disabled={billingAction !== null}
                              className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                            >
                              {billingAction === 'annual-balance-report' ? 'Loading…' : 'Load Report'}
                            </button>
                            <button
                              type="button"
                              onClick={exportAnnualBalanceReportCsv}
                              disabled={!annualBalanceReport}
                              className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                            >
                              Export CSV
                            </button>
                          </div>
                        </div>
                      </div>
                      {!annualBalanceReport ? (
                        <div className="p-5 text-sm text-slate-500">Load a period to view annual balance report data.</div>
                      ) : (
                        <div className="space-y-4 p-5">
                          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                            <ReportStat label="Sent" value={annualBalanceReport.summary.sent_count} />
                            <ReportStat label="Responded" value={annualBalanceReport.summary.responded_count} />
                            <ReportStat label="Confirmed" value={annualBalanceReport.summary.confirmed_count} />
                            <ReportStat label="Mismatches" value={annualBalanceReport.summary.mismatch_count} />
                            <ReportStat label="Open mismatches" value={annualBalanceReport.summary.open_mismatch_count} />
                            <ReportStat label="Resolved" value={annualBalanceReport.summary.resolved_mismatch_count} />
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                              <thead className="bg-slate-50">
                                <tr>
                                  {['Sent', 'Reference', 'Recipient', 'Balance', 'Response', 'Resolved'].map((label) => (
                                    <th key={label} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                                      {label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {annualBalanceReport.rows.map((row) => (
                                  <tr key={row.id}>
                                    <td className="px-4 py-3 text-slate-700">{new Date(row.sent_at).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-slate-700">{row.reference_date || '-'}</td>
                                    <td className="px-4 py-3 text-slate-700">{row.recipient || '-'}</td>
                                    <td className="px-4 py-3 text-slate-700">
                                      {row.balance_direction === 'you_owe_us'
                                        ? `They owe ${Math.abs(Number(row.balance_amount || 0)).toFixed(2)} EUR`
                                        : row.balance_direction === 'we_owe_you'
                                          ? `We owe ${Math.abs(Number(row.balance_amount || 0)).toFixed(2)} EUR`
                                          : 'Settled'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">
                                      {row.response_decision ? (
                                        <div>
                                          <div>{row.response_decision}</div>
                                          {row.response_note && <div className="mt-1 text-xs text-slate-500">{row.response_note}</div>}
                                        </div>
                                      ) : 'No response'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">
                                      <div className="space-y-1">
                                        <div>
                                          {row.resolved_at
                                            ? `${new Date(row.resolved_at).toLocaleString()}${row.resolution_note ? ` - ${row.resolution_note}` : ''}`
                                            : '-'}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          Notification: {row.notification_status || 'not recorded'}
                                          {row.notified_internal_emails?.length ? ` · ${row.notified_internal_emails.join(', ')}` : ''}
                                          {row.notification_error_message ? ` · ${row.notification_error_message}` : ''}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <h3 className="text-sm font-semibold text-slate-900">Reminder operations</h3>
                        <p className="mt-1 text-xs text-slate-600">Operational queue for overdue billing invoices, reminder eligibility, and follow-up timing.</p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {billingReminderOperations.length === 0 ? (
                          <div className="p-5 text-sm text-slate-500">No open billing invoices eligible for reminder operations.</div>
                        ) : (
                          billingReminderOperations.map((invoice) => (
                            <div key={invoice.id} className="flex flex-col gap-3 p-5 xl:flex-row xl:items-center xl:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Invoice #{invoice.invoice_no} · {Number(invoice.total || 0).toFixed(2)} {invoice.currency}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Due {invoice.due_date} · overdue {invoice.overdue_days} day(s) · sent {invoice.reminder_sent_count} reminder(s)
                                </div>
                                <div className="text-xs text-slate-500">
                                  Recipient: {invoice.recipient || 'missing'} · next eligible: {invoice.next_eligible_reminder_date}
                                </div>
                              </div>
                              <div className="flex flex-col items-start gap-2 xl:items-end">
                                <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  invoice.eligible_now
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {invoice.eligible_now
                                    ? 'Eligible now'
                                    : invoice.blocking_reason === 'disabled'
                                      ? 'Reminders disabled'
                                      : invoice.blocking_reason === 'not_overdue_enough'
                                        ? 'Too early'
                                        : invoice.blocking_reason === 'frequency_not_reached'
                                          ? 'Waiting frequency'
                                          : invoice.blocking_reason === 'weekday_mismatch'
                                            ? 'Wrong weekday'
                                            : 'Not eligible'}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void runBillingAction(`send-invoice-reminder-${invoice.id}`, async () => {
                                    const result = await billingApi.sendInvoiceReminder(invoice.id, { force: true });
                                    await reloadBilling();
                                    setSettingsSuccess(
                                      result.sent
                                        ? `Reminder sent for invoice #${invoice.invoice_no}.`
                                        : result.skipped_reason === 'no_recipient'
                                          ? 'Reminder skipped because no billing recipient email is configured.'
                                          : result.skipped_reason === 'disabled'
                                            ? 'Reminder skipped because reminders are disabled.'
                                            : result.skipped_reason === 'not_overdue_enough'
                                              ? 'Reminder skipped because the invoice is not overdue long enough yet.'
                                              : result.skipped_reason === 'frequency_not_reached'
                                                ? 'Reminder skipped because the reminder frequency is not reached yet.'
                                                : result.skipped_reason === 'weekday_mismatch'
                                                  ? 'Reminder skipped because today does not match the configured reminder weekday.'
                                                  : 'Reminder was not sent.'
                                    );
                                  })}
                                  disabled={billingAction !== null}
                                  className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                                >
                                  {billingAction === `send-invoice-reminder-${invoice.id}` ? 'Sending…' : 'Send reminder'}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <h3 className="text-sm font-semibold text-slate-900">Billing invoices</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {billingInvoices.length === 0 ? (
                          <div className="p-5 text-sm text-slate-500">No billing invoices generated yet.</div>
                        ) : (
                          billingInvoices.map((invoice) => (
                            <div key={invoice.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-900">#{invoice.invoice_no} · {invoice.status}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {invoice.issue_date} to {invoice.period_end} · due {invoice.due_date}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="font-mono text-sm text-slate-900">{Number(invoice.total || 0).toFixed(2)} {invoice.currency}</div>
                                {invoice.status !== 'paid' && invoice.status !== 'void' && (
                                  <button
                                    type="button"
                                    onClick={() => void runBillingAction(`pay-${invoice.id}`, async () => {
                                      await billingApi.markInvoicePaid(invoice.id);
                                      await reloadBilling();
                                      setSettingsSuccess(`Billing invoice #${invoice.invoice_no} marked paid.`);
                                    })}
                                    disabled={billingAction !== null}
                                    className="h-9 px-4 border border-emerald-200 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 font-medium transition-colors disabled:opacity-50"
                                  >
                                    {billingAction === `pay-${invoice.id}` ? 'Saving…' : 'Mark Paid'}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <h3 className="text-sm font-semibold text-slate-900">Internal notification status</h3>
                        <p className="mt-1 text-xs text-slate-600">Latest internal alerts sent when customers report annual balance mismatches.</p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {billingAnnualBalanceNotifications.length === 0 ? (
                          <div className="p-5 text-sm text-slate-500">No internal annual balance notifications recorded.</div>
                        ) : (
                          billingAnnualBalanceNotifications.map((event) => (
                            <div key={event.id} className="flex flex-col gap-2 p-5 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {event.payload?.status === 'sent'
                                    ? 'Internal notification sent'
                                    : event.payload?.status === 'failed'
                                      ? 'Internal notification failed'
                                      : 'Internal notification skipped'}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  As of {event.payload?.reference_date || 'unknown'} · customer {event.payload?.recipient || 'unknown'}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {event.payload?.notified_internal_emails?.length
                                    ? event.payload.notified_internal_emails.join(', ')
                                    : 'No internal recipients'}
                                  {event.payload?.error_message ? ` · ${event.payload.error_message}` : ''}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500">
                                {new Date(event.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="border-b border-slate-200 bg-amber-50 px-5 py-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Annual balance mismatch inbox</h3>
                            <p className="mt-1 text-xs text-slate-600">All reported balance issues are collected here so they can be reviewed from one place.</p>
                          </div>
                          <div className="flex gap-2">
                            {(['open', 'resolved', 'all'] as const).map((filterKey) => (
                              <button
                                key={filterKey}
                                type="button"
                                onClick={() => setBillingMismatchFilter(filterKey)}
                                className={`h-9 rounded-lg px-3 text-xs font-medium transition-colors ${
                                  billingMismatchFilter === filterKey
                                    ? 'bg-slate-900 text-white'
                                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {filterKey === 'open' ? 'Open' : filterKey === 'resolved' ? 'Resolved' : 'All'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {visibleBillingMismatches.length === 0 ? (
                          <div className="p-5 text-sm text-slate-500">
                            {billingMismatchFilter === 'resolved'
                              ? 'No resolved balance mismatches.'
                              : billingMismatchFilter === 'all'
                                ? 'No balance mismatches reported.'
                                : 'No open balance mismatches.'}
                          </div>
                        ) : (
                          visibleBillingMismatches.map((event) => (
                            <div key={event.id} className="space-y-3 p-5">
                              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <div className="text-sm font-medium text-slate-900">
                                    {event.sent_payload?.balance_direction === 'we_owe_you'
                                      ? `Mismatch on balance where we owe ${Math.abs(Number(event.sent_payload?.balance_amount || 0)).toFixed(2)} EUR`
                                      : event.sent_payload?.balance_direction === 'you_owe_us'
                                        ? `Mismatch on balance where they owe ${Math.abs(Number(event.sent_payload?.balance_amount || 0)).toFixed(2)} EUR`
                                        : 'Mismatch on settled balance confirmation'}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    As of {event.payload?.reference_date || event.sent_payload?.reference_date || 'unknown'} · {event.payload?.recipient || event.sent_payload?.recipient || 'no recipient'}
                                  </div>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {event.payload?.resolved_at
                                    ? `Resolved ${new Date(event.payload.resolved_at).toLocaleString()}`
                                    : new Date(event.created_at).toLocaleString()}
                                </div>
                              </div>
                              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                                {event.payload?.note || 'No mismatch note provided.'}
                              </div>
                              {event.payload?.resolved_at ? (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                                  Resolved{event.payload?.resolution_note ? `: ${event.payload.resolution_note}` : '.'}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                  <input
                                    value={mismatchResolutionNotes[event.id] || ''}
                                    onChange={(e) => setMismatchResolutionNotes((current) => ({ ...current, [event.id]: e.target.value }))}
                                    placeholder="Optional resolution note"
                                    className="h-11 flex-1 rounded-lg border border-slate-200 px-4"
                                    style={{ fontSize: '16px' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void runBillingAction(`resolve-mismatch-${event.id}`, async () => {
                                      await billingApi.resolveAnnualBalanceMismatch(event.id, {
                                        resolution_note: mismatchResolutionNotes[event.id] || undefined,
                                      });
                                      setMismatchResolutionNotes((current) => ({ ...current, [event.id]: '' }));
                                      await reloadBilling();
                                      setSettingsSuccess('Mismatch marked resolved.');
                                    })}
                                    disabled={billingAction !== null}
                                    className="h-11 px-5 rounded-lg border border-emerald-200 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                                  >
                                    {billingAction === `resolve-mismatch-${event.id}` ? 'Saving…' : 'Mark Resolved'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <h3 className="text-sm font-semibold text-slate-900">Reminder history</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {billingReminderHistory.length === 0 ? (
                          <div className="p-5 text-sm text-slate-500">No reminders sent yet.</div>
                        ) : (
                          billingReminderHistory.map((event) => (
                            <div key={event.id} className="flex flex-col gap-2 p-5 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  Reminder {event.payload?.reminder_index || '?'} · {event.payload?.template_kind || 'custom'}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Invoice #{event.payload?.invoice_no || 'unknown'} · due {event.payload?.due_date || 'unknown'} · {event.payload?.recipient || 'no recipient'}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500">
                                {new Date(event.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <h3 className="text-sm font-semibold text-slate-900">Annual balance history</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {billingAnnualBalanceHistory.length === 0 ? (
                          <div className="p-5 text-sm text-slate-500">No annual balance confirmations sent yet.</div>
                        ) : (
                          billingAnnualBalanceHistory.map((event) => (
                            <div key={event.id} className="flex flex-col gap-2 p-5 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {event.type === 'annual_balance_confirmation_response'
                                    ? event.payload?.decision === 'confirm'
                                      ? 'Customer confirmed balance'
                                      : 'Customer reported mismatch'
                                    : event.payload?.balance_direction === 'we_owe_you'
                                      ? `We owe them ${Math.abs(Number(event.payload?.balance_amount || 0)).toFixed(2)} EUR`
                                      : event.payload?.balance_direction === 'you_owe_us'
                                        ? `They owe us ${Math.abs(Number(event.payload?.balance_amount || 0)).toFixed(2)} EUR`
                                        : 'Balance settled'}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {event.type === 'annual_balance_confirmation_response'
                                    ? `As of ${event.payload?.reference_date || 'unknown'} · ${event.payload?.recipient || 'no recipient'}`
                                    : `As of ${event.payload?.reference_date || 'unknown'} · ${event.payload?.recipient || 'no recipient'} · ${event.payload?.open_invoice_count || 0} open invoice(s)`}
                                </div>
                                {event.type === 'annual_balance_confirmation_response' && event.payload?.decision === 'mismatch' && event.payload?.note && (
                                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                    {event.payload.note}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">
                                {new Date(event.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
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

function BillingField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700 mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function ReportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
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
