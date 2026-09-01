'use client';

import { useCallback, useEffect, useState, useTransition, type ReactNode } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { localeCookieName, locales, type Locale } from '@/i18n/config';
import Link from 'next/link';
import { Settings, User, Building, CreditCard, Bell, Shield, Globe, Database, RotateCcw, Sparkles, Upload, Users, UserPlus, Trash2, Loader2, KeyRound, Pencil, Plug, Landmark } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { getErrorMessage } from '@/lib/api/client';
import { accountingApi, type AccountOption, type AccountingSettings, type OpeningBalanceImportStatus, type OpeningBalanceResetBackup, type SystemRoleMapping } from '@/lib/api/accounting.api';
import { SystemRolesPanel } from '@/components/accounting/SystemRolesPanel';
import { SupplyTypeSalesAccountsPanel } from '@/components/accounting/SupplyTypeSalesAccountsPanel';
import type { SupplyTypeSalesDefaults } from '@/lib/api/accounting.api';
import { ConfirmResetDialog } from '@/components/ui/ConfirmResetDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { bankingApi, type BankAccountRecord } from '@/lib/api/banking.api';
import { FutursoftTab } from './_tabs/FutursoftTab';
import { BankGatewaysTab } from './_tabs/BankGatewaysTab';
import { BillingTab } from './_tabs/BillingTab';
import AiInvoiceSettingsTab from '@/components/invoices/AiInvoiceSettingsTab';
import { tenantsApi, type TenantMember } from '@/lib/api/tenants.api';
import type { UserRole } from '@/lib/types/auth.types';
import { BusinessRegistryTab } from './_tabs/BusinessRegistryTab';

// All tab IDs that can appear in ?tab= (superset; permission-gated tabs render
// their own access notice). Kept in sync with the `tabs` array inside the page.
const KNOWN_TAB_IDS = [
  'company', 'profile', 'billing', 'notifications', 'security', 'localization',
  'business-registry', 'integrations', 'bank-connections', 'data-management', 'ai', 'team',
];

export default function SettingsPage() {
  const t = useTranslations('settings');
  // System-role labels live in the accounting namespace (shared with the
  // opening-balance import), not in settings.
  const tAccounting = useTranslations('accounting');
  const { user, tenant, role, setTenant } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;
  const [localizationLanguage, setLocalizationLanguage] = useState<Locale>(currentLocale);
  const [, startLocaleTransition] = useTransition();
  // The active tab is derived from the URL (?tab=…) so it's the single source of
  // truth: deep links, refresh, and the browser back button all keep the right
  // tab, and cross-page links like /settings?tab=data-management work even when
  // already on this page. Unknown values fall back to 'company' instead of
  // rendering an empty content card.
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab && KNOWN_TAB_IDS.includes(requestedTab) ? requestedTab : 'company';

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

  // Switch tabs by updating the URL, and clear any success/error banner so a
  // message raised on one tab never lingers on another.
  const changeTab = useCallback((tab: string) => {
    setSettingsError(null);
    setSettingsSuccess(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);
  const [companyName, setCompanyName] = useState(tenant?.name || '');
  const [isVatRegistered, setIsVatRegistered] = useState<boolean>(tenant?.is_vat_registered ?? true);
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    setCompanyName(tenant?.name || '');
    setIsVatRegistered(tenant?.is_vat_registered ?? true);
  }, [tenant?.name, tenant?.is_vat_registered]);
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
  const canManageRegistry = role === 'owner' || role === 'admin';
  const canManageFutursoft = role === 'owner' || role === 'admin';
  const canManageBilling = role === 'owner' || role === 'admin';
  const canManageData = role === 'owner' || role === 'admin';

  // Data Management tab state
  const [dataManagementLoading, setDataManagementLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<OpeningBalanceImportStatus | null>(null);
  const [resetBackups, setResetBackups] = useState<OpeningBalanceResetBackup[]>([]);
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
    { id: 'integrations', label: t('integrations'), icon: Plug, category: 'organization' },
    { id: 'bank-connections', label: t('bankConnections'), icon: Landmark, category: 'organization' },
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

  const handleSaveCompany = async () => {
    if (!tenant) return;
    setSavingCompany(true);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      const updated = await tenantsApi.updateTenant(tenant.id, {
        name: companyName.trim() || undefined,
        is_vat_registered: isVatRegistered,
      });
      setTenant(updated, role);
      setSettingsSuccess(t('companyInfoSaved'));
    } catch (error) {
      setSettingsError(getErrorMessage(error));
    } finally {
      setSavingCompany(false);
    }
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

  const handleSaveSalesDefaults = async (mapping: SupplyTypeSalesDefaults) => {
    setRolesSaving(true);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      const result = await accountingApi.updateSupplyTypeSalesDefaults(mapping);
      setAccountingSettings(result.settings);
      setSettingsSuccess(
        result.warnings?.length
          ? t('systemRolesSavedWithWarnings', { warnings: result.warnings.join('; ') })
          : t('salesDefaultsSaved')
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
                    onClick={() => changeTab(tab.id)}
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
            onChange={(e) => changeTab(e.target.value)}
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
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void handleSaveCompany(); }}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {t('companyName')}
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
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
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isVatRegistered}
                      onChange={(e) => setIsVatRegistered(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[var(--primary)]"
                    />
                    <span className="text-sm font-medium text-slate-700">{t('vatRegistered')}</span>
                  </label>
                  <p className="-mt-3 text-xs text-slate-500">{t('vatRegisteredHint')}</p>
                  <button
                    type="submit"
                    disabled={savingCompany}
                    className="inline-flex h-11 items-center gap-2 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
                  >
                    {savingCompany && <Loader2 className="h-4 w-4 animate-spin" />}
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

            {activeTab === 'billing' && <BillingTab canManage={canManageBilling} />}

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

            {activeTab === 'business-registry' && <BusinessRegistryTab canManage={canManageRegistry} />}

            {activeTab === 'integrations' && <FutursoftTab canManage={canManageFutursoft} />}

            {activeTab === 'bank-connections' && <BankGatewaysTab canManage={canManageFutursoft} />}

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
                          {importStatus.committed_batches.map((batch) => (
                            <div key={batch.id} className="flex items-center gap-3 text-sm text-slate-700 py-1">
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 capitalize">{batch.batch_type}</span>
                              <span>{batch.opening_date}</span>
                              <span className="text-slate-400">|</span>
                              <span className="text-xs text-slate-400">{new Date(batch.committed_at).toLocaleDateString()}</span>
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
                    roleLabel={(systemCode) => tAccounting(`role_${systemCode}`)}
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

                {canManageData && (
                  <SupplyTypeSalesAccountsPanel
                    accounts={roleAccounts}
                    settings={accountingSettings}
                    saving={rolesSaving}
                    onSave={handleSaveSalesDefaults}
                  />
                )}

                {resetBackups.length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-6">
                    <h3 className="text-base font-semibold text-slate-900">{t('resetHistory')}</h3>
                    <p className="mt-1 text-sm text-slate-500">{t('resetHistoryDescription')}</p>
                    <div className="mt-4 space-y-3">
                      {resetBackups.map((backup) => (
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
  const [editTarget, setEditTarget] = useState<TenantMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const canManage = currentRole === 'owner' || currentRole === 'admin';

  const load = useCallback(async () => {
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
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setFormEmail('');
    setFormName('');
    setFormPassword('');
    setFormRole('accountant');
    setFormError(null);
    setAddMode(null);
  };

  const openEdit = (m: TenantMember) => {
    setEditTarget(m);
    setEditName(m.user.name ?? '');
    setEditEmail(m.user.email);
    setEditPassword('');
    setEditError(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await tenantsApi.updateMemberProfile(tenantId, editTarget.user.id, {
        name: editName || undefined,
        email: editEmail !== editTarget.user.email ? editEmail : undefined,
        password: editPassword || undefined,
      });
      await load();
      setEditTarget(null);
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditSaving(false);
    }
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
                  <td className="px-4 py-3">
                    {canManage && m.user.id !== currentUserId && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(m)}
                          title={t('editMember')}
                          className="rounded-[6px] p-1.5 text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)] transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setRemoveTarget(m)}
                          title={t('removeMember')}
                          className="rounded-[6px] p-1.5 text-[var(--a-text-3)] hover:bg-[var(--a-neg-soft)] hover:text-[var(--a-neg)] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEditTarget(null)}>
          <div className="w-[420px] rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[var(--a-text)]">{t('editMember')}</h3>
              <button onClick={() => setEditTarget(null)} className="text-[var(--a-text-3)] hover:text-[var(--a-text)]">✕</button>
            </div>
            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--a-text-3)]">{t('memberName')}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-[13px] text-[var(--a-text)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--a-text-3)]">{t('email')}</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-[13px] text-[var(--a-text)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--a-text-3)]">{t('newPassword')}</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder={t('newPasswordHint')}
                  className="h-[34px] w-full rounded-[7px] border border-[var(--a-border)] bg-[var(--a-surface)] px-2.5 text-[13px] text-[var(--a-text)]"
                />
              </div>
              {editError && (
                <div className="rounded-lg border border-[var(--a-neg)]/40 bg-[var(--a-neg-soft)] px-3 py-2 text-[12.5px] text-[var(--a-neg)]">{editError}</div>
              )}
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setEditTarget(null)} className="rounded-lg border border-[var(--a-border)] px-4 py-1.5 text-[13px] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]">
                  {t('teamCancel')}
                </button>
                <button type="submit" disabled={editSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
                  {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                  {t('saveChanges')}
                </button>
              </div>
            </form>
          </div>
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


function SettingsField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700 mb-1.5">{label}</div>
      {children}
    </label>
  );
}
