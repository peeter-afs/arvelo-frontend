'use client';

import { useEffect, useState, useTransition, type ReactNode } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { localeCookieName, locales, type Locale } from '@/i18n/config';
import Link from 'next/link';
import { Settings, User, Building, CreditCard, Bell, Shield, Globe, ChevronRight, Database, RotateCcw, Sparkles, Upload, Users, UserPlus, Trash2, Loader2, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { getErrorMessage } from '@/lib/api/client';
import { accountingApi, type AccountOption, type AccountingSettings, type SystemRoleMapping } from '@/lib/api/accounting.api';
import { SystemRolesPanel } from '@/components/accounting/SystemRolesPanel';
import { ConfirmResetDialog } from '@/components/ui/ConfirmResetDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { bankingApi, type BankAccountRecord } from '@/lib/api/banking.api';
import { businessRegistryApi, type BusinessRegistrySettings } from '@/lib/api/businessRegistry.api';
import { billingApi, type BillingInvoice, type BillingPlan, type BillingSubscription, type BillingEntitlement, type BillingSettings, type BillingReminderHistoryItem, type BillingReminderOperationItem, type BillingAnnualBalanceHistoryItem, type BillingAnnualBalanceMismatchItem, type BillingAnnualBalanceNotificationItem, type BillingAnnualBalanceReport, type BillingMessagePreview } from '@/lib/api/billing.api';
import { getIsoCurrentYearStart, getIsoToday } from '@/lib/utils/date';
import AiInvoiceSettingsTab from '@/components/invoices/AiInvoiceSettingsTab';
import { tenantsApi, type TenantMember } from '@/lib/api/tenants.api';
import type { UserRole } from '@/lib/types/auth.types';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const { user, tenant, role } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;
  const [localizationLanguage, setLocalizationLanguage] = useState<Locale>(currentLocale);
  const [, startLocaleTransition] = useTransition();
  const initialTab = searchParams.get('tab') || 'company';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Keep the localization select in sync if the active locale changes elsewhere.
  useEffect(() => {
    setLocalizationLanguage(currentLocale);
  }, [currentLocale]);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    startLocaleTransition(() => {
      if (locales.includes(localizationLanguage)) {
        localStorage.setItem(localeCookieName, localizationLanguage);
        document.cookie = `${localeCookieName}=${localizationLanguage}; path=/; max-age=31536000; samesite=lax`;
        router.replace(pathname || '/');
        router.refresh();
      }
    });
  };
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
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyAction, setCompanyAction] = useState<string | null>(null);
  const [ledgerAccounts, setLedgerAccounts] = useState<AccountOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRecord[]>([]);
  const [editingBankAccountId, setEditingBankAccountId] = useState<string | null>(null);
  const [bankAccountForm, setBankAccountForm] = useState({
    name: '',
    bank_name: '',
    iban: '',
    bic: '',
    currency: tenant?.base_currency || 'EUR',
    account_id: '',
    is_active: true,
  });
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
    annual_balance_reference_date: '',
    annual_balance_report_start_date: '',
    annual_balance_report_end_date: '',
    plan_id: '',
    status: 'active',
    billing_day: '1',
    unit_price: '49',
    quantity: '1',
    discount_percent: '0',
    vat_rate: '22',
    currency: 'EUR',
    current_period_start: '',
    current_period_end: '',
    next_invoice_date: '',
    cancel_at_period_end: false,
  });
  const [missingReceiptForm, setMissingReceiptForm] = useState({
    is_enabled: false,
    responsible_email: '',
    frequency_days: '7',
    start_after_days: '0',
    weekday: '',
    max_reminders: '5',
    email_subject: 'Missing receipt reminder: {{supplier_name}} — {{amount}} {{currency}}',
    email_body: 'Hello,\n\nA bank payment of {{amount}} {{currency}} on {{tx_date}} to {{supplier_name}} (ref: {{reference}}) has no matching purchase invoice or receipt on file.\n\nPlease upload the receipt or forward the invoice so it can be recorded.\n\n→ {{draft_link}}\n\nThis is reminder #{{reminder_index}}.\n\nThank you.',
  });
  const canManageRegistry = role === 'owner' || role === 'admin';
  const canManageBilling = role === 'owner' || role === 'admin';
  const canManageData = role === 'owner' || role === 'admin';

  useEffect(() => {
    setBillingForm((current) => ({
      ...current,
      annual_balance_reference_date: current.annual_balance_reference_date || getIsoToday(),
      annual_balance_report_start_date: current.annual_balance_report_start_date || getIsoCurrentYearStart(),
      annual_balance_report_end_date: current.annual_balance_report_end_date || getIsoToday(),
      current_period_start: current.current_period_start || getIsoToday(),
      current_period_end: current.current_period_end || getIsoToday(),
      next_invoice_date: current.next_invoice_date || getIsoToday(),
    }));
  }, []);

  // Data Management tab state
  const [dataManagementLoading, setDataManagementLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<{ is_imported: boolean; can_reset?: boolean; reset_reference_date?: string | null; reset_window_months?: number; committed_batches: any[] } | null>(null);
  const [resetBackups, setResetBackups] = useState<any[]>([]);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState<string | null>(null);
  const [dataManagementAction, setDataManagementAction] = useState<string | null>(null);
  const [resetDeleteAccounts, setResetDeleteAccounts] = useState(false);
  const [resetDeletePartners, setResetDeletePartners] = useState(false);
  const [accountingSettings, setAccountingSettings] = useState<AccountingSettings | null>(null);
  const [roleAccounts, setRoleAccounts] = useState<AccountOption[]>([]);
  const [rolesSaving, setRolesSaving] = useState(false);
  const [creatingDefaults, setCreatingDefaults] = useState(false);

  const tabs = [
    { id: 'company', label: t('company'), icon: Building, category: 'organization' },
    { id: 'profile', label: t('profile'), icon: User, category: 'account' },
    { id: 'billing', label: t('billing'), icon: CreditCard, category: 'organization' },
    { id: 'notifications', label: t('notifications'), icon: Bell, category: 'preferences' },
    { id: 'security', label: t('security'), icon: Shield, category: 'account' },
    { id: 'localization', label: t('localization'), icon: Globe, category: 'preferences' },
    { id: 'business-registry', label: t('businessRegistry'), icon: Settings, category: 'organization' },
    { id: 'data-management', label: t('dataManagement'), icon: Database, category: 'organization' },
    ...(canManageBilling ? [{ id: 'ai', label: t('ai'), icon: Sparkles, category: 'organization' as const }] : []),
    ...(canManageData ? [{ id: 'team', label: t('team'), icon: Users, category: 'organization' as const }] : []),
  ];

  useEffect(() => {
    if (activeTab !== 'company') {
      return;
    }

    const load = async () => {
      setCompanyLoading(true);
      setSettingsError(null);
      try {
        const [accounts, bankAccountItems] = await Promise.all([
          accountingApi.getAccounts(),
          bankingApi.listBankAccounts(),
        ]);
        setLedgerAccounts(accounts);
        setBankAccounts(bankAccountItems);
        setBankAccountForm((current) => ({
          ...current,
          currency: current.currency || tenant?.base_currency || 'EUR',
          account_id: current.account_id || accounts.find((item) => item.is_active)?.id || '',
        }));
      } catch (error) {
        setSettingsError(getErrorMessage(error));
      } finally {
        setCompanyLoading(false);
      }
    };

    void load();
  }, [activeTab, tenant?.base_currency]);

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
        await loadMissingReceiptSettings();
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

  useEffect(() => {
    if (activeTab !== 'data-management' || !canManageData) {
      return;
    }

    const load = async () => {
      setDataManagementLoading(true);
      setSettingsError(null);
      try {
        const [status, backups, settings, accounts] = await Promise.all([
          accountingApi.getOpeningBalanceImportStatus(),
          accountingApi.listResetBackups().catch(() => []),
          accountingApi.getAccountingSettings().catch(() => null),
          accountingApi.getAccounts().catch(() => []),
        ]);
        setImportStatus(status);
        setResetBackups(backups);
        setAccountingSettings(settings);
        setRoleAccounts(accounts);
      } catch (error) {
        setSettingsError(getErrorMessage(error));
      } finally {
        setDataManagementLoading(false);
      }
    };

    void load();
  }, [activeTab, canManageData]);

  const reloadRoleData = async () => {
    const [settings, accounts] = await Promise.all([
      accountingApi.getAccountingSettings().catch(() => null),
      accountingApi.getAccounts().catch(() => []),
    ]);
    setAccountingSettings(settings);
    setRoleAccounts(accounts);
  };

  const handleSaveSystemRoles = async (mapping: SystemRoleMapping) => {
    setRolesSaving(true);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      const result = await accountingApi.updateAccountingSettings(mapping);
      setAccountingSettings(result.settings);
      setSettingsSuccess(
        result.warnings?.length
          ? t('systemRolesSavedWithWarnings', { warnings: result.warnings.join('; ') })
          : t('systemRolesSaved')
      );
    } catch (error) {
      setSettingsError(getErrorMessage(error));
    } finally {
      setRolesSaving(false);
    }
  };

  const handleCreateDefaultChart = async () => {
    setCreatingDefaults(true);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      const result = await accountingApi.createDefaultChart();
      setSettingsSuccess(t('defaultChartCreated', { created: result.created.length, reused: result.reused.length }));
      await reloadRoleData();
    } catch (error) {
      setSettingsError(getErrorMessage(error));
    } finally {
      setCreatingDefaults(false);
    }
  };

  const handleResetOpeningBalances = async () => {
    setDataManagementAction('resetting');
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      const result = await accountingApi.resetOpeningBalances('Reset all', {
        deleteAccounts: resetDeleteAccounts,
        deletePartners: resetDeletePartners,
      });
      setSettingsSuccess(t('openingBalancesResetSuccess', {
        count: result.reversed_count,
        entries: result.deleted_entries,
        invoices: result.deleted_invoices,
        accounts: result.deleted_accounts,
        partners: result.deleted_partners,
      }));
      setResetDeleteAccounts(false);
      setResetDeletePartners(false);
      const [status, backups] = await Promise.all([
        accountingApi.getOpeningBalanceImportStatus(),
        accountingApi.listResetBackups().catch(() => []),
      ]);
      setImportStatus(status);
      setResetBackups(backups);
    } catch (error) {
      setSettingsError(getErrorMessage(error));
    } finally {
      setDataManagementAction(null);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    setDataManagementAction('restoring');
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      const result = await accountingApi.restoreOpeningBalances(backupId);
      setSettingsSuccess(t('openingBalancesRestoredSuccess', { count: result.restored_batch_count }));
      const [status, backups] = await Promise.all([
        accountingApi.getOpeningBalanceImportStatus(),
        accountingApi.listResetBackups().catch(() => []),
      ]);
      setImportStatus(status);
      setResetBackups(backups);
      setRestoreDialogOpen(null);
    } catch (error) {
      setSettingsError(getErrorMessage(error));
      setRestoreDialogOpen(null);
    } finally {
      setDataManagementAction(null);
    }
  };

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
      setSettingsSuccess(t('businessRegistrySettingsSaved'));
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
      setSettingsSuccess(t('connectionTestStatus', { status: result.status, testedAt: new Date(result.tested_at).toLocaleString() }));
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

  const loadMissingReceiptSettings = async () => {
    try {
      const data = await bankingApi.getMissingReceiptSettings();
      if (data) {
        setMissingReceiptForm({
          is_enabled: data.is_enabled ?? false,
          responsible_email: data.responsible_email || '',
          frequency_days: String(data.frequency_days ?? 7),
          start_after_days: String(data.start_after_days ?? 0),
          weekday: data.weekday ? String(data.weekday) : '',
          max_reminders: data.max_reminders ? String(data.max_reminders) : '',
          email_subject: data.email_subject || '',
          email_body: data.email_body || '',
        });
      }
    } catch { /* settings not yet created, use defaults */ }
  };

  const saveMissingReceiptSettings = async () => {
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      await bankingApi.updateMissingReceiptSettings({
        is_enabled: missingReceiptForm.is_enabled,
        responsible_email: missingReceiptForm.responsible_email || null,
        frequency_days: Number(missingReceiptForm.frequency_days || 7),
        start_after_days: Number(missingReceiptForm.start_after_days || 0),
        weekday: missingReceiptForm.weekday ? Number(missingReceiptForm.weekday) : null,
        max_reminders: missingReceiptForm.max_reminders ? Number(missingReceiptForm.max_reminders) : null,
        email_subject: missingReceiptForm.email_subject || null,
        email_body: missingReceiptForm.email_body || null,
      });
      setSettingsSuccess(t('missingReceiptSettingsSaved'));
    } catch (error) {
      setSettingsError(getErrorMessage(error));
    }
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
      setSettingsSuccess(t('billingSubscriptionSaved'));
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

  const reloadCompanyData = async () => {
    const [accounts, bankAccountItems] = await Promise.all([
      accountingApi.getAccounts(),
      bankingApi.listBankAccounts(),
    ]);
    setLedgerAccounts(accounts);
    setBankAccounts(bankAccountItems);
  };

  const saveBankAccount = async () => {
    setCompanyAction('save-bank-account');
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      if (editingBankAccountId) {
        await bankingApi.updateBankAccount(editingBankAccountId, {
          name: bankAccountForm.name,
          bank_name: bankAccountForm.bank_name || undefined,
          iban: bankAccountForm.iban || undefined,
          bic: bankAccountForm.bic || undefined,
          currency: bankAccountForm.currency || undefined,
          account_id: bankAccountForm.account_id || null,
          is_active: bankAccountForm.is_active,
        });
      } else {
        await bankingApi.createBankAccount({
          name: bankAccountForm.name,
          bank_name: bankAccountForm.bank_name || undefined,
          iban: bankAccountForm.iban || undefined,
          bic: bankAccountForm.bic || undefined,
          currency: bankAccountForm.currency || undefined,
          account_id: bankAccountForm.account_id || null,
          is_active: bankAccountForm.is_active,
        });
      }
      await reloadCompanyData();
      setEditingBankAccountId(null);
      setBankAccountForm((current) => ({
        ...current,
        name: '',
        bank_name: '',
        iban: '',
        bic: '',
      }));
      setSettingsSuccess(editingBankAccountId ? t('bankAccountUpdated') : t('bankAccountSaved'));
    } catch (error) {
      setSettingsError(getErrorMessage(error));
    } finally {
      setCompanyAction(null);
    }
  };

  const editBankAccount = (account: BankAccountRecord) => {
    setEditingBankAccountId(account.id);
    setBankAccountForm({
      name: account.name || '',
      bank_name: account.bank_name || '',
      iban: account.iban || '',
      bic: account.bic || '',
      currency: account.currency || 'EUR',
      account_id: account.account_id || '',
      is_active: account.is_active,
    });
  };

  const toggleBankAccountActive = async (account: BankAccountRecord) => {
    setCompanyAction(`toggle-bank-account-${account.id}`);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      await bankingApi.updateBankAccount(account.id, { is_active: !account.is_active });
      await reloadCompanyData();
      setSettingsSuccess(!account.is_active ? t('bankAccountActivated') : t('bankAccountDeactivated'));
    } catch (error) {
      setSettingsError(getErrorMessage(error));
    } finally {
      setCompanyAction(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('description')}</p>
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
                <h2 className="text-lg font-semibold text-slate-900 mb-1">{t('companyInformation')}</h2>
                <p className="text-sm text-slate-500 mb-6">{t('companyDescription')}</p>
                <form className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('companyName')}
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
                      {t('taxId')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('enterTaxId')}
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('address')}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={t('enterCompanyAddress')}
                      className="w-full min-h-[100px] px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all resize-y"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('baseCurrency')}
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
                    {t('saveChanges')}
                  </button>
                </form>

                <div className="mt-8 rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-900">{t('bankAccounts')}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {t('bankAccountsDescription')}
                  </p>

                  {companyLoading ? (
                    <div className="mt-4 text-sm text-slate-500">{t('loadingBankAccounts')}</div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {bankAccounts.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                          {t('noBankAccounts')}
                        </div>
                      ) : (
                        bankAccounts.map((account) => (
                          <div key={account.id} className="rounded-lg border border-slate-200 p-4">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-900">{account.name}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {account.iban || t('noIban')} · {account.bank_name || t('noBankName')} · {account.currency}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {t('ledger')}: {account.ledger_account_code || '-'} {account.ledger_account_name || t('noLinkedAccount')}
                                </div>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ${account.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                {account.is_active ? t('active') : t('inactive')}
                              </span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => editBankAccount(account)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                {t('edit')}
                              </button>
                              <button
                                type="button"
                                onClick={() => void toggleBankAccountActive(account)}
                                disabled={companyAction !== null}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                {companyAction === `toggle-bank-account-${account.id}`
                                  ? t('saving')
                                  : account.is_active ? t('deactivate') : t('activate')}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <SettingsField label={t('displayName')}>
                      <input value={bankAccountForm.name} onChange={(event) => setBankAccountForm((current) => ({ ...current, name: event.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 px-4" />
                    </SettingsField>
                    <SettingsField label={t('bankName')}>
                      <input value={bankAccountForm.bank_name} onChange={(event) => setBankAccountForm((current) => ({ ...current, bank_name: event.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 px-4" />
                    </SettingsField>
                    <SettingsField label={t('iban')}>
                      <input value={bankAccountForm.iban} onChange={(event) => setBankAccountForm((current) => ({ ...current, iban: event.target.value.toUpperCase() }))} className="w-full h-11 rounded-lg border border-slate-200 px-4" />
                    </SettingsField>
                    <SettingsField label={t('bic')}>
                      <input value={bankAccountForm.bic} onChange={(event) => setBankAccountForm((current) => ({ ...current, bic: event.target.value.toUpperCase() }))} className="w-full h-11 rounded-lg border border-slate-200 px-4" />
                    </SettingsField>
                    <SettingsField label={t('currency')}>
                      <input value={bankAccountForm.currency} onChange={(event) => setBankAccountForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} className="w-full h-11 rounded-lg border border-slate-200 px-4" />
                    </SettingsField>
                    <SettingsField label={t('ledgerAccount')}>
                      <select value={bankAccountForm.account_id} onChange={(event) => setBankAccountForm((current) => ({ ...current, account_id: event.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 px-4">
                        <option value="">{t('selectLedgerAccount')}</option>
                        {ledgerAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} · {account.name}
                          </option>
                        ))}
                      </select>
                    </SettingsField>
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={bankAccountForm.is_active}
                      onChange={(event) => setBankAccountForm((current) => ({ ...current, is_active: event.target.checked }))}
                    />
                    <span>{t('activeBankAccount')}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => void saveBankAccount()}
                    disabled={!bankAccountForm.name || companyAction !== null}
                    className="mt-4 h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
                  >
                    {companyAction === 'save-bank-account' ? t('saving') : editingBankAccountId ? t('saveBankAccount') : t('addBankAccount')}
                  </button>
                  {editingBankAccountId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBankAccountId(null);
                        setBankAccountForm((current) => ({
                          ...current,
                          name: '',
                          bank_name: '',
                          iban: '',
                          bic: '',
                        }));
                      }}
                      className="mt-4 ml-3 h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                    >
                      {t('cancelEdit')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">{t('profileInformation')}</h2>
                <p className="text-sm text-slate-500 mb-6">{t('profileDescription')}</p>
                <form className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('fullName')}
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
                      {t('email')}
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
                      {t('phoneNumber')}
                    </label>
                    <input
                      type="tel"
                      placeholder={t('enterPhoneNumber')}
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors"
                  >
                    {t('updateProfile')}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'billing' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">{t('billingTitle')}</h2>
                <p className="text-sm text-slate-500 mb-6">{t('billingDescription')}</p>

                {!canManageBilling ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    {t('billingPermission')}
                  </div>
                ) : billingLoading ? (
                  <div className="text-sm text-slate-500">{t('loadingBillingConfiguration')}</div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('billingAccessState')}</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">{billingEntitlement?.access_state || t('statusActive')}</div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('billingInvoiceNextNumber')}</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">{billingSettingsState?.invoice_next_no ?? 1}</div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('billingOpenInvoices')}</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">
                          {billingInvoices.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'void').length}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-5">
                      <h3 className="text-sm font-semibold text-slate-900">{t('annualBalanceConfirmation')}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {t('annualBalanceDescription')}
                      </p>
                      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
                        <BillingField label={t('annualBalanceText')}>
                          <textarea
                            value={billingForm.annual_balance_template}
                            onChange={(event) => setBillingForm((current) => ({ ...current, annual_balance_template: event.target.value }))}
                            className="min-h-[180px] w-full rounded-lg border border-slate-200 px-4 py-3"
                            style={{ fontSize: '16px' }}
                          />
                        </BillingField>
                        <div className="space-y-4">
                          <BillingField label={t('balanceReferenceDate')}>
                            <input
                              type="date"
                              value={billingForm.annual_balance_reference_date}
                              onChange={(event) => setBillingForm((current) => ({ ...current, annual_balance_reference_date: event.target.value }))}
                              className="w-full h-11 rounded-lg border border-slate-200 px-4"
                              style={{ fontSize: '16px' }}
                            />
                          </BillingField>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                            {t('placeholdersLabel')}: <code>{'{{bill_to_name}}'}</code>, <code>{'{{as_of_date}}'}</code>, <code>{'{{balance_amount}}'}</code>, <code>{'{{balance_direction}}'}</code>, <code>{'{{balance_statement}}'}</code>, <code>{'{{open_invoice_count}}'}</code>, <code>{'{{tenant_name}}'}</code>
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
                            setSettingsSuccess(t('annualBalancePreviewLoaded'));
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'preview-annual-balance' ? t('loading') : t('previewAnnualBalance')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void runBillingAction('send-annual-balance', async () => {
                            const result = await billingApi.sendAnnualBalance({
                              reference_date: billingForm.annual_balance_reference_date,
                            });
                            await reloadBilling();
                            setSettingsSuccess(
                              result.sent
                                ? t('annualBalanceSent', { recipient: result.recipient || '' })
                                : result.skipped_reason
                                  ? t('noMessageSentWithReason', { reason: result.skipped_reason })
                                  : t('noMessageSent'),
                            );
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'send-annual-balance' ? t('sending') : t('sendAnnualBalanceConfirmation')}
                        </button>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        {t('annualBalanceHelp')}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-5">
                      <h3 className="text-sm font-semibold text-slate-900">{t('reminderAutomation')}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {t('reminderAutomationDescription')}
                      </p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <BillingField label={t('billToName')}>
                          <input value={billingForm.bill_to_name} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_name: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('billToEmail')}>
                          <input value={billingForm.bill_to_email} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_email: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('billToRegistryCode')}>
                          <input value={billingForm.bill_to_registry_code} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_registry_code: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('billToVatNumber')}>
                          <input value={billingForm.bill_to_vat_number} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_vat_number: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('billToAddress')}>
                          <input value={billingForm.bill_to_address} onChange={(event) => setBillingForm((current) => ({ ...current, bill_to_address: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('invoiceDueDays')}>
                          <input value={billingForm.invoice_due_days} onChange={(event) => setBillingForm((current) => ({ ...current, invoice_due_days: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('reminderWeekday')}>
                          <select value={billingForm.reminder_weekday} onChange={(event) => setBillingForm((current) => ({ ...current, reminder_weekday: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }}>
                            <option value="1">{t('monday')}</option>
                            <option value="2">{t('tuesday')}</option>
                            <option value="3">{t('wednesday')}</option>
                            <option value="4">{t('thursday')}</option>
                            <option value="5">{t('friday')}</option>
                          </select>
                        </BillingField>
                        <BillingField label={t('reminderFrequencyDays')}>
                          <input value={billingForm.reminder_frequency_days} onChange={(event) => setBillingForm((current) => ({ ...current, reminder_frequency_days: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('startAfterOverdueDays')}>
                          <input value={billingForm.reminder_start_after_days} onChange={(event) => setBillingForm((current) => ({ ...current, reminder_start_after_days: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <label className="flex items-center gap-3 pt-8">
                          <input type="checkbox" checked={billingForm.reminders_enabled} onChange={(event) => setBillingForm((current) => ({ ...current, reminders_enabled: event.target.checked }))} />
                          <span className="text-sm text-slate-700">{t('enableReminders')}</span>
                        </label>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-3">
                        <BillingField label={t('firstReminderText')}>
                          <textarea
                            value={billingForm.reminder_template_first}
                            onChange={(event) => setBillingForm((current) => ({ ...current, reminder_template_first: event.target.value }))}
                            className="min-h-[140px] w-full rounded-lg border border-slate-200 px-4 py-3"
                            style={{ fontSize: '16px' }}
                          />
                        </BillingField>
                        <BillingField label={t('secondReminderText')}>
                          <textarea
                            value={billingForm.reminder_template_second}
                            onChange={(event) => setBillingForm((current) => ({ ...current, reminder_template_second: event.target.value }))}
                            className="min-h-[140px] w-full rounded-lg border border-slate-200 px-4 py-3"
                            style={{ fontSize: '16px' }}
                          />
                        </BillingField>
                        <BillingField label={t('thirdReminderText')}>
                          <textarea
                            value={billingForm.reminder_template_third}
                            onChange={(event) => setBillingForm((current) => ({ ...current, reminder_template_third: event.target.value }))}
                            className="min-h-[140px] w-full rounded-lg border border-slate-200 px-4 py-3"
                            style={{ fontSize: '16px' }}
                          />
                        </BillingField>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        {t('availablePlaceholders')}: <code>{'{{invoice_no}}'}</code>, <code>{'{{total}}'}</code>, <code>{'{{due_date}}'}</code>, <code>{'{{bill_to_name}}'}</code>, <code>{'{{reminder_index}}'}</code>
                      </p>
                      <div className="mt-4 flex flex-wrap items-end gap-3">
                        <BillingField label={t('previewReminderStage')}>
                          <select
                            value={billingForm.preview_reminder_index}
                            onChange={(event) => setBillingForm((current) => ({ ...current, preview_reminder_index: event.target.value }))}
                            className="h-11 rounded-lg border border-slate-200 px-4"
                            style={{ fontSize: '16px' }}
                          >
                            <option value="1">{t('first')}</option>
                            <option value="2">{t('second')}</option>
                            <option value="3">{t('third')}</option>
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
                            setSettingsSuccess(t('reminderPreviewLoaded', { invoiceNo: preview.invoice?.invoice_no || '' }));
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'preview-reminder' ? t('loading') : t('previewReminder')}
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
                            setSettingsSuccess(t('billingSettingsSaved'));
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'settings' ? t('saving') : t('saveReminderSettings')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void runBillingAction('reminders', async () => {
                            const result = await billingApi.sendReminders({ force: true });
                            await reloadBilling();
                            setSettingsSuccess(
                              result.sent_count > 0
                                ? t('remindersSent', { count: result.sent_count })
                                : result.skipped_reason
                                  ? t('noRemindersSentWithReason', { reason: result.skipped_reason })
                                  : t('noRemindersSent'),
                            );
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'reminders' ? t('sending') : t('sendRemindersNow')}
                        </button>
                      </div>
                      <p className="mt-4 text-xs text-slate-500">
                        {t('cronAutomationHelp')}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-5">
                      <h3 className="text-sm font-semibold text-slate-900">{t('missingReceiptReminders')}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {t('missingReceiptRemindersDescription')}
                      </p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <label className="flex items-center gap-3 pt-2">
                          <input type="checkbox" checked={missingReceiptForm.is_enabled} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, is_enabled: event.target.checked }))} />
                          <span className="text-sm text-slate-700">{t('enableMissingReceiptReminders')}</span>
                        </label>
                        <BillingField label={t('missingReceiptResponsibleEmail')}>
                          <input type="email" value={missingReceiptForm.responsible_email} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, responsible_email: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('missingReceiptFrequencyDays')}>
                          <input type="number" min="1" value={missingReceiptForm.frequency_days} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, frequency_days: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('missingReceiptStartAfterDays')}>
                          <input type="number" min="0" value={missingReceiptForm.start_after_days} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, start_after_days: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('missingReceiptWeekday')}>
                          <select value={missingReceiptForm.weekday} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, weekday: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }}>
                            <option value="">{t('anyWeekday')}</option>
                            <option value="1">{t('monday')}</option>
                            <option value="2">{t('tuesday')}</option>
                            <option value="3">{t('wednesday')}</option>
                            <option value="4">{t('thursday')}</option>
                            <option value="5">{t('friday')}</option>
                          </select>
                        </BillingField>
                        <BillingField label={t('missingReceiptMaxReminders')}>
                          <input type="number" min="0" value={missingReceiptForm.max_reminders} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, max_reminders: event.target.value }))} placeholder={t('missingReceiptMaxRemindersUnlimited')} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <BillingField label={t('missingReceiptEmailSubject')}>
                          <input value={missingReceiptForm.email_subject} onChange={(event) => setMissingReceiptForm((c) => ({ ...c, email_subject: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <div />
                        <BillingField label={t('missingReceiptEmailBody')}>
                          <textarea
                            value={missingReceiptForm.email_body}
                            onChange={(event) => setMissingReceiptForm((c) => ({ ...c, email_body: event.target.value }))}
                            className="min-h-[180px] w-full rounded-lg border border-slate-200 px-4 py-3"
                            style={{ fontSize: '16px' }}
                          />
                        </BillingField>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        {t('missingReceiptPlaceholders')}
                      </p>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => void saveMissingReceiptSettings()}
                          className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
                        >
                          {t('saveReminderSettings')}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{t('subscription')}</h3>
                          <p className="mt-1 text-sm text-slate-500">{t('subscriptionDescription')}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <BillingField label={t('plan')}>
                          <select
                            value={billingForm.plan_id}
                            onChange={(event) => setBillingForm((current) => ({ ...current, plan_id: event.target.value }))}
                            className="w-full h-11 px-4 border border-slate-200 rounded-lg"
                            style={{ fontSize: '16px' }}
                          >
                            <option value="">{t('selectPlan')}</option>
                            {billingPlans.map((plan) => (
                              <option key={plan.id} value={plan.id}>{plan.code} - {plan.name}</option>
                            ))}
                          </select>
                        </BillingField>
                        <BillingField label={t('status')}>
                          <select
                            value={billingForm.status}
                            onChange={(event) => setBillingForm((current) => ({ ...current, status: event.target.value }))}
                            className="w-full h-11 px-4 border border-slate-200 rounded-lg"
                            style={{ fontSize: '16px' }}
                          >
                            <option value="active">{t('statusActive')}</option>
                            <option value="paused">{t('statusPaused')}</option>
                            <option value="canceled">{t('statusCanceled')}</option>
                          </select>
                        </BillingField>
                        <BillingField label={t('billingDay')}>
                          <input value={billingForm.billing_day} onChange={(event) => setBillingForm((current) => ({ ...current, billing_day: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('currency')}>
                          <input value={billingForm.currency} onChange={(event) => setBillingForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('unitPrice')}>
                          <input value={billingForm.unit_price} onChange={(event) => setBillingForm((current) => ({ ...current, unit_price: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('quantity')}>
                          <input value={billingForm.quantity} onChange={(event) => setBillingForm((current) => ({ ...current, quantity: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('discountPercent')}>
                          <input value={billingForm.discount_percent} onChange={(event) => setBillingForm((current) => ({ ...current, discount_percent: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('vatRate')}>
                          <input value={billingForm.vat_rate} onChange={(event) => setBillingForm((current) => ({ ...current, vat_rate: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('currentPeriodStart')}>
                          <input type="date" value={billingForm.current_period_start} onChange={(event) => setBillingForm((current) => ({ ...current, current_period_start: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('currentPeriodEnd')}>
                          <input type="date" value={billingForm.current_period_end} onChange={(event) => setBillingForm((current) => ({ ...current, current_period_end: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <BillingField label={t('nextInvoiceDate')}>
                          <input type="date" value={billingForm.next_invoice_date} onChange={(event) => setBillingForm((current) => ({ ...current, next_invoice_date: event.target.value }))} className="w-full h-11 px-4 border border-slate-200 rounded-lg" style={{ fontSize: '16px' }} />
                        </BillingField>
                        <label className="flex items-center gap-3 pt-8">
                          <input type="checkbox" checked={billingForm.cancel_at_period_end} onChange={(event) => setBillingForm((current) => ({ ...current, cancel_at_period_end: event.target.checked }))} />
                          <span className="text-sm text-slate-700">{t('cancelAtPeriodEnd')}</span>
                        </label>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={saveBillingSubscription}
                          disabled={billingSaving}
                          className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
                        >
                          {billingSaving ? t('saving') : t('saveSubscription')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void runBillingAction('generate', async () => {
                            const result = await billingApi.generateInvoices();
                            await reloadBilling();
                            setSettingsSuccess(t('generatedBillingInvoices', { count: result.created_count }));
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'generate' ? t('generating') : t('generateInvoices')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void runBillingAction('entitlements', async () => {
                            const result = await billingApi.recomputeEntitlements();
                            await reloadBilling();
                            setSettingsSuccess(t('entitlementsRecomputed', { state: result.entitlement.access_state }));
                          })}
                          disabled={billingAction !== null}
                          className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
                        >
                          {billingAction === 'entitlements' ? t('recomputing') : t('recomputeEntitlements')}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <h3 className="text-sm font-semibold text-slate-900">{t('messagePreview')}</h3>
                      </div>
                      {!billingMessagePreview ? (
                        <div className="p-5 text-sm text-slate-500">{t('loadPreviewHint')}</div>
                      ) : (
                        <div className="space-y-4 p-5">
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('subject')}</div>
                            <div className="mt-1 text-sm font-medium text-slate-900">{billingMessagePreview.subject}</div>
                          </div>
                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('type')}</div>
                              <div className="mt-1 text-sm text-slate-900">{billingMessagePreview.kind}</div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('reference')}</div>
                              <div className="mt-1 text-sm text-slate-900">{billingMessagePreview.invoice ? `Invoice #${billingMessagePreview.invoice.invoice_no}` : billingMessagePreview.reference_date || '-'}</div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('balanceOrStage')}</div>
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
                            <h3 className="text-sm font-semibold text-slate-900">{t('annualBalanceReporting')}</h3>
                            <p className="mt-1 text-xs text-slate-600">{t('annualBalanceReportingDescription')}</p>
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
                                setSettingsSuccess(t('annualBalanceReportLoaded'));
                              })}
                              disabled={billingAction !== null}
                              className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                            >
                              {billingAction === 'annual-balance-report' ? t('loading') : t('loadReport')}
                            </button>
                            <button
                              type="button"
                              onClick={exportAnnualBalanceReportCsv}
                              disabled={!annualBalanceReport}
                              className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                            >
                              {t('exportCsv')}
                            </button>
                          </div>
                        </div>
                      </div>
                      {!annualBalanceReport ? (
                        <div className="p-5 text-sm text-slate-500">{t('loadPeriodForAnnualBalance')}</div>
                      ) : (
                        <div className="space-y-4 p-5">
                          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                            <ReportStat label={t('sent')} value={annualBalanceReport.summary.sent_count} />
                            <ReportStat label={t('responded')} value={annualBalanceReport.summary.responded_count} />
                            <ReportStat label={t('confirmed')} value={annualBalanceReport.summary.confirmed_count} />
                            <ReportStat label={t('mismatches')} value={annualBalanceReport.summary.mismatch_count} />
                            <ReportStat label={t('openMismatches')} value={annualBalanceReport.summary.open_mismatch_count} />
                            <ReportStat label={t('resolved')} value={annualBalanceReport.summary.resolved_mismatch_count} />
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                              <thead className="bg-slate-50">
                                <tr>
                                  {[t('sent'), t('reference'), t('recipient'), t('balance'), t('response'), t('resolved')].map((label) => (
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
                                        ? t('theyOweAmount', { amount: Math.abs(Number(row.balance_amount || 0)).toFixed(2) })
                                        : row.balance_direction === 'we_owe_you'
                                          ? t('weOweAmount', { amount: Math.abs(Number(row.balance_amount || 0)).toFixed(2) })
                                          : t('settled')}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">
                                      {row.response_decision ? (
                                        <div>
                                          <div>{row.response_decision}</div>
                                          {row.response_note && <div className="mt-1 text-xs text-slate-500">{row.response_note}</div>}
                                        </div>
                                      ) : t('noResponse')}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">
                                      <div className="space-y-1">
                                        <div>
                                          {row.resolved_at
                                            ? `${new Date(row.resolved_at).toLocaleString()}${row.resolution_note ? ` - ${row.resolution_note}` : ''}`
                                            : '-'}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          {t('notification')}: {row.notification_status || t('notRecorded')}
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
                        <h3 className="text-sm font-semibold text-slate-900">{t('reminderOperations')}</h3>
                        <p className="mt-1 text-xs text-slate-600">{t('reminderOperationsDescription')}</p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {billingReminderOperations.length === 0 ? (
                          <div className="p-5 text-sm text-slate-500">{t('noReminderOperations')}</div>
                        ) : (
                          billingReminderOperations.map((invoice) => (
                            <div key={invoice.id} className="flex flex-col gap-3 p-5 xl:flex-row xl:items-center xl:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Invoice #{invoice.invoice_no} · {Number(invoice.total || 0).toFixed(2)} {invoice.currency}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {t('dueOverdueSent', { dueDate: invoice.due_date, overdueDays: invoice.overdue_days, reminderCount: invoice.reminder_sent_count })}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {t('recipientNextEligible', { recipient: invoice.recipient || t('missing'), date: invoice.next_eligible_reminder_date })}
                                </div>
                              </div>
                              <div className="flex flex-col items-start gap-2 xl:items-end">
                                <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  invoice.eligible_now
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {invoice.eligible_now
                                    ? t('eligibleNow')
                                    : invoice.blocking_reason === 'disabled'
                                      ? t('remindersDisabled')
                                      : invoice.blocking_reason === 'not_overdue_enough'
                                        ? t('tooEarly')
                                        : invoice.blocking_reason === 'frequency_not_reached'
                                          ? t('waitingFrequency')
                                          : invoice.blocking_reason === 'weekday_mismatch'
                                            ? t('wrongWeekday')
                                            : t('notEligible')}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void runBillingAction(`send-invoice-reminder-${invoice.id}`, async () => {
                                    const result = await billingApi.sendInvoiceReminder(invoice.id, { force: true });
                                    await reloadBilling();
                                    setSettingsSuccess(
                                      result.sent
                                        ? t('reminderSentForInvoice', { invoiceNo: invoice.invoice_no })
                                        : result.skipped_reason === 'no_recipient'
                                          ? t('reminderSkippedNoRecipient')
                                          : result.skipped_reason === 'disabled'
                                            ? t('reminderSkippedDisabled')
                                            : result.skipped_reason === 'not_overdue_enough'
                                              ? t('reminderSkippedNotOverdueEnough')
                                              : result.skipped_reason === 'frequency_not_reached'
                                                ? t('reminderSkippedFrequency')
                                                : result.skipped_reason === 'weekday_mismatch'
                                                  ? t('reminderSkippedWeekdayMismatch')
                                                  : t('reminderWasNotSent')
                                    );
                                  })}
                                  disabled={billingAction !== null}
                                  className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                                >
                                  {billingAction === `send-invoice-reminder-${invoice.id}` ? t('sending') : t('sendReminder')}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <h3 className="text-sm font-semibold text-slate-900">{t('billingInvoices')}</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {billingInvoices.length === 0 ? (
                          <div className="p-5 text-sm text-slate-500">{t('noBillingInvoices')}</div>
                        ) : (
                          billingInvoices.map((invoice) => (
                            <div key={invoice.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-900">#{invoice.invoice_no} · {invoice.status}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {t('billingInvoicePeriod', { start: invoice.issue_date, end: invoice.period_end, dueDate: invoice.due_date })}
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
                                      setSettingsSuccess(t('billingInvoiceMarkedPaid', { invoiceNo: invoice.invoice_no }));
                                    })}
                                    disabled={billingAction !== null}
                                    className="h-9 px-4 border border-emerald-200 rounded-lg hover:bg-emerald-50 text-sm text-emerald-700 font-medium transition-colors disabled:opacity-50"
                                  >
                                    {billingAction === `pay-${invoice.id}` ? t('saving') : t('markPaid')}
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
                        <h3 className="text-sm font-semibold text-slate-900">{t('internalNotificationStatus')}</h3>
                        <p className="mt-1 text-xs text-slate-600">{t('internalNotificationDescription')}</p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {billingAnnualBalanceNotifications.length === 0 ? (
                          <div className="p-5 text-sm text-slate-500">{t('noInternalNotifications')}</div>
                        ) : (
                          billingAnnualBalanceNotifications.map((event) => (
                            <div key={event.id} className="flex flex-col gap-2 p-5 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {event.payload?.status === 'sent'
                                    ? t('internalNotificationSent')
                                    : event.payload?.status === 'failed'
                                      ? t('internalNotificationFailed')
                                      : t('internalNotificationSkipped')}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {t('asOfCustomer', { date: event.payload?.reference_date || t('unknown'), customer: event.payload?.recipient || t('unknown') })}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {event.payload?.notified_internal_emails?.length
                                    ? event.payload.notified_internal_emails.join(', ')
                                    : t('noInternalRecipients')}
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
                            <h3 className="text-sm font-semibold text-slate-900">{t('annualBalanceMismatchInbox')}</h3>
                            <p className="mt-1 text-xs text-slate-600">{t('annualBalanceMismatchDescription')}</p>
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
                                {filterKey === 'open' ? t('open') : filterKey === 'resolved' ? t('resolved') : t('all')}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {visibleBillingMismatches.length === 0 ? (
                          <div className="p-5 text-sm text-slate-500">
                            {billingMismatchFilter === 'resolved'
                              ? t('noResolvedBalanceMismatches')
                              : billingMismatchFilter === 'all'
                                ? t('noBalanceMismatchesReported')
                                : t('noOpenBalanceMismatches')}
                          </div>
                        ) : (
                          visibleBillingMismatches.map((event) => (
                            <div key={event.id} className="space-y-3 p-5">
                              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <div className="text-sm font-medium text-slate-900">
                                    {event.sent_payload?.balance_direction === 'we_owe_you'
                                      ? t('mismatchWeOwe', { amount: Math.abs(Number(event.sent_payload?.balance_amount || 0)).toFixed(2) })
                                      : event.sent_payload?.balance_direction === 'you_owe_us'
                                        ? t('mismatchTheyOwe', { amount: Math.abs(Number(event.sent_payload?.balance_amount || 0)).toFixed(2) })
                                        : t('mismatchSettled')}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {t('asOfRecipient', { date: event.payload?.reference_date || event.sent_payload?.reference_date || t('unknown'), recipient: event.payload?.recipient || event.sent_payload?.recipient || t('noRecipient') })}
                                  </div>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {event.payload?.resolved_at
                                    ? t('resolvedAt', { date: new Date(event.payload.resolved_at).toLocaleString() })
                                    : new Date(event.created_at).toLocaleString()}
                                </div>
                              </div>
                              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                                {event.payload?.note || t('noMismatchNote')}
                              </div>
                              {event.payload?.resolved_at ? (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                                  {event.payload?.resolution_note ? t('resolvedWithNote', { note: event.payload.resolution_note }) : t('resolvedOnly')}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                  <input
                                    value={mismatchResolutionNotes[event.id] || ''}
                                    onChange={(e) => setMismatchResolutionNotes((current) => ({ ...current, [event.id]: e.target.value }))}
                                    placeholder={t('optionalResolutionNote')}
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
                                      setSettingsSuccess(t('mismatchMarkedResolved'));
                                    })}
                                    disabled={billingAction !== null}
                                    className="h-11 px-5 rounded-lg border border-emerald-200 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                                  >
                                    {billingAction === `resolve-mismatch-${event.id}` ? t('saving') : t('markResolved')}
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
                        <h3 className="text-sm font-semibold text-slate-900">{t('reminderHistory')}</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {billingReminderHistory.length === 0 ? (
                          <div className="p-5 text-sm text-slate-500">{t('noRemindersSentYet')}</div>
                        ) : (
                          billingReminderHistory.map((event) => (
                            <div key={event.id} className="flex flex-col gap-2 p-5 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {t('reminderHistoryItem', { index: event.payload?.reminder_index || '?', kind: event.payload?.template_kind || t('custom') })}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {t('invoiceDueRecipient', { invoiceNo: event.payload?.invoice_no || t('unknown'), dueDate: event.payload?.due_date || t('unknown'), recipient: event.payload?.recipient || t('noRecipient') })}
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
                        <h3 className="text-sm font-semibold text-slate-900">{t('annualBalanceHistory')}</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {billingAnnualBalanceHistory.length === 0 ? (
                          <div className="p-5 text-sm text-slate-500">{t('noAnnualBalanceHistory')}</div>
                        ) : (
                          billingAnnualBalanceHistory.map((event) => (
                            <div key={event.id} className="flex flex-col gap-2 p-5 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {event.type === 'annual_balance_confirmation_response'
                                    ? event.payload?.decision === 'confirm'
                                      ? t('customerConfirmedBalance')
                                      : t('customerReportedMismatch')
                                    : event.payload?.balance_direction === 'we_owe_you'
                                      ? t('weOweThemAmount', { amount: Math.abs(Number(event.payload?.balance_amount || 0)).toFixed(2) })
                                      : event.payload?.balance_direction === 'you_owe_us'
                                        ? t('theyOweUsAmount', { amount: Math.abs(Number(event.payload?.balance_amount || 0)).toFixed(2) })
                                        : t('balanceSettled')}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {event.type === 'annual_balance_confirmation_response'
                                    ? t('asOfRecipient', { date: event.payload?.reference_date || t('unknown'), recipient: event.payload?.recipient || t('noRecipient') })
                                    : t('asOfRecipientOpenInvoices', { date: event.payload?.reference_date || t('unknown'), recipient: event.payload?.recipient || t('noRecipient'), count: event.payload?.open_invoice_count || 0 })}
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
                <h2 className="text-lg font-semibold text-slate-900 mb-1">{t('notificationPreferences')}</h2>
                <p className="text-sm text-slate-500 mb-6">{t('notificationPreferencesDescription')}</p>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-700">{t('emailNotifications')}</h3>
                    {[
                      { id: 'invoices', label: t('newInvoices'), checked: true },
                      { id: 'payments', label: t('paymentsReceived'), checked: true },
                      { id: 'weekly', label: t('weeklySummaryReports'), checked: false },
                      { id: 'system', label: t('systemUpdatesMaintenance'), checked: true },
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
                <h2 className="text-lg font-semibold text-slate-900 mb-1">{t('securitySettings')}</h2>
                <p className="text-sm text-slate-500 mb-6">{t('securityDescription')}</p>
                <div className="space-y-6">
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <h3 className="font-medium text-slate-900 mb-2">{t('changePassword')}</h3>
                    <p className="text-sm text-slate-500 mb-3">{t('changePasswordDescription')}</p>
                    <button className="h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors">
                      {t('updatePassword')}
                    </button>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <h3 className="font-medium text-slate-900 mb-2">{t('twoFactorAuthentication')}</h3>
                    <p className="text-sm text-slate-500 mb-3">{t('twoFactorDescription')}</p>
                    <button className="h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors">
                      {t('enable2fa')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'localization' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">{t('localization')}</h2>
                <p className="text-sm text-slate-500 mb-6">{t('localizationDescription')}</p>
                <form className="space-y-5" onSubmit={handleSavePreferences}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('language')}
                    </label>
                    <select
                      value={localizationLanguage}
                      onChange={(e) => setLocalizationLanguage(e.target.value as Locale)}
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
                      style={{ fontSize: '16px' }}
                    >
                      <option value="en">English</option>
                      <option value="et">{t('estonian')}</option>
                      <option value="fi">{t('finnish')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('timezone')}
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
                      {t('dateFormat')}
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
                    {t('savePreferences')}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'business-registry' && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">{t('businessRegistryTitle')}</h2>
                <p className="text-sm text-slate-500 mb-6">{t('businessRegistryDescription')}</p>

                {!canManageRegistry ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    {t('businessRegistryPermission')}
                  </div>
                ) : registryLoading ? (
                  <div className="text-sm text-slate-500">{t('loadingIntegrationSettings')}</div>
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
                          <div className="text-sm font-medium text-slate-900">{t('integrationEnabled')}</div>
                          <div className="text-xs text-slate-500">{t('integrationEnabledDescription')}</div>
                        </div>
                      </label>

                      <div className="rounded-lg border border-slate-200 p-4">
                        <div className="text-sm font-medium text-slate-900">{t('storedCredentials')}</div>
                        <div className="mt-2 text-xs text-slate-500">
                          {t('storedCredentialsValue', {
                            username: registrySettings?.username_masked || t('notSet'),
                            password: registrySettings?.has_password ? t('stored') : t('notSet'),
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <Field
                        label={t('providerType')}
                        value={registryForm.provider_type}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, provider_type: value }))}
                      />
                      <Field
                        label={t('serviceUrl')}
                        value={registryForm.service_url}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, service_url: value }))}
                      />
                      <Field
                        label={t('searchPath')}
                        value={registryForm.search_path}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, search_path: value }))}
                      />
                      <Field
                        label={t('companyPath')}
                        value={registryForm.company_path}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, company_path: value }))}
                      />
                      <Field
                        label={t('testPath')}
                        value={registryForm.test_path}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, test_path: value }))}
                      />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <Field
                        label={registrySettings?.username_masked ? t('usernameCurrent', { current: registrySettings.username_masked }) : t('username')}
                        value={registryForm.username}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, username: value }))}
                        placeholder={t('leaveBlankKeepUsername')}
                      />
                      <Field
                        label={registrySettings?.has_password ? t('passwordStored') : t('password')}
                        value={registryForm.password}
                        onChange={(value) => setRegistryForm((current) => ({ ...current, password: value }))}
                        placeholder={t('leaveBlankKeepPassword')}
                        type="password"
                      />
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <div className="font-medium text-slate-900">{t('status')}</div>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <div>{t('lastTestStatus')}: {registrySettings?.last_test_status || t('notRun')}</div>
                        <div>{t('lastTestAt')}: {registrySettings?.last_test_at ? new Date(registrySettings.last_test_at).toLocaleString() : t('na')}</div>
                        <div>{t('lastError')}: {registrySettings?.last_error_message || t('none')}</div>
                        <div>{t('updatedAt')}: {registrySettings?.updated_at ? new Date(registrySettings.updated_at).toLocaleString() : t('na')}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={saveRegistrySettings}
                        disabled={registrySaving}
                        className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
                      >
                        {registrySaving ? t('saving') : t('saveSettings')}
                      </button>
                      <button
                        type="button"
                        onClick={testRegistrySettings}
                        disabled={registryTesting}
                        className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
                      >
                        {registryTesting ? t('testing') : t('testConnection')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'data-management' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-slate-900">{t('dataManagement')}</h2>

                <div className="rounded-xl border border-slate-200 p-6">
                  <h3 className="text-base font-semibold text-slate-900">{t('openingBalances')}</h3>
                  {dataManagementLoading ? (
                    <p className="mt-2 text-sm text-slate-500">{t('loading')}</p>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-slate-500">
                        {importStatus?.is_imported
                          ? t('openingBalancesImported', { count: importStatus.committed_batches.length })
                          : t('noOpeningBalancesImported')}
                      </p>

                      {importStatus?.is_imported && importStatus.committed_batches.length > 0 && (
                        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{t('committedBatches')}</div>
                          {importStatus.committed_batches.map((b: any) => (
                            <div key={b.id} className="flex items-center gap-3 text-sm text-slate-700 py-1">
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 capitalize">{b.batch_type}</span>
                              <span>{b.opening_date}</span>
                              <span className="text-slate-400">|</span>
                              <span className="text-xs text-slate-400">{new Date(b.committed_at).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {importStatus?.is_imported && canManageData && (
                        importStatus.can_reset ? (
                          <button
                            onClick={() => setResetDialogOpen(true)}
                            disabled={!!dataManagementAction}
                            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--danger)] px-4 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                            {t('resetOpeningBalances')}
                          </button>
                        ) : (
                          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            {t('resetWindowExpired', { months: importStatus.reset_window_months ?? 3 })}
                          </p>
                        )
                      )}

                      {canManageData && (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {!importStatus?.is_imported && (
                            <Link
                              href="/accounting/opening-balances"
                              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] transition-colors"
                            >
                              <Upload className="h-4 w-4" />
                              {t('importOpeningBalances')}
                            </Link>
                          )}
                          {importStatus?.is_imported && (
                            <Link
                              href="/accounting/opening-balances"
                              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
                            >
                              <Upload className="h-4 w-4" />
                              {t('openOpeningBalancesPage')}
                            </Link>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {canManageData && (
                  <SystemRolesPanel
                    accounts={roleAccounts}
                    settings={accountingSettings}
                    saving={rolesSaving}
                    creatingDefaults={creatingDefaults}
                    onSave={handleSaveSystemRoles}
                    onCreateDefaults={handleCreateDefaultChart}
                    labels={{
                      title: t('systemRolesTitle'),
                      description: t('systemRolesDescription'),
                      save: t('systemRolesSave'),
                      saving: t('saving'),
                      createDefaults: t('createDefaultChart'),
                      creating: t('creating'),
                      selectAccount: t('selectAccount'),
                      emptyHint: t('createDefaultChartHint'),
                    }}
                  />
                )}

                {resetBackups.length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-6">
                    <h3 className="text-base font-semibold text-slate-900">{t('resetHistory')}</h3>
                    <p className="mt-1 text-sm text-slate-500">{t('resetHistoryDescription')}</p>
                    <div className="mt-4 space-y-3">
                      {resetBackups.map((backup: any) => (
                        <div key={backup.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4">
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              {t('resetOn', { date: new Date(backup.reset_at).toLocaleDateString(), time: new Date(backup.reset_at).toLocaleTimeString() })}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {t('batchesBackedUp', { count: (backup.batch_snapshots || []).length })}
                              {backup.restored_at && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  {t('restoredOn', { date: new Date(backup.restored_at).toLocaleDateString() })}
                                </span>
                              )}
                            </div>
                          </div>
                          {!backup.restored_at && !importStatus?.is_imported && canManageData && (
                            <button
                              onClick={() => setRestoreDialogOpen(backup.id)}
                              disabled={!!dataManagementAction}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-white transition-colors disabled:opacity-50"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              {t('restore')}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <ConfirmResetDialog
                  open={resetDialogOpen}
                  onOpenChange={(open) => {
                    setResetDialogOpen(open);
                    if (!open) {
                      setResetDeleteAccounts(false);
                      setResetDeletePartners(false);
                    }
                  }}
                  title={t('resetOpeningBalances')}
                  description={t('resetOpeningBalancesDescription')}
                  requiredText={t('resetAll')}
                  confirmLabel={t('resetOpeningBalances')}
                  onConfirm={handleResetOpeningBalances}
                >
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{t('resetExtraOptions')}</div>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={resetDeleteAccounts}
                        onChange={(event) => setResetDeleteAccounts(event.target.checked)}
                      />
                      <span>{t('resetDeleteAccounts')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={resetDeletePartners}
                        onChange={(event) => setResetDeletePartners(event.target.checked)}
                      />
                      <span>{t('resetDeletePartners')}</span>
                    </label>
                  </div>
                </ConfirmResetDialog>

                {restoreDialogOpen && (
                  <ConfirmDialog
                    open={!!restoreDialogOpen}
                    onOpenChange={(open) => { if (!open) setRestoreDialogOpen(null); }}
                    title={t('restoreOpeningBalances')}
                    description={t('restoreOpeningBalancesDescription')}
                    confirmLabel={t('restore')}
                    variant="warning"
                    onConfirm={() => handleRestoreBackup(restoreDialogOpen)}
                  />
                )}
              </div>
            )}

            {activeTab === 'ai' && canManageBilling && (
              <AiInvoiceSettingsTab />
            )}

            {activeTab === 'team' && canManageData && tenant && (
              <TeamTab tenantId={tenant.id} currentUserId={user?.id ?? ''} currentRole={role ?? 'viewer'} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Team tab ─────────────────────────────────────────────────────────────────

type AddMode = 'invite' | 'create' | null;

function TeamTab({
  tenantId,
  currentUserId,
  currentRole,
}: {
  tenantId: string;
  currentUserId: string;
  currentRole: UserRole;
}) {
  const t = useTranslations('settings');
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('accountant');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TenantMember | null>(null);

  const canManage = currentRole === 'owner' || currentRole === 'admin';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tenantsApi.getMembers(tenantId);
      setMembers(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    void load();
  }, [tenantId]);

  const resetForm = () => {
    setFormEmail('');
    setFormName('');
    setFormPassword('');
    setFormRole('accountant');
    setFormError(null);
    setAddMode(null);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await tenantsApi.inviteMember(tenantId, { email: formEmail, role: formRole });
      await load();
      resetForm();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await tenantsApi.createMember(tenantId, { email: formEmail, name: formName || undefined, password: formPassword, role: formRole });
      await load();
      resetForm();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (member: TenantMember, newRole: UserRole) => {
    try {
      await tenantsApi.updateMemberRole(tenantId, member.user.id, newRole);
      setMembers((prev) => prev.map((m) => m.user.id === member.user.id ? { ...m, role: newRole } : m));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleRemove = async (member: TenantMember) => {
    try {
      await tenantsApi.removeMember(tenantId, member.user.id);
      setMembers((prev) => prev.filter((m) => m.user.id !== member.user.id));
      setRemoveTarget(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const roles: UserRole[] = ['owner', 'admin', 'accountant', 'viewer'];
  const roleLabel = (r: UserRole) => ({ owner: t('roleOwner'), admin: t('roleAdmin'), accountant: t('roleAccountant'), viewer: t('roleViewer') }[r] ?? r);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{t('team')}</h2>
        {canManage && !addMode && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddMode('invite')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-1.5 text-[13px] font-medium text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)] transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" /> {t('inviteExisting')}
            </button>
            <button
              onClick={() => setAddMode('create')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[var(--primary-hover)] transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5" /> {t('createUser')}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--a-neg)]/40 bg-[var(--a-neg-soft)] px-4 py-3 text-[13px] text-[var(--a-neg)]">{error}</div>
      )}

      {addMode && (
        <div className="rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--a-text)]">
              {addMode === 'invite' ? t('inviteExisting') : t('createUser')}
            </h3>
            <button onClick={resetForm} className="text-[var(--a-text-3)] hover:text-[var(--a-text)]">✕</button>
          </div>

          {addMode === 'invite' ? (
            <p className="mb-4 text-[12.5px] text-[var(--a-text-2)]">{t('inviteExistingHint')}</p>
          ) : (
            <p className="mb-4 text-[12.5px] text-[var(--a-text-2)]">{t('createUserHint')}</p>
          )}

          <form onSubmit={addMode === 'invite' ? handleInvite : handleCreate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--a-text-3)]">{t('email')}</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-[13px] text-[var(--a-text)]"
                  placeholder="user@company.ee"
                />
              </div>
              {addMode === 'create' && (
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--a-text-3)]">{t('memberName')}</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-[13px] text-[var(--a-text)]"
                    placeholder={t('namePlaceholder')}
                  />
                </div>
              )}
              {addMode === 'create' && (
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--a-text-3)]">{t('password')}</label>
                  <input
                    type="password"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-[13px] text-[var(--a-text)]"
                    placeholder="Min. 8 chars, upper + lower + number"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--a-text-3)]">{t('memberRole')}</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-[13px] text-[var(--a-text)]"
                >
                  {roles.filter((r) => currentRole === 'owner' || r !== 'owner').map((r) => (
                    <option key={r} value={r}>{roleLabel(r)}</option>
                  ))}
                </select>
              </div>
            </div>

            {formError && (
              <div className="rounded-lg border border-[var(--a-neg)]/40 bg-[var(--a-neg-soft)] px-3 py-2 text-[12.5px] text-[var(--a-neg)]">{formError}</div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[13px] font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                {addMode === 'invite' ? t('inviteButton') : t('createButton')}
              </button>
              <button type="button" onClick={resetForm} className="h-[34px] rounded-lg border border-[var(--a-border)] px-4 text-[13px] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)] transition-colors">
                {t('teamCancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--a-text-3)]" /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--a-border)]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--a-border)] bg-[var(--a-surface-2)]">
                <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--a-text-3)]">{t('member')}</th>
                <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--a-text-3)]">{t('memberRole')}</th>
                <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--a-text-3)]">{t('memberStatus')}</th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--a-border)] bg-[var(--a-surface)]">
              {members.map((m) => (
                <tr key={m.user.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--a-text)]">{m.user.name || m.user.email}</div>
                    {m.user.name && <div className="text-[11.5px] text-[var(--a-text-3)]">{m.user.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {canManage && m.user.id !== currentUserId ? (
                      <select
                        value={m.role}
                        onChange={(e) => void handleRoleChange(m, e.target.value as UserRole)}
                        className="h-[28px] rounded-[6px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[12.5px] text-[var(--a-text)]"
                      >
                        {roles.filter((r) => currentRole === 'owner' || r !== 'owner').map((r) => (
                          <option key={r} value={r}>{roleLabel(r)}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[var(--a-text-2)]">{roleLabel(m.role)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium ${m.user.email_verified ? 'text-[var(--a-pos)]' : 'text-[var(--a-warn)]'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${m.user.email_verified ? 'bg-[var(--a-pos)]' : 'bg-[var(--a-warn)]'}`} />
                      {m.user.email_verified ? t('verified') : t('unverified')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage && m.user.id !== currentUserId && (
                      <button
                        onClick={() => setRemoveTarget(m)}
                        className="rounded-[6px] p-1.5 text-[var(--a-text-3)] hover:bg-[var(--a-neg-soft)] hover:text-[var(--a-neg)] transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setRemoveTarget(null)}>
          <div className="w-[380px] rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-[var(--a-text)]">{t('removeMember')}</h3>
            <p className="mt-2 text-[13px] text-[var(--a-text-2)]">
              {t('removeMemberConfirm', { name: removeTarget.user.name || removeTarget.user.email })}
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button onClick={() => setRemoveTarget(null)} className="rounded-lg border border-[var(--a-border)] px-4 py-1.5 text-[13px] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]">
                {t('teamCancel')}
              </button>
              <button onClick={() => void handleRemove(removeTarget)} className="rounded-lg bg-[var(--danger)] px-4 py-1.5 text-[13px] font-medium text-white hover:opacity-90">
                {t('remove')}
              </button>
            </div>
          </div>
        </div>
      )}
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

function SettingsField({ label, children }: { label: string; children: ReactNode }) {
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
